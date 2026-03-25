"use client";

import { formatRecruitmentDateTime, formatRelativeTime } from "@/lib/recruitment-format";
import type { StageHistoryEntry } from "@/types/recruitment";
import { PIPELINE_STAGES } from "@/types/recruitment";

function stageLabel(id: string | undefined) {
  if (!id) return "—";
  return PIPELINE_STAGES.find((s) => s.id === id)?.label || id;
}

export function StageHistoryTimeline({
  entries,
  userNameById,
}: {
  entries: StageHistoryEntry[] | null | undefined;
  userNameById: Record<string, string>;
}) {
  const list = Array.isArray(entries) ? [...entries] : [];
  list.sort((a, b) => {
    const ta = new Date(a.moved_at || 0).getTime();
    const tb = new Date(b.moved_at || 0).getTime();
    return ta - tb;
  });

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stage changes yet.</p>
    );
  }

  return (
    <ul className="space-y-4 border-l-2 border-muted pl-4 ml-1">
      {list.map((e, idx) => {
        const from = e.from_stage ?? e.stage;
        const to = e.to_stage;
        const actor =
          (e.moved_by && userNameById[e.moved_by]) || e.moved_by || "System";
        return (
          <li key={idx} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {stageLabel(from)}
                {to ? (
                  <>
                    {" "}
                    → {stageLabel(to)}
                  </>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {actor} · {formatRelativeTime(e.moved_at)}{" "}
                <span className="opacity-80">
                  ({formatRecruitmentDateTime(e.moved_at)})
                </span>
              </p>
              {e.notes ? (
                <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                  {e.notes}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
