"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export function CreateJobPostingPanel({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
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
      application_deadline: "",
      status: "open",
    },
  });

  const skills = form.watch("skills");

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
      await createJobPostingAction(payload);
      toast.success("Job posting created");
      form.reset();
      setSkillInput("");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      /* toast in action */
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto px-6">
        <SheetHeader className="mb-6">
          <SheetTitle>Create job posting</SheetTitle>
          <SheetDescription>
            Publish a new role and start managing candidates.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
            {/* Role info */}
            <div className="space-y-4 pb-4 border-b">
              <div>
                <h3 className="font-semibold text-sm mb-3">Role info</h3>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Senior Engineer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
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
                                <SelectValue placeholder="Select" />
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
                          <FormLabel>Positions *</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 pb-4 border-b">
              <div>
                <h3 className="font-semibold text-sm mb-3">Details</h3>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Role overview, responsibilities…"
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
                        placeholder="Add a skill"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={addSkill}>
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
                </div>
              </div>
            </div>

            {/* Compensation & Timeline */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-3">Compensation & Timeline</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="salary_range_min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary min</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              {...field}
                              value={field.value || ""}
                            />
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
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="application_deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadline</FormLabel>
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
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="gap-2"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Create posting
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
