export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          attendance_status: string
          auto_logged_out: boolean | null
          auto_logout_time: string | null
          break_duration: number | null
          clock_in_time: string | null
          clock_out_time: string | null
          created_at: string | null
          date: string
          id: string
          location: string | null
          logout_time: string | null
          logout_type: string | null
          notes: string | null
          restored_at: string | null
          restored_by_admin_id: string | null
          session_status: string | null
          shift_end_time: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          total_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_date: string
          attendance_status: string
          auto_logged_out?: boolean | null
          auto_logout_time?: string | null
          break_duration?: number | null
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          date: string
          id?: string
          location?: string | null
          logout_time?: string | null
          logout_type?: string | null
          notes?: string | null
          restored_at?: string | null
          restored_by_admin_id?: string | null
          session_status?: string | null
          shift_end_time?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          total_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_date?: string
          attendance_status?: string
          auto_logged_out?: boolean | null
          auto_logout_time?: string | null
          break_duration?: number | null
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          location?: string | null
          logout_time?: string | null
          logout_type?: string | null
          notes?: string | null
          restored_at?: string | null
          restored_by_admin_id?: string | null
          session_status?: string | null
          shift_end_time?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_restored_by_admin_id_fkey"
            columns: ["restored_by_admin_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_restored_by_admin_id_fkey"
            columns: ["restored_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_rules: {
        Row: {
          auto_logout_time: string | null
          created_at: string | null
          full_day_hours: number | null
          half_day_hours: number | null
          id: string
          late_threshold_minutes: number | null
          shift_type: string | null
          updated_at: string | null
          weekly_off_days: number[] | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          auto_logout_time?: string | null
          created_at?: string | null
          full_day_hours?: number | null
          half_day_hours?: number | null
          id?: string
          late_threshold_minutes?: number | null
          shift_type?: string | null
          updated_at?: string | null
          weekly_off_days?: number[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          auto_logout_time?: string | null
          created_at?: string | null
          full_day_hours?: number | null
          half_day_hours?: number | null
          id?: string
          late_threshold_minutes?: number | null
          shift_type?: string | null
          updated_at?: string | null
          weekly_off_days?: number[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_deleted: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_deleted?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_deleted?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          created_at: string
          id: string
          shift_duration_hours: number
          timezone: string
          updated_at: string
          week_off_days: number[]
        }
        Insert: {
          created_at?: string
          id?: string
          shift_duration_hours?: number
          timezone?: string
          updated_at?: string
          week_off_days?: number[]
        }
        Update: {
          created_at?: string
          id?: string
          shift_duration_hours?: number
          timezone?: string
          updated_at?: string
          week_off_days?: number[]
        }
        Relationships: []
      }
      cron_job_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: number
          job_name: string
          processed_count: number | null
          started_at: string
          success: boolean | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          job_name: string
          processed_count?: number | null
          started_at?: string
          success?: boolean | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          job_name?: string
          processed_count?: number | null
          started_at?: string
          success?: boolean | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          body: string
          created_at: string | null
          email_type: Database["public"]["Enums"]["finance_email_type"]
          error_message: string | null
          id: string
          invoice_id: string | null
          lead_id: string | null
          recipient_email: string
          recipient_name: string | null
          rejection_reason: string | null
          scheduled_at: string | null
          sender_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_request_status"] | null
          subject: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          body: string
          created_at?: string | null
          email_type?: Database["public"]["Enums"]["finance_email_type"]
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          sender_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_request_status"] | null
          subject: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          body?: string
          created_at?: string | null
          email_type?: Database["public"]["Enums"]["finance_email_type"]
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_request_status"] | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          error_message: string | null
          id: string
          lead_id: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string
          id: string
          name: string
          subject: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          subject: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_compensation_history: {
        Row: {
          approved_by: string | null
          change_percentage: number | null
          created_at: string | null
          effective_date: string
          employee_id: string
          id: string
          new_ctc: number
          previous_ctc: number | null
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          change_percentage?: number | null
          created_at?: string | null
          effective_date: string
          employee_id: string
          id?: string
          new_ctc: number
          previous_ctc?: number | null
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          change_percentage?: number | null
          created_at?: string | null
          effective_date?: string
          employee_id?: string
          id?: string
          new_ctc?: number
          previous_ctc?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_compensation_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_details: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          blood_group: string | null
          city: string | null
          country: string | null
          created_at: string | null
          current_address: string | null
          date_of_birth: string | null
          date_of_joining: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_code: string | null
          employment_type: string | null
          exit_reason: string | null
          gender: string | null
          id: string
          ifsc_code: string | null
          last_working_date: string | null
          notice_period_days: number | null
          pan_number: string | null
          permanent_address: string | null
          postal_code: string | null
          probation_end_date: string | null
          reporting_manager_id: string | null
          resignation_date: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_name?: string | null
          blood_group?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_code?: string | null
          employment_type?: string | null
          exit_reason?: string | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          last_working_date?: string | null
          notice_period_days?: number | null
          pan_number?: string | null
          permanent_address?: string | null
          postal_code?: string | null
          probation_end_date?: string | null
          reporting_manager_id?: string | null
          resignation_date?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_account_number?: string | null
          bank_name?: string | null
          blood_group?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_code?: string | null
          employment_type?: string | null
          exit_reason?: string | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          last_working_date?: string | null
          notice_period_days?: number | null
          pan_number?: string | null
          permanent_address?: string | null
          postal_code?: string | null
          probation_end_date?: string | null
          reporting_manager_id?: string | null
          resignation_date?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_verified: boolean | null
          mime_type: string | null
          notes: string | null
          updated_at: string | null
          uploaded_by: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          notes?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          bank_details: Json | null
          bio: string | null
          created_at: string | null
          current_address: Json | null
          current_ctc: number | null
          date_of_birth: string | null
          date_of_joining: string | null
          department: string | null
          designation: string | null
          emergency_contact: Json | null
          employee_id: string | null
          employment_type: string | null
          gender: string | null
          hr_status: string | null
          id: string
          linkedin_url: string | null
          nationality: string | null
          permanent_address: Json | null
          personal_email: string | null
          probation_end_date: string | null
          reporting_manager_id: string | null
          salary_components: Json | null
          skills: string[] | null
          tax_id: string | null
          updated_at: string | null
          user_id: string
          work_location: string | null
        }
        Insert: {
          bank_details?: Json | null
          bio?: string | null
          created_at?: string | null
          current_address?: Json | null
          current_ctc?: number | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_type?: string | null
          gender?: string | null
          hr_status?: string | null
          id?: string
          linkedin_url?: string | null
          nationality?: string | null
          permanent_address?: Json | null
          personal_email?: string | null
          probation_end_date?: string | null
          reporting_manager_id?: string | null
          salary_components?: Json | null
          skills?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          user_id: string
          work_location?: string | null
        }
        Update: {
          bank_details?: Json | null
          bio?: string | null
          created_at?: string | null
          current_address?: Json | null
          current_ctc?: number | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_type?: string | null
          gender?: string | null
          hr_status?: string | null
          id?: string
          linkedin_url?: string | null
          nationality?: string | null
          permanent_address?: Json | null
          personal_email?: string | null
          probation_end_date?: string | null
          reporting_manager_id?: string | null
          salary_components?: Json | null
          skills?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          monthly_budget: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_budget?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_budget?: number | null
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string | null
          department_id: string | null
          description: string
          expense_date: string
          expense_number: string
          id: string
          metadata: Json
          notes: string | null
          paid_by: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["expense_status"] | null
          submitted_by: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description: string
          expense_date?: string
          expense_number: string
          id?: string
          metadata?: Json
          notes?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          submitted_by?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string
          expense_date?: string
          expense_number?: string
          id?: string
          metadata?: Json
          notes?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          submitted_by?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_approvals: {
        Row: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          comments: string | null
          created_at: string | null
          entity_id: string
          id: string
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"] | null
        }
        Insert: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          comments?: string | null
          created_at?: string | null
          entity_id: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Update: {
          approval_type?: Database["public"]["Enums"]["approval_type"]
          comments?: string | null
          created_at?: string | null
          entity_id?: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          holiday_date: string
          id: string
          is_optional: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          holiday_date: string
          id?: string
          is_optional?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          holiday_date?: string
          id?: string
          is_optional?: boolean | null
          name?: string
        }
        Relationships: []
      }
      hr_document_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      increment_proposals: {
        Row: {
          approved_by: string | null
          created_at: string | null
          current_ctc: number | null
          effective_date: string
          employee_id: string
          id: string
          payroll_run_id: string | null
          proposed_by: string | null
          proposed_ctc: number
          reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          current_ctc?: number | null
          effective_date: string
          employee_id: string
          id?: string
          payroll_run_id?: string | null
          proposed_by?: string | null
          proposed_ctc: number
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          current_ctc?: number | null
          effective_date?: string
          employee_id?: string
          id?: string
          payroll_run_id?: string | null
          proposed_by?: string | null
          proposed_ctc?: number
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "increment_proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increment_proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increment_proposals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increment_proposals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increment_proposals_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increment_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increment_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number | null
          tax_rate: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number | null
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number | null
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          client_address: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          discount_amount: number | null
          discount_rate: number | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          is_recurring: boolean | null
          lead_id: string | null
          notes: string | null
          payment_terms: string | null
          recurring_schedule_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          client_address?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          discount_amount?: number | null
          discount_rate?: number | null
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          is_recurring?: boolean | null
          lead_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          recurring_schedule_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          client_address?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          discount_amount?: number | null
          discount_rate?: number | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_recurring?: boolean | null
          lead_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          recurring_schedule_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_recurring_schedule"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_log: Json | null
          expires_at: string | null
          file_path: string | null
          id: string
          params: Json | null
          result: Json | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          params?: Json | null
          result?: Json | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          params?: Json | null
          result?: Json | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          attachments: Json | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          lead_id: string
          metadata: Json | null
          next_action: string | null
          outcome: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          attachments?: Json | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          lead_id: string
          metadata?: Json | null
          next_action?: string | null
          outcome?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          attachments?: Json | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          next_action?: string | null
          outcome?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments_history: {
        Row: {
          assigned_by: string
          created_at: string | null
          from_user_id: string | null
          id: string
          lead_id: string
          reason: string | null
          to_user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          lead_id: string
          reason?: string | null
          to_user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          lead_id?: string
          reason?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_history_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_history_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_done: boolean | null
          is_sent: boolean | null
          lead_id: string
          note: string | null
          reminder_at: string
          sent_30min: boolean | null
          sent_5min: boolean | null
          sent_at_time: boolean | null
          sent_overdue: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_done?: boolean | null
          is_sent?: boolean | null
          lead_id: string
          note?: string | null
          reminder_at: string
          sent_30min?: boolean | null
          sent_5min?: boolean | null
          sent_at_time?: boolean | null
          sent_overdue?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_done?: boolean | null
          is_sent?: boolean | null
          lead_id?: string
          note?: string | null
          reminder_at?: string
          sent_30min?: boolean | null
          sent_5min?: boolean | null
          sent_at_time?: boolean | null
          sent_overdue?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          alternate_phone: string | null
          assigned_to: string | null
          business_name: string | null
          city: string | null
          client_response: string | null
          converted_at: string | null
          country: string | null
          created_at: string | null
          created_by: string
          custom_fields: Json | null
          department_id: string | null
          description: string | null
          designation: string | null
          email: string | null
          id: string
          industry: string | null
          is_deleted: boolean | null
          lead_name: string
          lead_type: string | null
          lead_value: number | null
          nal_reason: string | null
          phone: string | null
          pincode: string | null
          search_vector: unknown
          source: Database["public"]["Enums"]["lead_source"] | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          tags: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          alternate_phone?: string | null
          assigned_to?: string | null
          business_name?: string | null
          city?: string | null
          client_response?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          created_by: string
          custom_fields?: Json | null
          department_id?: string | null
          description?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean | null
          lead_name: string
          lead_type?: string | null
          lead_value?: number | null
          nal_reason?: string | null
          phone?: string | null
          pincode?: string | null
          search_vector?: unknown
          source?: Database["public"]["Enums"]["lead_source"] | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          alternate_phone?: string | null
          assigned_to?: string | null
          business_name?: string | null
          city?: string | null
          client_response?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string
          custom_fields?: Json | null
          department_id?: string | null
          description?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean | null
          lead_name?: string
          lead_type?: string | null
          lead_value?: number | null
          nal_reason?: string | null
          phone?: string | null
          pincode?: string | null
          search_vector?: unknown
          source?: Database["public"]["Enums"]["lead_source"] | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string | null
          id: string
          leave_type_id: string
          remaining_days: number | null
          total_days: number
          updated_at: string | null
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          leave_type_id: string
          remaining_days?: number | null
          total_days?: number
          updated_at?: string | null
          used_days?: number
          user_id: string
          year?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          leave_type_id?: string
          remaining_days?: number | null
          total_days?: number
          updated_at?: string | null
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          end_date: string
          hr_approved_at: string | null
          hr_approved_by: string | null
          hr_notes: string | null
          id: string
          leave_type_id: string
          manager_approved_at: string | null
          manager_id: string | null
          manager_notes: string | null
          reason: string | null
          start_date: string
          status: string | null
          total_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_notes?: string | null
          id?: string
          leave_type_id: string
          manager_approved_at?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          reason?: string | null
          start_date: string
          status?: string | null
          total_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_notes?: string | null
          id?: string
          leave_type_id?: string
          manager_approved_at?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          reason?: string | null
          start_date?: string
          status?: string | null
          total_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          carry_forward: boolean | null
          created_at: string | null
          days_allowed: number
          description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_carry_forward_days: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          carry_forward?: boolean | null
          created_at?: string | null
          days_allowed?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_carry_forward_days?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          carry_forward?: boolean | null
          created_at?: string | null
          days_allowed?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_carry_forward_days?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_records: {
        Row: {
          communication_sent_at: string | null
          communication_status: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          department_name: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          manager_id: string | null
          manager_name: string | null
          offboarding_date: string
          reason: string
          reason_notes: string | null
          role: string
          status: string
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          communication_sent_at?: string | null
          communication_status?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          department_name?: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          manager_id?: string | null
          manager_name?: string | null
          offboarding_date: string
          reason: string
          reason_notes?: string | null
          role: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          communication_sent_at?: string | null
          communication_status?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          department_name?: string | null
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          manager_id?: string | null
          manager_name?: string | null
          offboarding_date?: string
          reason?: string
          reason_notes?: string | null
          role?: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "offboarding_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "offboarding_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_records: {
        Row: {
          communication_sent_at: string | null
          communication_status: string
          created_at: string
          created_by: string | null
          department_id: string | null
          department_name: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          joining_date: string
          manager_id: string | null
          manager_name: string | null
          notes: string | null
          role: string
          status: string
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          communication_sent_at?: string | null
          communication_status?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          department_name?: string | null
          employee_email: string
          employee_id: string
          employee_name: string
          id?: string
          joining_date: string
          manager_id?: string | null
          manager_name?: string | null
          notes?: string | null
          role: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          communication_sent_at?: string | null
          communication_status?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          department_name?: string | null
          employee_email?: string
          employee_id?: string
          employee_name?: string
          id?: string
          joining_date?: string
          manager_id?: string | null
          manager_name?: string | null
          notes?: string | null
          role?: string
          status?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "onboarding_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "onboarding_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          is_used: boolean | null
          otp_code: string
          type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          otp_code: string
          type?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          otp_code?: string
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          recorded_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          attendance_summary: Json | null
          created_at: string | null
          deductions: Json
          earnings: Json
          edits: Json[] | null
          employee_id: string
          gross_pay: number
          id: string
          month: string
          net_pay: number
          payroll_run_id: string
          total_deductions: number
          updated_at: string | null
        }
        Insert: {
          attendance_summary?: Json | null
          created_at?: string | null
          deductions?: Json
          earnings?: Json
          edits?: Json[] | null
          employee_id: string
          gross_pay?: number
          id?: string
          month: string
          net_pay?: number
          payroll_run_id: string
          total_deductions?: number
          updated_at?: string | null
        }
        Update: {
          attendance_summary?: Json | null
          created_at?: string | null
          deductions?: Json
          earnings?: Json
          edits?: Json[] | null
          employee_id?: string
          gross_pay?: number
          id?: string
          month?: string
          net_pay?: number
          payroll_run_id?: string
          total_deductions?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_by: string | null
          cohort_name: string | null
          created_at: string | null
          disbursed_at: string | null
          employee_selection: Json | null
          id: string
          initiated_by: string
          is_correction: boolean | null
          month: string
          notes: string | null
          original_run_id: string | null
          status: string | null
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          cohort_name?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          employee_selection?: Json | null
          id?: string
          initiated_by: string
          is_correction?: boolean | null
          month: string
          notes?: string | null
          original_run_id?: string | null
          status?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          cohort_name?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          employee_selection?: Json | null
          id?: string
          initiated_by?: string
          is_correction?: boolean | null
          month?: string
          notes?: string | null
          original_run_id?: string | null
          status?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_original_run_id_fkey"
            columns: ["original_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_feedback_submissions: {
        Row: {
          comment: string | null
          dimension: string
          id: string
          review_id: string
          score: number | null
          submitted_at: string | null
          submitter_id: string
        }
        Insert: {
          comment?: string | null
          dimension: string
          id?: string
          review_id: string
          score?: number | null
          submitted_at?: string | null
          submitter_id: string
        }
        Update: {
          comment?: string | null
          dimension?: string
          id?: string
          review_id?: string
          score?: number | null
          submitted_at?: string | null
          submitter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedback_submissions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          acknowledgement_note: string | null
          calibrated_rating: string | null
          created_at: string | null
          cycle_id: string
          employee_id: string
          goals: Json[] | null
          id: string
          manager_id: string | null
          manager_review: Json | null
          peer_feedback: Json | null
          pip_triggered: boolean | null
          self_assessment: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgement_note?: string | null
          calibrated_rating?: string | null
          created_at?: string | null
          cycle_id: string
          employee_id: string
          goals?: Json[] | null
          id?: string
          manager_id?: string | null
          manager_review?: Json | null
          peer_feedback?: Json | null
          pip_triggered?: boolean | null
          self_assessment?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgement_note?: string | null
          calibrated_rating?: string | null
          created_at?: string | null
          cycle_id?: string
          employee_id?: string
          goals?: Json[] | null
          id?: string
          manager_id?: string | null
          manager_review?: Json | null
          peer_feedback?: Json | null
          pip_triggered?: boolean | null
          self_assessment?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string | null
          description: string | null
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          project_id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          project_id: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          project_id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          allocation_percentage: number
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          allocation_percentage?: number
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          allocation_percentage?: number
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          is_private: boolean
          project_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_private?: boolean
          project_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_private?: boolean
          project_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          lead_id: string | null
          manager_id: string
          name: string
          priority: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          lead_id?: string | null
          manager_id: string
          name: string
          priority?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          lead_id?: string | null
          manager_id?: string
          name?: string
          priority?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedules: {
        Row: {
          auto_send_email: boolean | null
          base_amount: number
          client_email: string
          client_name: string
          created_at: string | null
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          department_id: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          is_active: boolean | null
          lead_id: string | null
          line_items_template: Json | null
          name: string
          next_run_date: string
          requires_approval: boolean | null
          start_date: string
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          auto_send_email?: boolean | null
          base_amount: number
          client_email: string
          client_name: string
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          department_id?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          line_items_template?: Json | null
          name: string
          next_run_date: string
          requires_approval?: boolean | null
          start_date: string
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_send_email?: boolean | null
          base_amount?: number
          client_email?: string
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          department_id?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          line_items_template?: Json | null
          name?: string
          next_run_date?: string
          requires_approval?: boolean | null
          start_date?: string
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "recurring_schedules_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_revoked: boolean | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_revoked?: boolean | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_revoked?: boolean | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          calibration_deadline: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          final_approval_note: string | null
          final_approved_at: string | null
          final_approved_by: string | null
          frequency: string | null
          goal_setting_deadline: string | null
          id: string
          manager_review_deadline: string | null
          mid_checkin_date: string | null
          name: string
          results_release_date: string | null
          scope: string | null
          self_assessment_deadline: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          calibration_deadline?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          final_approval_note?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          frequency?: string | null
          goal_setting_deadline?: string | null
          id?: string
          manager_review_deadline?: string | null
          mid_checkin_date?: string | null
          name: string
          results_release_date?: string | null
          scope?: string | null
          self_assessment_deadline?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          calibration_deadline?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          final_approval_note?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          frequency?: string | null
          goal_setting_deadline?: string | null
          id?: string
          manager_review_deadline?: string | null
          mid_checkin_date?: string | null
          name?: string
          results_release_date?: string | null
          scope?: string | null
          self_assessment_deadline?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_final_approved_by_fkey"
            columns: ["final_approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cycles_final_approved_by_fkey"
            columns: ["final_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          department_ids: string[] | null
          id: string
          is_system: boolean
          name: string
          permissions: string[]
          scope: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          department_ids?: string[] | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: string[]
          scope?: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          department_ids?: string[] | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: string[]
          scope?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
        ]
      }
      salary_bands: {
        Row: {
          components_template: Json | null
          created_at: string | null
          created_by: string | null
          department: string | null
          designation: string
          id: string
          max_ctc: number
          min_ctc: number
          updated_at: string | null
        }
        Insert: {
          components_template?: Json | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          designation: string
          id?: string
          max_ctc: number
          min_ctc: number
          updated_at?: string | null
        }
        Update: {
          components_template?: Json | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          designation?: string
          id?: string
          max_ctc?: number
          min_ctc?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_bands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_bands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_emails: {
        Row: {
          attempts: number | null
          created_at: string | null
          email_request_id: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["scheduled_email_status"] | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email_request_id: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["scheduled_email_status"] | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email_request_id?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["scheduled_email_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_email_request_id_fkey"
            columns: ["email_request_id"]
            isOneToOne: false
            referencedRelation: "email_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          category: string
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          attachments: Json | null
          completed_at: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          id: string
          is_deleted: boolean | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          project_id: string | null
          related_lead_id: string | null
          related_team_id: string | null
          related_user_id: string | null
          reminder_before_minutes: number | null
          reminder_sent: boolean | null
          reminder_sent_30min: boolean | null
          reminder_sent_5min: boolean | null
          reminder_sent_at_time: boolean | null
          reminder_sent_overdue: boolean | null
          search_vector: unknown
          status: Database["public"]["Enums"]["task_status"] | null
          tags: string[] | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          attachments?: Json | null
          completed_at?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          related_lead_id?: string | null
          related_team_id?: string | null
          related_user_id?: string | null
          reminder_before_minutes?: number | null
          reminder_sent?: boolean | null
          reminder_sent_30min?: boolean | null
          reminder_sent_5min?: boolean | null
          reminder_sent_at_time?: boolean | null
          reminder_sent_overdue?: boolean | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          attachments?: Json | null
          completed_at?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          related_lead_id?: string | null
          related_team_id?: string | null
          related_user_id?: string | null
          reminder_before_minutes?: number | null
          reminder_sent?: boolean | null
          reminder_sent_30min?: boolean | null
          reminder_sent_5min?: boolean | null
          reminder_sent_at_time?: boolean | null
          reminder_sent_overdue?: boolean | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_team_id_fkey"
            columns: ["related_team_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tasks_related_team_id_fkey"
            columns: ["related_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "teams_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          title: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          title: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          title?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          assigned_at: string | null
          department_id: string
          id: string
          is_primary: boolean | null
          job_title: string | null
          shift_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          department_id: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          shift_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          shift_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_settings: {
        Row: {
          created_at: string | null
          daily_sent_count: number | null
          email_type: string | null
          id: string
          is_configured: boolean | null
          last_sent_reset_date: string | null
          last_test_at: string | null
          last_test_success: boolean | null
          smtp_host: string | null
          smtp_password_encrypted: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_sent_count?: number | null
          email_type?: string | null
          id?: string
          is_configured?: boolean | null
          last_sent_reset_date?: string | null
          last_test_at?: string | null
          last_test_success?: boolean | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_sent_count?: number | null
          email_type?: string | null
          id?: string
          is_configured?: boolean | null
          last_sent_reset_date?: string | null
          last_test_at?: string | null
          last_test_success?: boolean | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          country: string | null
          created_at: string | null
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_2fa_enabled: boolean | null
          is_active: boolean | null
          job_title: string | null
          last_login: string | null
          manager_id: string | null
          notification_preferences: Json | null
          notification_settings: Json | null
          phone: string | null
          primary_color: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          search_vector: unknown
          shift_type: string | null
          team_id: string | null
          theme_preference: string | null
          timezone: string | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          department_id?: string | null
          email: string
          full_name: string
          id: string
          is_2fa_enabled?: boolean | null
          is_active?: boolean | null
          job_title?: string | null
          last_login?: string | null
          manager_id?: string | null
          notification_preferences?: Json | null
          notification_settings?: Json | null
          phone?: string | null
          primary_color?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          search_vector?: unknown
          shift_type?: string | null
          team_id?: string | null
          theme_preference?: string | null
          timezone?: string | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_2fa_enabled?: boolean | null
          is_active?: boolean | null
          job_title?: string | null
          last_login?: string | null
          manager_id?: string | null
          notification_preferences?: Json | null
          notification_settings?: Json | null
          phone?: string | null
          primary_color?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          search_vector?: unknown
          shift_type?: string | null
          team_id?: string | null
          theme_preference?: string | null
          timezone?: string | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      all_activities: {
        Row: {
          activity_type: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string | null
          lead_id: string | null
          metadata: Json | null
          source_type: string | null
          title: string | null
          user_avatar: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      hr_employee_directory: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_joining: string | null
          department_id: string | null
          department_name: string | null
          department_slug: string | null
          email: string | null
          employee_code: string | null
          employment_type: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
          reporting_manager_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: []
      }
      leave_summary: {
        Row: {
          created_at: string | null
          employee_email: string | null
          employee_name: string | null
          end_date: string | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          hr_approver_name: string | null
          id: string | null
          is_paid: boolean | null
          leave_type: string | null
          manager_approved_at: string | null
          manager_id: string | null
          manager_name: string | null
          reason: string | null
          start_date: string | null
          status: string | null
          total_days: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resolved_permissions: {
        Row: {
          department_ids: string[] | null
          is_global: boolean | null
          permissions: string[] | null
          role_ids: string[] | null
          role_names: string[] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_holiday: {
        Args: {
          p_holiday_date: string
          p_is_optional?: boolean
          p_name: string
        }
        Returns: {
          created_at: string | null
          date: string
          holiday_date: string
          id: string
          is_optional: boolean | null
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "holidays"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_role_to_user: {
        Args: { p_role_id: string; target_user_id: string }
        Returns: undefined
      }
      backfill_attendance: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      bulk_auto_logout_due_attendance: { Args: never; Returns: number }
      current_user_has_permission: { Args: { perm: string }; Returns: boolean }
      edit_holiday: {
        Args: {
          p_holiday_date: string
          p_holiday_id: string
          p_is_optional?: boolean
          p_name: string
        }
        Returns: {
          created_at: string | null
          date: string
          holiday_date: string
          id: string
          is_optional: boolean | null
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "holidays"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_attendance_for_date: {
        Args: { p_target_date?: string }
        Returns: number
      }
      generate_daily_attendance: {
        Args: { p_target_date?: string }
        Returns: number
      }
      get_activity_events_feed: {
        Args: {
          p_actor_id?: string
          p_cursor_id?: string
          p_cursor_ts?: string
          p_event_type?: string
          p_limit: number
        }
        Returns: {
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_admin_dashboard_stats: {
        Args: {
          p_department_id?: string
          p_overdue_timestamp?: string
          p_start_of_month?: string
          p_today?: string
        }
        Returns: Json
      }
      get_all_department_performance: {
        Args: never
        Returns: {
          department_id: string
          department_name: string
          leads_count: number
          tasks_completed: number
          total_revenue: number
        }[]
      }
      get_dashboard_counts: {
        Args: { p_department_id?: string; p_start_of_month?: string }
        Returns: Json
      }
      get_lead_aggregations: {
        Args: { p_department_id?: string }
        Returns: Json
      }
      get_lead_pipeline_stats: {
        Args: {
          p_department_id?: string
          p_user_id?: string
          p_user_role?: string
        }
        Returns: {
          lead_count: number
          status: string
        }[]
      }
      get_lead_source_stats: {
        Args: { p_department_id?: string }
        Returns: {
          lead_count: number
          source: string
        }[]
      }
      get_my_department_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_team_id: { Args: never; Returns: string }
      get_team_member_counts: {
        Args: { p_team_ids: string[] }
        Returns: {
          member_count: number
          team_id: string
        }[]
      }
      get_top_performers: {
        Args: { p_limit?: number; p_start_of_month?: string }
        Returns: {
          avatar_url: string
          leads_won: number
          score: number
          tasks_completed: number
          user_id: string
          user_name: string
          user_role: string
        }[]
      }
      get_user_department_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_primary_department: {
        Args: { p_user_id: string }
        Returns: string
      }
      global_search: {
        Args: {
          p_department_id?: string
          p_limit?: number
          p_query: string
          p_team_id?: string
          p_user_id?: string
          p_user_role?: string
        }
        Returns: {
          entity_id: string
          entity_type: string
          rank: number
          subtitle: string
          title: string
          url: string
        }[]
      }
      handle_auto_logout: { Args: never; Returns: undefined }
      initialize_leave_balances: {
        Args: { target_year?: number }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_hr: { Args: never; Returns: boolean }
      is_manager_or_admin: { Args: never; Returns: boolean }
      is_project_manager_of: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      login_activate_attendance_session: {
        Args: { p_login_at?: string; p_user_id: string }
        Returns: {
          attendance_date: string
          attendance_status: string
          auto_logged_out: boolean | null
          auto_logout_time: string | null
          break_duration: number | null
          clock_in_time: string | null
          clock_out_time: string | null
          created_at: string | null
          date: string
          id: string
          location: string | null
          logout_time: string | null
          logout_type: string | null
          notes: string | null
          restored_at: string | null
          restored_by_admin_id: string | null
          session_status: string | null
          shift_end_time: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          total_hours: number | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_holiday: { Args: { p_holiday_id: string }; Returns: boolean }
      remove_role_from_user: {
        Args: { p_role_id: string; target_user_id: string }
        Returns: undefined
      }
      run_daily_attendance_if_due: { Args: never; Returns: number }
      update_attendance_for_holiday: {
        Args: { p_target_date: string }
        Returns: number
      }
      upsert_company_settings: {
        Args: {
          p_shift_duration_hours?: number
          p_timezone?: string
          p_week_off_days?: number[]
        }
        Returns: {
          created_at: string
          id: string
          shift_duration_hours: number
          timezone: string
          updated_at: string
          week_off_days: number[]
        }
        SetofOptions: {
          from: "*"
          to: "company_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      valid_week_off_days: { Args: { p_days: number[] }; Returns: boolean }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      approval_type: "invoice" | "expense" | "email"
      attendance_status:
        | "present"
        | "late"
        | "half_day"
        | "absent"
        | "leave"
        | "holiday"
      email_request_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "failed"
      expense_status: "pending" | "approved" | "rejected"
      finance_email_type: "invoice" | "payment_reminder" | "receipt" | "custom"
      invoice_status:
        | "draft"
        | "pending_approval"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
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
        | "other"
      lead_status:
        | "fresh_lead"
        | "hot_lead"
        | "cold_lead"
        | "meeting_scheduled"
        | "did_not_pick"
        | "follow_up"
        | "future_lead"
        | "not_interested"
        | "not_a_lead"
        | "won"
        | "proposal_sent"
      payment_mode:
        | "cash"
        | "bank_transfer"
        | "upi"
        | "card"
        | "cheque"
        | "other"
      payment_status: "success" | "pending" | "failed"
      recurring_frequency: "weekly" | "monthly" | "quarterly" | "yearly"
      registration_status: "pending" | "approved" | "rejected"
      scheduled_email_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      task_priority: "high" | "medium" | "low"
      task_status: "todo" | "in_progress" | "completed" | "cancelled"
      user_role: "admin" | "manager" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      approval_type: ["invoice", "expense", "email"],
      attendance_status: [
        "present",
        "late",
        "half_day",
        "absent",
        "leave",
        "holiday",
      ],
      email_request_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "failed",
      ],
      expense_status: ["pending", "approved", "rejected"],
      finance_email_type: ["invoice", "payment_reminder", "receipt", "custom"],
      invoice_status: [
        "draft",
        "pending_approval",
        "sent",
        "paid",
        "overdue",
        "cancelled",
      ],
      lead_source: [
        "website",
        "referral",
        "cold_call",
        "email_campaign",
        "social_media",
        "trade_show",
        "advertisement",
        "partner",
        "organic_search",
        "paid_search",
        "direct",
        "other",
      ],
      lead_status: [
        "fresh_lead",
        "hot_lead",
        "cold_lead",
        "meeting_scheduled",
        "did_not_pick",
        "follow_up",
        "future_lead",
        "not_interested",
        "not_a_lead",
        "won",
        "proposal_sent",
      ],
      payment_mode: ["cash", "bank_transfer", "upi", "card", "cheque", "other"],
      payment_status: ["success", "pending", "failed"],
      recurring_frequency: ["weekly", "monthly", "quarterly", "yearly"],
      registration_status: ["pending", "approved", "rejected"],
      scheduled_email_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      task_priority: ["high", "medium", "low"],
      task_status: ["todo", "in_progress", "completed", "cancelled"],
      user_role: ["admin", "manager", "employee"],
    },
  },
} as const
