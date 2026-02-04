// Placeholder for Supabase generated types
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "manager" | "employee";
          manager_id: string | null;
          team_id: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: "admin" | "manager" | "employee";
          manager_id?: string | null;
          team_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "admin" | "manager" | "employee";
          manager_id?: string | null;
          team_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          manager_id: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          manager_id?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          manager_id?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          lead_name: string;
          company_name: string | null;
          email: string | null;
          phone: string | null;
          alternate_phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          pincode: string | null;
          status: string;
          source: string | null;
          assigned_to: string | null;
          lead_value: number | null;
          industry: string | null;
          designation: string | null;
          website: string | null;
          description: string | null;
          tags: string[] | null;
          custom_fields: Json | null;
          created_by: string;
          last_contacted_at: string | null;
          next_follow_up_date: string | null;
          converted_at: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_name: string;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          alternate_phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          pincode?: string | null;
          status?: string;
          source?: string | null;
          assigned_to?: string | null;
          lead_value?: number | null;
          industry?: string | null;
          designation?: string | null;
          website?: string | null;
          description?: string | null;
          tags?: string[] | null;
          custom_fields?: Json | null;
          created_by: string;
          last_contacted_at?: string | null;
          next_follow_up_date?: string | null;
          converted_at?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_name?: string;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          alternate_phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          pincode?: string | null;
          status?: string;
          source?: string | null;
          assigned_to?: string | null;
          lead_value?: number | null;
          industry?: string | null;
          designation?: string | null;
          website?: string | null;
          description?: string | null;
          tags?: string[] | null;
          custom_fields?: Json | null;
          created_by?: string;
          last_contacted_at?: string | null;
          next_follow_up_date?: string | null;
          converted_at?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string;
          activity_type: string;
          title: string;
          description: string | null;
          duration: number | null;
          outcome: string | null;
          next_action: string | null;
          attachments: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id: string;
          activity_type: string;
          title: string;
          description?: string | null;
          duration?: number | null;
          outcome?: string | null;
          next_action?: string | null;
          attachments?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          user_id?: string;
          activity_type?: string;
          title?: string;
          description?: string | null;
          duration?: number | null;
          outcome?: string | null;
          next_action?: string | null;
          attachments?: Json | null;
          created_at?: string;
        };
      };
      lead_assignments_history: {
        Row: {
          id: string;
          lead_id: string;
          from_user_id: string | null;
          to_user_id: string;
          assigned_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          from_user_id?: string | null;
          to_user_id: string;
          assigned_by: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          from_user_id?: string | null;
          to_user_id?: string;
          assigned_by?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          task_type: "lead_related" | "general" | "project_related";
          related_lead_id: string | null;
          project_id: string | null;
          assigned_to: string;
          assigned_by: string;
          priority: "high" | "medium" | "low";
          status: "todo" | "in_progress" | "completed" | "cancelled";
          due_date: string | null;
          completed_at: string | null;
          tags: string[] | null;
          attachments: Json | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          task_type?: "lead_related" | "general" | "project_related";
          related_lead_id?: string | null;
          project_id?: string | null;
          assigned_to: string;
          assigned_by: string;
          priority?: "high" | "medium" | "low";
          status?: "todo" | "in_progress" | "completed" | "cancelled";
          due_date?: string | null;
          completed_at?: string | null;
          tags?: string[] | null;
          attachments?: Json | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          task_type?: "lead_related" | "general" | "project_related";
          related_lead_id?: string | null;
          project_id?: string | null;
          assigned_to?: string;
          assigned_by?: string;
          priority?: "high" | "medium" | "low";
          status?: "todo" | "in_progress" | "completed" | "cancelled";
          due_date?: string | null;
          completed_at?: string | null;
          tags?: string[] | null;
          attachments?: Json | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          comment_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          comment_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          comment_text?: string;
          created_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          clock_in_time: string | null;
          clock_out_time: string | null;
          total_hours: number | null;
          break_duration: number | null;
          status: string;
          location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          clock_in_time?: string | null;
          clock_out_time?: string | null;
          total_hours?: number | null;
          break_duration?: number | null;
          status?: string;
          location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          clock_in_time?: string | null;
          clock_out_time?: string | null;
          total_hours?: number | null;
          break_duration?: number | null;
          status?: string;
          location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance_rules: {
        Row: {
          id: string;
          work_start_time: string;
          work_end_time: string;
          late_threshold_minutes: number;
          half_day_hours: number;
          full_day_hours: number;
          weekly_off_days: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          work_start_time?: string;
          work_end_time?: string;
          late_threshold_minutes?: number;
          half_day_hours?: number;
          full_day_hours?: number;
          weekly_off_days?: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          work_start_time?: string;
          work_end_time?: string;
          late_threshold_minutes?: number;
          half_day_hours?: number;
          full_day_hours?: number;
          weekly_off_days?: number[];
          created_at?: string;
          updated_at?: string;
        };
      };
      holidays: {
        Row: {
          id: string;
          name: string;
          date: string;
          is_optional: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          is_optional?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          is_optional?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_entity_type: string | null;
          related_entity_id: string | null;
          is_read: boolean;
          action_url: string | null;
          priority: "high" | "medium" | "low";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          action_url?: string | null;
          priority?: "high" | "medium" | "low";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          action_url?: string | null;
          priority?: "high" | "medium" | "low";
          created_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          lead_assignment: boolean;
          task_assignment: boolean;
          status_updates: boolean;
          mentions: boolean;
          system_notifications: boolean;
          attendance_alerts: boolean;
          email_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lead_assignment?: boolean;
          task_assignment?: boolean;
          status_updates?: boolean;
          mentions?: boolean;
          system_notifications?: boolean;
          attendance_alerts?: boolean;
          email_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_assignment?: boolean;
          task_assignment?: boolean;
          status_updates?: boolean;
          mentions?: boolean;
          system_notifications?: boolean;
          attendance_alerts?: boolean;
          email_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
      };
      csv_import_jobs: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_path: string | null;
          total_rows: number;
          successful_rows: number;
          failed_rows: number;
          error_log: Json | null;
          status: "pending" | "processing" | "completed" | "failed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_path?: string | null;
          total_rows?: number;
          successful_rows?: number;
          failed_rows?: number;
          error_log?: Json | null;
          status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_path?: string | null;
          total_rows?: number;
          successful_rows?: number;
          failed_rows?: number;
          error_log?: Json | null;
          status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
        };
      };
      csv_export_jobs: {
        Row: {
          id: string;
          user_id: string;
          export_type: string;
          filters: Json | null;
          file_path: string | null;
          status: "pending" | "processing" | "completed" | "failed";
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          export_type: string;
          filters?: Json | null;
          file_path?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          export_type?: string;
          filters?: Json | null;
          file_path?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          expires_at?: string | null;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          category: string;
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          key: string;
          value: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body: string;
          variables: string[] | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          body: string;
          variables?: string[] | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          body?: string;
          variables?: string[] | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filter_type: string;
          filter_config: Json;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filter_type: string;
          filter_config: Json;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filter_type?: string;
          filter_config?: Json;
          is_default?: boolean;
          created_at?: string;
        };
      };
      refresh_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          is_revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          is_revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          is_revoked?: boolean;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          client_name: string | null;
          lead_id: string | null;
          manager_id: string;
          status:
            | "planned"
            | "in_progress"
            | "on_hold"
            | "completed"
            | "cancelled";
          priority: "low" | "medium" | "high";
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          client_name?: string | null;
          lead_id?: string | null;
          manager_id: string;
          status?:
            | "planned"
            | "in_progress"
            | "on_hold"
            | "completed"
            | "cancelled";
          priority?: "low" | "medium" | "high";
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          client_name?: string | null;
          lead_id?: string | null;
          manager_id?: string;
          status?:
            | "planned"
            | "in_progress"
            | "on_hold"
            | "completed"
            | "cancelled";
          priority?: "low" | "medium" | "high";
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          allocation_percentage: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: string;
          allocation_percentage?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: string;
          allocation_percentage?: number;
          joined_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "admin" | "manager" | "employee";
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "negotiation"
        | "won"
        | "lost"
        | "on_hold"
        | "unqualified";
      lead_source:
        | "website"
        | "referral"
        | "cold_call"
        | "email_campaign"
        | "social_media"
        | "trade_show"
        | "advertisement"
        | "partner"
        | "organic_search"
        | "paid_search"
        | "direct"
        | "other";
      task_priority: "high" | "medium" | "low";
      task_status: "todo" | "in_progress" | "completed" | "cancelled";
      attendance_status:
        | "present"
        | "late"
        | "half_day"
        | "absent"
        | "leave"
        | "holiday";
      project_status:
        | "planned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled";
      project_priority: "low" | "medium" | "high";
    };
    CompositeTypes: Record<string, never>;
  };
}
