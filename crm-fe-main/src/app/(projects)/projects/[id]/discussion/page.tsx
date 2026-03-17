"use client";

import { useParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { ProjectNotes } from "@/components/projects/project-notes";

export default function ProjectDiscussionPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="flex flex-col gap-4 p-6 mx-auto">
      <ProjectNotes projectId={id} />
    </div>
  );
}
