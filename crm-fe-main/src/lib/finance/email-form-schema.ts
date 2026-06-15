import { z } from "zod";

export const EMAIL_TYPES = [
  "invoice",
  "payment_reminder",
  "receipt",
  "custom",
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

export const createEmailFormSchema = z.object({
  email_type: z.enum(EMAIL_TYPES),
  invoice_id: z.string(),
  lead_id: z.string(),
  recipient_name: z.string(),
  recipient_email: z.string(),
  subject: z.string(),
  body: z.string(),
});

export type CreateEmailFormValues = z.infer<typeof createEmailFormSchema>;

export const createEmailDefaultValues: CreateEmailFormValues = {
  email_type: "invoice",
  invoice_id: "",
  lead_id: "",
  recipient_name: "",
  recipient_email: "",
  subject: "",
  body: "",
};

export function validateEmailForm(values: CreateEmailFormValues) {
  if (!values.recipient_email || !values.subject || !values.body) {
    return "Please fill in required fields";
  }
  return null;
}
