import type React from "react";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: ("admin" | "manager" | "employee")[];
  anyPermission?: string[];
  showBadge?: boolean;
  showReminderBadge?: boolean;
  showMyReviewBadge?: boolean;
  showPeerFeedbackBadge?: boolean;
}
