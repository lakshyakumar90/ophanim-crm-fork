"use client";

import { useParams } from "next/navigation";
import { ProjectNotes } from "@/components/projects/project-notes";

export default function ProjectDiscussionPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="flex flex-col h-full min-h-0">
      <ProjectNotes projectId={id} fullHeight />
    </div>
  );
}
