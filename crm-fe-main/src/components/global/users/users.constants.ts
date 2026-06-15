export const JOB_TITLES = [
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "seo_specialist", label: "SEO Specialist" },
  { value: "content_writer", label: "Content Writer" },
  { value: "sales_employee", label: "Sales Employee" },
  { value: "finance_employee", label: "Finance Employee" },
  { value: "hr_employee", label: "HR Employee" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "hr_director", label: "HR Director" },
];

export function formatJobTitle(jobTitle: string | null | undefined): string {
  if (!jobTitle) return "-";
  return jobTitle.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
