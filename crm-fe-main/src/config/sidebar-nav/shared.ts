import type { NavItem } from "./types";
import { salesItems } from "./sales";
import { financeItems } from "./finance";
import { hrItems } from "./hr";
import { deliveryItems } from "./projects";

export function getDepartmentNavItems(slug: string): NavItem[] {
  switch (slug) {
    case "finance":
      return financeItems;
    case "hr":
      return hrItems;
    case "project-management":
      return deliveryItems;
    default:
      return salesItems;
  }
}
