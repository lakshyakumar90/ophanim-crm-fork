"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createJobPostingAction } from "@/hooks/useRecruitment";
import { usePermission } from "@/hooks/use-permission";
import { isFutureDate } from "@/lib/recruitment-format";

const formSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    department: z.string().optional(),
    positions_open: z.coerce.number().int().min(1, "At least one position"),
    description: z.string().optional(),
    skills: z.array(z.string()).default([]),
    salary_range_min: z.string().optional(),
    salary_range_max: z.string().optional(),
    application_deadline: z.string().optional(),
    status: z.enum(["open", "paused", "closed"]),
  })
  .superRefine((data, ctx) => {
    const min =
      data.salary_range_min?.trim() !== ""
        ? parseFloat(data.salary_range_min || "")
        : undefined;
    const max =
      data.salary_range_max?.trim() !== ""
        ? parseFloat(data.salary_range_max || "")
        : undefined;
    if (
      min != null &&
      max != null &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min >= max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Salary min must be less than max",
        path: ["salary_range_max"],
      });
    }
    if (data.application_deadline && !isFutureDate(data.application_deadline)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deadline must be a future date",
        path: ["application_deadline"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function NewJobPostingPage() {
  const router = useRouter();
  const canManage = usePermission("recruitment:manage");
  const [skillInput, setSkillInput] = useState("");
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      title: "",
      department: "",
      positions_open: 1,
      description: "",
      skills: [],
      salary_range_min: "",
      salary_range_max: "",
      status: "open",
    },
  });

  const skills = form.watch("skills");

  useEffect(() => {
    if (!canManage) {
      toast.error("You don't have permission to create job postings.");
      router.replace("/hr/recruitment");
    }
  }, [canManage, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/departments");
        const rows = res.data?.data || [];
        setDepartments(Array.isArray(rows) ? rows : []);
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    const cur = form.getValues("skills") || [];
    if (cur.includes(s)) {
      setSkillInput("");
      return;
    }
    form.setValue("skills", [...cur, s]);
    setSkillInput("");
  };

  const removeSkill = (s: string) => {
    form.setValue(
      "skills",
      (form.getValues("skills") || []).filter((x) => x !== s),
    );
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const payload: Record<string, unknown> = {
        title: data.title.trim(),
        department: data.department?.trim() || undefined,
        positions_open: data.positions_open,
        description: data.description?.trim() || undefined,
        required_skills: data.skills?.length ? data.skills : undefined,
        status: data.status,
      };
      const smin = data.salary_range_min?.trim()
        ? parseFloat(data.salary_range_min)
        : undefined;
      const smax = data.salary_range_max?.trim()
        ? parseFloat(data.salary_range_max)
        : undefined;
      if (smin != null && Number.isFinite(smin)) payload.salary_range_min = smin;
      if (smax != null && Number.isFinite(smax)) payload.salary_range_max = smax;
      if (data.application_deadline) {
        payload.application_deadline = new Date(
          data.application_deadline,
        ).toISOString();
      }
      const row = await createJobPostingAction(payload);
      toast.success("Job posting created");
      router.push(`/hr/recruitment/${row.id}`);
    } catch {
      /* toast in action */
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-3xl mx-auto w-full pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/hr/recruitment")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New job posting</h1>
          <p className="text-muted-foreground mt-1">
            Publish a role and manage candidates on the pipeline board.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role info</CardTitle>
              <CardDescription>Title, department, and headcount.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      value={field.value || "_none"}
                      onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="positions_open"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Positions open *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Description and required skills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={8}
                        placeholder="Role overview, responsibilities, requirements…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Skills</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill, press Enter"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addSkill}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {skills?.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1 pr-1">
                      {s}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() => removeSkill(s)}
                        aria-label={`Remove ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compensation & timeline</CardTitle>
              <CardDescription>Salary range and application deadline.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="salary_range_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary min</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary_range_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary max</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="application_deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/hr/recruitment")}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !canManage} className="gap-2">
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Create posting
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
