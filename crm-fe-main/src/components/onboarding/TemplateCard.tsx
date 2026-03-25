"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { templateTaskCount } from "@/lib/onboarding-utils";
import type { OnboardingTemplate } from "@/types/onboarding";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TemplateCardProps {
  template: OnboardingTemplate;
  canManage: boolean;
  onEdit: (t: OnboardingTemplate) => void;
  onUseTemplate: (t: OnboardingTemplate) => void;
}

export function TemplateCard({ template, canManage, onEdit, onUseTemplate }: TemplateCardProps) {
  const [open, setOpen] = useState(false);
  const count = templateTaskCount(template);
  const tasks = Array.isArray(template.tasks) ? template.tasks : [];

  return (
    <div className="border bg-card rounded-xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant="outline"
          className={
            template.type === "onboarding"
              ? "text-blue-700 border-blue-200 bg-blue-50"
              : "text-orange-700 border-orange-200 bg-orange-50"
          }
        >
          {template.type}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {count} tasks
        </Badge>
      </div>
      <div>
        <h4 className="text-lg font-semibold tracking-tight">{template.name}</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {template.department ? template.department : "All departments"}
        </p>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between px-0 h-8">
            Preview tasks
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="text-xs space-y-1 mt-2 border rounded-md p-2 bg-muted/30 max-h-40 overflow-y-auto">
            {tasks.map((t: { task_name?: string }, i: number) => (
              <li key={i}>{t.task_name || `Task ${i + 1}`}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      <div className="flex flex-wrap gap-2 mt-auto pt-2">
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => onEdit(template)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        <Button variant="default" size="sm" onClick={() => onUseTemplate(template)}>
          Use template
        </Button>
      </div>
    </div>
  );
}
