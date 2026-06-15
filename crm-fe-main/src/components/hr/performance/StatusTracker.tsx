"use client";

import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/performance";
import { Check } from "lucide-react";

function peerStepDone(
  status: ReviewStatus,
  peerFeedback?: Array<{ response_count?: number }> | null,
): boolean {
  const hasPeer =
    (peerFeedback || []).some((p) => (p.response_count ?? 0) > 0) ?? false;
  if (hasPeer) return true;
  return ["manager_submitted", "calibrated", "director_approved", "released"].includes(status);
}

const STEPS: {
  label: string;
  done: (status: ReviewStatus, hasGoals: boolean, peerOk: boolean) => boolean;
}[] = [
  { label: "Goals set", done: (_s, g) => g },
  { label: "Self-assessment", done: (s) => s !== "draft" },
  {
    label: "Peer feedback",
    done: (_s, _g, peerOk) => peerOk,
  },
  {
    label: "Manager review",
    done: (s) => ["manager_submitted", "calibrated", "director_approved", "released"].includes(s),
  },
  {
    label: "Calibration",
    done: (s) => ["calibrated", "director_approved", "released"].includes(s),
  },
  {
    label: "Final approval",
    done: (s) => ["director_approved", "released"].includes(s),
  },
  { label: "Results", done: (s) => s === "released" },
];

export function StatusTracker({
  status,
  hasGoals,
  peerFeedback,
}: {
  status: ReviewStatus;
  hasGoals: boolean;
  peerFeedback?: Array<{ response_count?: number }> | null;
}) {
  const peerOk = peerStepDone(status, peerFeedback);

  const doneFlags = STEPS.map((step) => step.done(status, hasGoals, peerOk));

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div
        className="grid min-w-140"
        style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(88px, 1fr))` }}
      >
        {STEPS.map((step, i) => {
          const done = doneFlags[i]!;
          const prevDone = i === 0 ? true : doneFlags[i - 1]!;
          const current = !done && prevDone;

          return (
            <div key={step.label} className="relative px-0.5">
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "absolute left-1/2 right-0 top-4.5 h-0.5",
                    done ? "bg-emerald-500" : "bg-muted",
                  )}
                />
              ) : null}

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors shrink-0 bg-background",
                    done && "bg-emerald-600 border-emerald-600 text-white",
                    current && "border-blue-500 text-blue-600 ring-2 ring-blue-100 animate-pulse",
                    !done && !current && "border-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className="mt-1 block text-center text-[10px] leading-tight text-muted-foreground sm:text-xs">
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
