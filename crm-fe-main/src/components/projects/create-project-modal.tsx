"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { projectsApi } from "@/lib/projects-api";
import { usersApi, leadsApi } from "@/lib/api";
import { toast } from "sonner";

// Schema matching backend but handling Frontend types (Date objects)
const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  clientName: z.string().optional(),
  leadId: z.string().optional(),
  managerId: z.string().min(1, "Project Manager is required"),
  priority: z.enum(["low", "medium", "high"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  // Team members are optional arrays of user IDs
  developers: z.array(z.string()).optional(),
  seoSpecialists: z.array(z.string()).optional(),
  contentWriters: z.array(z.string()).optional(),
  designers: z.array(z.string()).optional(),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle?: string | null;
  role?: string;
}

interface CreateProjectModalProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
}

function MultiSelectField({
  label,
  description,
  options,
  selectedIds,
  onChange,
  placeholder,
}: {
  label: string;
  description?: string;
  options: TeamMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((i) => i !== id));
  };

  const selectedMembers = options.filter((o) => selectedIds.includes(o.id));

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      {description && <FormDescription>{description}</FormDescription>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
          >
            {selectedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedMembers.map((member) => (
                  <Badge
                    key={member.id}
                    variant="secondary"
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(member.id);
                    }}
                  >
                    {member.fullName}
                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.fullName}
                    onSelect={() => handleSelect(option.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(option.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FormItem>
  );
}

export function CreateProjectModal({
  children,
  onSuccess,
}: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectManagers, setProjectManagers] = useState<TeamMember[]>([]);
  const [developers, setDevelopers] = useState<TeamMember[]>([]);
  const [seoSpecialists, setSeoSpecialists] = useState<TeamMember[]>([]);
  const [contentWriters, setContentWriters] = useState<TeamMember[]>([]);
  const [designers, setDesigners] = useState<TeamMember[]>([]);
  const [wonLeads, setWonLeads] = useState<
    { id: string; leadName: string; businessName: string | null }[]
  >([]);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientName: "",
      leadId: undefined,
      priority: "medium",
      developers: [],
      seoSpecialists: [],
      contentWriters: [],
      designers: [],
    },
  });

  useEffect(() => {
    if (open) {
      // Fetch project managers
      usersApi
        .getProjectManagers()
        .then((res) => {
          setProjectManagers(res || []);
        })
        .catch(console.error);

      // Fetch team members by job title
      usersApi
        .getByJobTitle(["developer"])
        .then((res) => {
          setDevelopers(res || []);
        })
        .catch(console.error);

      usersApi
        .getByJobTitle(["seo_specialist"])
        .then((res) => {
          setSeoSpecialists(res || []);
        })
        .catch(console.error);

      usersApi
        .getByJobTitle(["content_writer"])
        .then((res) => {
          setContentWriters(res || []);
        })
        .catch(console.error);

      usersApi
        .getByJobTitle(["designer"])
        .then((res) => {
          setDesigners(res || []);
        })
        .catch(console.error);

      // Fetch won leads (customers) for project linking
      leadsApi
        .getWonLeads()
        .then((res) => {
          setWonLeads(res || []);
        })
        .catch(console.error);
    }
  }, [open]);

  const onSubmit = async (data: CreateProjectFormValues) => {
    setLoading(true);
    try {
      // Collect all selected team members with their roles
      const teamMembers: { userId: string; role: string }[] = [];

      data.developers?.forEach((id) => {
        teamMembers.push({ userId: id, role: "Developer" });
      });
      data.seoSpecialists?.forEach((id) => {
        teamMembers.push({ userId: id, role: "SEO Specialist" });
      });
      data.contentWriters?.forEach((id) => {
        teamMembers.push({ userId: id, role: "Content Writer" });
      });
      data.designers?.forEach((id) => {
        teamMembers.push({ userId: id, role: "Designer" });
      });

      // Create project with team members
      // Convert 'none' leadId back to undefined
      const leadId = data.leadId === "none" ? undefined : data.leadId;
      await projectsApi.create({
        ...data,
        leadId,
        teamMembers,
      });

      toast.success("Project created successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to create project", {
        description:
          error.response?.data?.error?.message ||
          "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project and assign team members. Team assignments are
            optional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Website Redesign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Client Co." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer (Won Lead)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Link to a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {wonLeads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            <div className="flex items-center gap-2">
                              <span>{lead.leadName}</span>
                              {lead.businessName && (
                                <span className="text-xs text-muted-foreground">
                                  ({lead.businessName})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project Manager <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectManagers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.fullName}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              ({user.role})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief project details..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Members Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">
                Team Members (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="developers"
                  render={({ field }) => (
                    <MultiSelectField
                      label="Developers"
                      options={developers}
                      selectedIds={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select developers..."
                    />
                  )}
                />

                <FormField
                  control={form.control}
                  name="seoSpecialists"
                  render={({ field }) => (
                    <MultiSelectField
                      label="SEO Specialists"
                      options={seoSpecialists}
                      selectedIds={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select SEO specialists..."
                    />
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentWriters"
                  render={({ field }) => (
                    <MultiSelectField
                      label="Content Writers"
                      options={contentWriters}
                      selectedIds={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select content writers..."
                    />
                  )}
                />

                <FormField
                  control={form.control}
                  name="designers"
                  render={({ field }) => (
                    <MultiSelectField
                      label="Designers"
                      options={designers}
                      selectedIds={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select designers..."
                    />
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
