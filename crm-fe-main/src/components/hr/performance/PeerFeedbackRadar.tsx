"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { PerformanceReviewRow } from "@/types/performance";

const DIM_LABELS: Record<string, string> = {
  collaboration: "Collaboration",
  communication: "Communication",
  delivery: "Delivery",
  reliability: "Reliability",
};

export function PeerFeedbackRadar({
  peerFeedback,
}: {
  peerFeedback: PerformanceReviewRow["peer_feedback"];
}) {
  const list = peerFeedback || [];
  if (!list.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No aggregated peer feedback yet. Once peers respond, this section shows only dimension-wise averages and counts.
      </p>
    );
  }

  const data = list.map((p) => ({
    dimension: DIM_LABELS[p.dimension] || p.dimension,
    score: p.aggregated_score ?? 0,
    fullMark: 5,
  }));

  const totalResponses = list.reduce((s, p) => s + (p.response_count ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Individual peer submissions are confidential. You see only aggregated averages by dimension.
        {totalResponses > 0 ? ` (${totalResponses} raw scores across dimensions)` : null}
      </p>
      <div className="h-70 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {list.map((p) => (
          <div key={p.dimension} className="flex justify-between rounded border px-2 py-1">
            <span>{DIM_LABELS[p.dimension] || p.dimension}</span>
            <span className="font-medium">
              {p.aggregated_score ?? "—"}
              {p.response_count != null ? (
                <span className="text-muted-foreground ml-1">({p.response_count})</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
