import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { createProject } from "../../projects/projects/projects.service.js";
import { createInvoice, type CreateInvoiceInput } from "../../finance/services/invoice.service.js";
import { logActivity } from "../../shared/activity-events.service.js";
import type { AuthUser } from "../../../types/api.types.js";

export interface ConvertLeadInput {
  createInvoice?: boolean;
  invoice?: Partial<CreateInvoiceInput>;
  createProject?: boolean;
  project?: {
    name?: string;
    description?: string | null;
    managerId?: string;
    clientName?: string | null;
    priority?: "low" | "medium" | "high";
    startDate?: string | null;
    endDate?: string | null;
    teamMembers?: { userId: string; role: string }[];
  };
  notifyFinance?: boolean;
  notifyPM?: boolean;
}

export interface ConversionStatus {
  leadId: string;
  leadStatus: string;
  project: { id: string; name: string } | null;
  invoice: { id: string; clientName: string; totalAmount: number; status: string } | null;
}

async function getLeadOrThrow(leadId: string) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select(
      "id, lead_name, business_name, email, phone, status, lead_value, assigned_to",
    )
    .eq("id", leadId)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Lead");
  }
  return data;
}

export async function getLeadConversionStatus(leadId: string): Promise<ConversionStatus> {
  const lead = await getLeadOrThrow(leadId);

  const [{ data: project }, { data: invoice }] = await Promise.all([
    supabaseAdmin
      .from("projects")
      .select("id, name")
      .eq("lead_id", leadId)
      .maybeSingle(),
    supabaseAdmin
      .from("invoices")
      .select("id, client_name, total_amount, status")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    leadId,
    leadStatus: lead.status,
    project: project ? { id: project.id, name: project.name } : null,
    invoice: invoice
      ? {
          id: invoice.id,
          clientName: invoice.client_name,
          totalAmount: Number(invoice.total_amount || 0),
          status: invoice.status,
        }
      : null,
  };
}

async function notifyUsers(
  userIds: string[],
  title: string,
  message: string,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;

  await supabaseAdmin.from("notifications").insert(
    unique.map((user_id) => ({
      user_id,
      title,
      message,
      type: "system",
      priority: "normal",
    })),
  );
}

export async function convertLead(
  leadId: string,
  input: ConvertLeadInput,
  user: AuthUser,
) {
  const lead = await getLeadOrThrow(leadId);

  if (lead.status !== "won") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only won leads can be converted",
    );
  }

  if (!input.createInvoice && !input.createProject) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "At least one of createInvoice or createProject must be true",
    );
  }

  const existing = await getLeadConversionStatus(leadId);
  const result: {
    leadId: string;
    invoiceId?: string;
    projectId?: string;
    alreadyLinked: { invoice?: boolean; project?: boolean };
  } = {
    leadId,
    alreadyLinked: {},
  };

  if (input.createProject) {
    if (existing.project) {
      result.projectId = existing.project.id;
      result.alreadyLinked.project = true;
    } else {
      const project = await createProject(
        {
          name:
            input.project?.name ||
            lead.business_name ||
            lead.lead_name ||
            "New Project",
          description: input.project?.description ?? null,
          clientName:
            input.project?.clientName ?? lead.business_name ?? lead.lead_name,
          leadId,
          managerId: input.project?.managerId || user.id,
          priority: input.project?.priority,
          startDate: input.project?.startDate,
          endDate: input.project?.endDate,
          teamMembers: input.project?.teamMembers,
        },
        user.role,
        user.id,
      );
      result.projectId = project.id;
    }
  }

  if (input.createInvoice) {
    if (existing.invoice) {
      result.invoiceId = existing.invoice.id;
      result.alreadyLinked.invoice = true;
    } else {
      const dueDate =
        input.invoice?.due_date ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]!;

      const lineItems = input.invoice?.line_items?.length
        ? input.invoice.line_items
        : [
            {
              description: `Services for ${lead.business_name || lead.lead_name}`,
              quantity: 1,
              unit_price: Number(lead.lead_value || 0),
              total: Number(lead.lead_value || 0),
            },
          ];

      const invoice = await createInvoice(
        {
          lead_id: leadId,
          client_name:
            input.invoice?.client_name ||
            lead.business_name ||
            lead.lead_name,
          client_email: input.invoice?.client_email || lead.email || "client@example.com",
          client_phone: input.invoice?.client_phone || lead.phone || undefined,
          due_date: dueDate,
          currency: input.invoice?.currency || "INR",
          status: input.invoice?.status || "draft",
          line_items: lineItems,
          notes: input.invoice?.notes,
          department_id: input.invoice?.department_id,
        },
        user.id,
      );
      result.invoiceId = invoice.id;
    }
  }

  await logActivity({
    actorId: user.id,
    entityType: "lead",
    entityId: leadId,
    entityName: lead.lead_name,
    eventType: "converted",
    source: "lead",
    metadata: {
      projectId: result.projectId,
      invoiceId: result.invoiceId,
    },
  });

  const notifyIds: string[] = [];
  if (input.notifyPM && input.project?.managerId) {
    notifyIds.push(input.project.managerId);
  }
  if (input.notifyFinance) {
    const { data: financeUsers } = await supabaseAdmin
      .from("user_resolved_permissions" as any)
      .select("user_id, permissions")
      .limit(200);
    (financeUsers || []).forEach((row: any) => {
      const perms: string[] = row.permissions || [];
      if (
        perms.includes("finance:manage") ||
        perms.includes("invoices:manage")
      ) {
        notifyIds.push(row.user_id);
      }
    });
  }

  if (notifyIds.length) {
    await notifyUsers(
      notifyIds,
      "Lead converted",
      `${lead.lead_name} was converted to ${result.projectId ? "a project" : ""}${result.projectId && result.invoiceId ? " and " : ""}${result.invoiceId ? "an invoice" : ""}.`,
    );
  }

  return result;
}
