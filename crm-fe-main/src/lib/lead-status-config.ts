// Re-export from central config for backwards compatibility
// This file is kept for backwards compatibility with existing imports
// New code should import directly from @/config/constants

export {
  LEAD_STATUS_CONFIG,
  getStatusColor,
  getStatusLabel,
  getAllStatuses,
  type StatusConfig,
} from "@/config/constants";
