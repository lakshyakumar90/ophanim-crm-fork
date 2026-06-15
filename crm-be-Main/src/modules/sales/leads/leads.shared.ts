import { USER_ROLES } from "../../../config/constants.js";
import {
  invalidateCachePattern,
  buildCacheKey,
  CACHE_KEYS,
} from "../../shared/cache.service.js";
import type { AuthUser } from "../../../types/api.types.js";

export interface LeadRecord {
  id: string;
  leadName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
  source: string | null;
  leadValue: number | null;
  industry: string | null;
  designation: string | null;
  description: string | null;
  tags: string | null;
  assignedTo: string | null;
  website: string | null;
  country: string | null;
  timezone: string | null;
  nalReason: string | null;
  clientResponse: string | null;
  leadType: string | null;
  createdBy: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface AssignableUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
}

export interface LeadRow {
  id: string;
  lead_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
  source: string | null;
  lead_value: number | null;
  industry: string | null;
  designation: string | null;
  description: string | null;
  tags: string | null;
  assigned_to: string | null;
  website: string | null;
  country: string | null;
  timezone: string | null;
  nal_reason: string | null;
  client_response: string | null;
  lead_type: string | null;
  created_by: string;
  converted_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface AssignableUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
}

export const LEAD_DETAIL_SELECT = `
  id,
  lead_name,
  business_name,
  email,
  phone,
  alternate_phone,
  address,
  city,
  state,
  pincode,
  status,
  source,
  lead_value,
  industry,
  designation,
  description,
  tags,
  assigned_to,
  website,
  country,
  timezone,
  nal_reason,
  client_response,
  lead_type,
  created_by,
  converted_at,
  created_at,
  updated_at,
  assignee:users!assigned_to(id, full_name, avatar_url)
`;

export const LEAD_ACTIVITY_SELECT = `
  id,
  lead_id,
  user_id,
  activity_type,
  title,
  description,
  metadata,
  created_at,
  user:users(id, full_name, email, avatar_url)
`;

export const LEAD_COMMENT_SELECT = `
  id,
  entity_type,
  entity_id,
  user_id,
  content,
  created_at,
  updated_at,
  is_deleted,
  users:user_id (id, full_name, email, avatar_url)
`;

export const LEAD_REMINDER_SELECT =
  "id, lead_id, user_id, reminder_at, note, is_sent, is_done, created_at";

export function getLeadDetailPageCacheKey(leadId: string, authUser: AuthUser): string {
  const scope = authUser.role === USER_ROLES.ADMIN ? "admin" : `user:${authUser.id}`;
  return buildCacheKey(CACHE_KEYS.LEAD_DETAIL_PAGE, leadId, scope);
}

export async function invalidateLeadDetailPageCache(leadId: string): Promise<void> {
  await invalidateCachePattern(buildCacheKey(CACHE_KEYS.LEAD_DETAIL_PAGE, leadId, "*"));
}

export function mapLeadRowToRecord(data: LeadRow): LeadRecord {
  return {
    id: data.id,
    leadName: data.lead_name,
    businessName: data.business_name,
    email: data.email,
    phone: data.phone,
    alternatePhone: data.alternate_phone,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    status: data.status,
    source: data.source,
    leadValue: data.lead_value,
    industry: data.industry,
    designation: data.designation,
    description: data.description,
    tags: data.tags,
    assignedTo: data.assigned_to,
    website: data.website,
    country: data.country,
    timezone: data.timezone,
    nalReason: data.nal_reason,
    clientResponse: data.client_response,
    leadType: data.lead_type,
    createdBy: data.created_by,
    convertedAt: data.converted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    assignee: data.assignee
      ? {
          id: data.assignee.id,
          fullName: data.assignee.full_name,
          avatarUrl: data.assignee.avatar_url,
        }
      : undefined,
  };
}
