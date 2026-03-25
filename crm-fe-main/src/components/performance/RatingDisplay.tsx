"use client";

import { ratingLabel } from "@/lib/performanceHelpers";

export function RatingDisplay({
  rating,
  size = "md",
}: {
  rating: string | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  const text = ratingLabel(rating);
  const cls =
    size === "lg"
      ? "text-lg font-semibold"
      : size === "sm"
        ? "text-sm"
        : "text-base font-medium";
  return (
    <span className={cls}>
      <span className="capitalize text-primary">{rating.replace(/_/g, " ")}</span>
      <span className="text-muted-foreground font-normal text-sm ml-2">({text})</span>
    </span>
  );
}
