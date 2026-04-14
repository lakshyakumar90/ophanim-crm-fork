# Database Tables Reference

Source: `database.types.ts`

Total tables documented: **59**

## Table Index

- activity_events
- attendance
- attendance_rules
- comments
- company_settings
- cron_job_runs
- departments
- email_requests
- email_send_log
- email_templates
- employee_compensation_history
- employee_details
- employee_documents
- employee_profiles
- expense_categories
- expenses
- finance_approvals
- holidays
- hr_document_types
- increment_proposals
- invoice_line_items
- invoices
- jobs
- lead_activities
- lead_assignments_history
- lead_reminders
- leads
- leave_balances
- leave_requests
- leave_types
- notifications
- offboarding_records
- onboarding_records
- otp_tokens
- payments
- payroll_records
- payroll_runs
- peer_feedback_submissions
- performance_reviews
- project_files
- project_members
- project_notes
- projects
- recurring_schedules
- refresh_tokens
- review_cycles
- roles
- salary_bands
- scheduled_emails
- settings
- tasks
- team_notes
- teams
- user_activities
- user_departments
- user_email_settings
- user_roles
- user_teams
- users

## activity_events

### Columns

| Column | Type |
|---|---|
| actor_id | string |
| created_at | string |
| entity_id | string \| null |
| entity_name | string \| null |
| entity_type | string |
| event_type | string |
| id | string |
| metadata | Json \| null |
| source | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| activity_events_actor_id_fkey | actor_id | hr_employee_directory | id |
| activity_events_actor_id_fkey | actor_id | users | id |

## attendance

### Columns

| Column | Type |
|---|---|
| attendance_date | string |
| attendance_status | string |
| auto_logged_out | boolean \| null |
| auto_logout_time | string \| null |
| break_duration | number \| null |
| clock_in_time | string \| null |
| clock_out_time | string \| null |
| created_at | string \| null |
| date | string |
| id | string |
| location | string \| null |
| logout_time | string \| null |
| logout_type | string \| null |
| notes | string \| null |
| restored_at | string \| null |
| restored_by_admin_id | string \| null |
| session_status | string \| null |
| shift_end_time | string \| null |
| status | Database["public"]["Enums"]["attendance_status"] \| null |
| total_hours | number \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| attendance_restored_by_admin_id_fkey | restored_by_admin_id | hr_employee_directory | id |
| attendance_restored_by_admin_id_fkey | restored_by_admin_id | users | id |
| attendance_user_id_fkey | user_id | hr_employee_directory | id |
| attendance_user_id_fkey | user_id | users | id |

## attendance_rules

### Columns

| Column | Type |
|---|---|
| auto_logout_time | string \| null |
| created_at | string \| null |
| full_day_hours | number \| null |
| half_day_hours | number \| null |
| id | string |
| late_threshold_minutes | number \| null |
| shift_type | string \| null |
| updated_at | string \| null |
| weekly_off_days | number[] \| null |
| work_end_time | string \| null |
| work_start_time | string \| null |

### Relationships

No relationships declared in generated types.

## comments

### Columns

| Column | Type |
|---|---|
| content | string |
| created_at | string \| null |
| entity_id | string |
| entity_type | string |
| id | string |
| is_deleted | boolean \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| comments_user_id_fkey | user_id | hr_employee_directory | id |
| comments_user_id_fkey | user_id | users | id |

## company_settings

### Columns

| Column | Type |
|---|---|
| created_at | string |
| id | string |
| shift_duration_hours | number |
| timezone | string |
| updated_at | string |
| week_off_days | number[] |

### Relationships

No relationships declared in generated types.

## cron_job_runs

### Columns

| Column | Type |
|---|---|
| created_at | string |
| duration_ms | number \| null |
| error_message | string \| null |
| finished_at | string \| null |
| id | number |
| job_name | string |
| processed_count | number \| null |
| started_at | string |
| success | boolean \| null |

### Relationships

No relationships declared in generated types.

## departments

### Columns

| Column | Type |
|---|---|
| color | string \| null |
| created_at | string \| null |
| description | string \| null |
| icon | string \| null |
| id | string |
| is_active | boolean \| null |
| name | string |
| slug | string |
| updated_at | string \| null |

### Relationships

No relationships declared in generated types.

## email_requests

### Columns

| Column | Type |
|---|---|
| approved_at | string \| null |
| approved_by | string \| null |
| attachments | Json \| null |
| body | string |
| created_at | string \| null |
| email_type | Database["public"]["Enums"]["finance_email_type"] |
| error_message | string \| null |
| id | string |
| invoice_id | string \| null |
| lead_id | string \| null |
| recipient_email | string |
| recipient_name | string \| null |
| rejection_reason | string \| null |
| scheduled_at | string \| null |
| sender_id | string |
| sent_at | string \| null |
| status | Database["public"]["Enums"]["email_request_status"] \| null |
| subject | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| email_requests_approved_by_fkey | approved_by | hr_employee_directory | id |
| email_requests_approved_by_fkey | approved_by | users | id |
| email_requests_invoice_id_fkey | invoice_id | invoices | id |
| email_requests_lead_id_fkey | lead_id | leads | id |
| email_requests_sender_id_fkey | sender_id | hr_employee_directory | id |
| email_requests_sender_id_fkey | sender_id | users | id |

## email_send_log

### Columns

| Column | Type |
|---|---|
| error_message | string \| null |
| id | string |
| lead_id | string \| null |
| recipient_email | string |
| recipient_name | string \| null |
| sent_at | string \| null |
| status | string \| null |
| subject | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| email_send_log_lead_id_fkey | lead_id | leads | id |
| email_send_log_user_id_fkey | user_id | hr_employee_directory | id |
| email_send_log_user_id_fkey | user_id | users | id |

## email_templates

### Columns

| Column | Type |
|---|---|
| body | string |
| created_at | string \| null |
| created_by | string |
| id | string |
| name | string |
| subject | string |
| updated_at | string \| null |
| variables | string[] \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| email_templates_created_by_fkey | created_by | hr_employee_directory | id |
| email_templates_created_by_fkey | created_by | users | id |

## employee_compensation_history

### Columns

| Column | Type |
|---|---|
| approved_by | string \| null |
| change_percentage | number \| null |
| created_at | string \| null |
| effective_date | string |
| employee_id | string |
| id | string |
| new_ctc | number |
| previous_ctc | number \| null |
| reason | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| employee_compensation_history_approved_by_fkey | approved_by | hr_employee_directory | id |
| employee_compensation_history_approved_by_fkey | approved_by | users | id |
| employee_compensation_history_employee_id_fkey | employee_id | hr_employee_directory | id |
| employee_compensation_history_employee_id_fkey | employee_id | users | id |

## employee_details

### Columns

| Column | Type |
|---|---|
| bank_account_number | string \| null |
| bank_name | string \| null |
| blood_group | string \| null |
| city | string \| null |
| country | string \| null |
| created_at | string \| null |
| current_address | string \| null |
| date_of_birth | string \| null |
| date_of_joining | string \| null |
| emergency_contact_name | string \| null |
| emergency_contact_phone | string \| null |
| emergency_contact_relation | string \| null |
| employee_code | string \| null |
| employment_type | string \| null |
| exit_reason | string \| null |
| gender | string \| null |
| id | string |
| ifsc_code | string \| null |
| last_working_date | string \| null |
| notice_period_days | number \| null |
| pan_number | string \| null |
| permanent_address | string \| null |
| postal_code | string \| null |
| probation_end_date | string \| null |
| reporting_manager_id | string \| null |
| resignation_date | string \| null |
| state | string \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| employee_details_reporting_manager_id_fkey | reporting_manager_id | hr_employee_directory | id |
| employee_details_reporting_manager_id_fkey | reporting_manager_id | users | id |
| employee_details_user_id_fkey | user_id | hr_employee_directory | id |
| employee_details_user_id_fkey | user_id | users | id |

## employee_documents

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| document_name | string |
| document_type | string |
| expiry_date | string \| null |
| file_name | string |
| file_size | number \| null |
| file_url | string |
| id | string |
| is_verified | boolean \| null |
| mime_type | string \| null |
| notes | string \| null |
| updated_at | string \| null |
| uploaded_by | string \| null |
| user_id | string |
| verified_at | string \| null |
| verified_by | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| employee_documents_uploaded_by_fkey | uploaded_by | hr_employee_directory | id |
| employee_documents_uploaded_by_fkey | uploaded_by | users | id |
| employee_documents_user_id_fkey | user_id | hr_employee_directory | id |
| employee_documents_user_id_fkey | user_id | users | id |
| employee_documents_verified_by_fkey | verified_by | hr_employee_directory | id |
| employee_documents_verified_by_fkey | verified_by | users | id |

## employee_profiles

### Columns

| Column | Type |
|---|---|
| bank_details | Json \| null |
| bio | string \| null |
| created_at | string \| null |
| current_address | Json \| null |
| current_ctc | number \| null |
| date_of_birth | string \| null |
| date_of_joining | string \| null |
| department | string \| null |
| designation | string \| null |
| emergency_contact | Json \| null |
| employee_id | string \| null |
| employment_type | string \| null |
| gender | string \| null |
| hr_status | string \| null |
| id | string |
| linkedin_url | string \| null |
| nationality | string \| null |
| permanent_address | Json \| null |
| personal_email | string \| null |
| probation_end_date | string \| null |
| reporting_manager_id | string \| null |
| salary_components | Json \| null |
| skills | string[] \| null |
| tax_id | string \| null |
| updated_at | string \| null |
| user_id | string |
| work_location | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| employee_profiles_reporting_manager_id_fkey | reporting_manager_id | hr_employee_directory | id |
| employee_profiles_reporting_manager_id_fkey | reporting_manager_id | users | id |
| employee_profiles_user_id_fkey | user_id | hr_employee_directory | id |
| employee_profiles_user_id_fkey | user_id | users | id |

## expense_categories

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| description | string \| null |
| id | string |
| is_active | boolean \| null |
| monthly_budget | number \| null |
| name | string |

### Relationships

No relationships declared in generated types.

## expenses

### Columns

| Column | Type |
|---|---|
| amount | number |
| approved_at | string \| null |
| approved_by | string \| null |
| category_id | string \| null |
| created_at | string \| null |
| department_id | string \| null |
| description | string |
| expense_date | string |
| expense_number | string |
| id | string |
| metadata | Json |
| notes | string \| null |
| paid_by | string \| null |
| receipt_url | string \| null |
| rejection_reason | string \| null |
| status | Database["public"]["Enums"]["expense_status"] \| null |
| submitted_by | string \| null |
| updated_at | string \| null |
| vendor_name | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| expenses_approved_by_fkey | approved_by | hr_employee_directory | id |
| expenses_approved_by_fkey | approved_by | users | id |
| expenses_category_id_fkey | category_id | expense_categories | id |
| expenses_department_id_fkey | department_id | departments | id |
| expenses_department_id_fkey | department_id | hr_employee_directory | department_id |
| expenses_paid_by_fkey | paid_by | hr_employee_directory | id |
| expenses_paid_by_fkey | paid_by | users | id |
| expenses_submitted_by_fkey | submitted_by | hr_employee_directory | id |
| expenses_submitted_by_fkey | submitted_by | users | id |

## finance_approvals

### Columns

| Column | Type |
|---|---|
| approval_type | Database["public"]["Enums"]["approval_type"] |
| comments | string \| null |
| created_at | string \| null |
| entity_id | string |
| id | string |
| requested_at | string \| null |
| requested_by | string \| null |
| reviewed_at | string \| null |
| reviewed_by | string \| null |
| status | Database["public"]["Enums"]["approval_status"] \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| finance_approvals_requested_by_fkey | requested_by | hr_employee_directory | id |
| finance_approvals_requested_by_fkey | requested_by | users | id |
| finance_approvals_reviewed_by_fkey | reviewed_by | hr_employee_directory | id |
| finance_approvals_reviewed_by_fkey | reviewed_by | users | id |

## holidays

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| date | string |
| holiday_date | string |
| id | string |
| is_optional | boolean \| null |
| name | string |

### Relationships

No relationships declared in generated types.

## hr_document_types

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| description | string \| null |
| id | string |
| is_active | boolean |
| label | string |
| slug | string |
| sort_order | number |
| updated_at | string \| null |

### Relationships

No relationships declared in generated types.

## increment_proposals

### Columns

| Column | Type |
|---|---|
| approved_by | string \| null |
| created_at | string \| null |
| current_ctc | number \| null |
| effective_date | string |
| employee_id | string |
| id | string |
| payroll_run_id | string \| null |
| proposed_by | string \| null |
| proposed_ctc | number |
| reason | string \| null |
| status | string \| null |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| increment_proposals_approved_by_fkey | approved_by | hr_employee_directory | id |
| increment_proposals_approved_by_fkey | approved_by | users | id |
| increment_proposals_employee_id_fkey | employee_id | hr_employee_directory | id |
| increment_proposals_employee_id_fkey | employee_id | users | id |
| increment_proposals_payroll_run_id_fkey | payroll_run_id | payroll_runs | id |
| increment_proposals_proposed_by_fkey | proposed_by | hr_employee_directory | id |
| increment_proposals_proposed_by_fkey | proposed_by | users | id |

## invoice_line_items

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| description | string |
| id | string |
| invoice_id | string |
| quantity | number |
| sort_order | number \| null |
| tax_rate | number \| null |
| total | number |
| unit_price | number |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| invoice_line_items_invoice_id_fkey | invoice_id | invoices | id |

## invoices

### Columns

| Column | Type |
|---|---|
| amount_paid | number \| null |
| approved_at | string \| null |
| approved_by | string \| null |
| attachments | Json \| null |
| client_address | string \| null |
| client_email | string |
| client_name | string |
| client_phone | string \| null |
| created_at | string \| null |
| created_by | string \| null |
| department_id | string \| null |
| discount_amount | number \| null |
| discount_rate | number \| null |
| due_date | string |
| id | string |
| invoice_date | string |
| invoice_number | string |
| is_recurring | boolean \| null |
| lead_id | string \| null |
| notes | string \| null |
| payment_terms | string \| null |
| recurring_schedule_id | string \| null |
| sent_at | string \| null |
| status | Database["public"]["Enums"]["invoice_status"] \| null |
| subtotal | number |
| tax_amount | number \| null |
| tax_rate | number \| null |
| total_amount | number |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| fk_invoices_recurring_schedule | recurring_schedule_id | recurring_schedules | id |
| invoices_approved_by_fkey | approved_by | hr_employee_directory | id |
| invoices_approved_by_fkey | approved_by | users | id |
| invoices_created_by_fkey | created_by | hr_employee_directory | id |
| invoices_created_by_fkey | created_by | users | id |
| invoices_department_id_fkey | department_id | departments | id |
| invoices_department_id_fkey | department_id | hr_employee_directory | department_id |
| invoices_lead_id_fkey | lead_id | leads | id |

## jobs

### Columns

| Column | Type |
|---|---|
| completed_at | string \| null |
| created_at | string \| null |
| error_log | Json \| null |
| expires_at | string \| null |
| file_path | string \| null |
| id | string |
| params | Json \| null |
| result | Json \| null |
| status | string \| null |
| type | string |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| jobs_user_id_fkey | user_id | hr_employee_directory | id |
| jobs_user_id_fkey | user_id | users | id |

## lead_activities

### Columns

| Column | Type |
|---|---|
| activity_type | string |
| attachments | Json \| null |
| created_at | string \| null |
| description | string \| null |
| duration | number \| null |
| id | string |
| lead_id | string |
| metadata | Json \| null |
| next_action | string \| null |
| outcome | string \| null |
| title | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| lead_activities_lead_id_fkey | lead_id | leads | id |
| lead_activities_user_id_fkey | user_id | hr_employee_directory | id |
| lead_activities_user_id_fkey | user_id | users | id |

## lead_assignments_history

### Columns

| Column | Type |
|---|---|
| assigned_by | string |
| created_at | string \| null |
| from_user_id | string \| null |
| id | string |
| lead_id | string |
| reason | string \| null |
| to_user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| lead_assignments_history_assigned_by_fkey | assigned_by | hr_employee_directory | id |
| lead_assignments_history_assigned_by_fkey | assigned_by | users | id |
| lead_assignments_history_from_user_id_fkey | from_user_id | hr_employee_directory | id |
| lead_assignments_history_from_user_id_fkey | from_user_id | users | id |
| lead_assignments_history_lead_id_fkey | lead_id | leads | id |
| lead_assignments_history_to_user_id_fkey | to_user_id | hr_employee_directory | id |
| lead_assignments_history_to_user_id_fkey | to_user_id | users | id |

## lead_reminders

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| id | string |
| is_done | boolean \| null |
| is_sent | boolean \| null |
| lead_id | string |
| note | string \| null |
| reminder_at | string |
| sent_30min | boolean \| null |
| sent_5min | boolean \| null |
| sent_at_time | boolean \| null |
| sent_overdue | boolean \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| lead_reminders_lead_id_fkey | lead_id | leads | id |
| lead_reminders_user_id_fkey | user_id | hr_employee_directory | id |
| lead_reminders_user_id_fkey | user_id | users | id |

## leads

### Columns

| Column | Type |
|---|---|
| address | string \| null |
| alternate_phone | string \| null |
| assigned_to | string \| null |
| business_name | string \| null |
| city | string \| null |
| client_response | string \| null |
| converted_at | string \| null |
| country | string \| null |
| created_at | string \| null |
| created_by | string |
| custom_fields | Json \| null |
| department_id | string \| null |
| description | string \| null |
| designation | string \| null |
| email | string \| null |
| id | string |
| industry | string \| null |
| is_deleted | boolean \| null |
| lead_name | string |
| lead_type | string \| null |
| lead_value | number \| null |
| nal_reason | string \| null |
| phone | string \| null |
| pincode | string \| null |
| search_vector | unknown |
| source | Database["public"]["Enums"]["lead_source"] \| null |
| state | string \| null |
| status | Database["public"]["Enums"]["lead_status"] \| null |
| tags | string \| null |
| timezone | string \| null |
| updated_at | string \| null |
| website | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| leads_assigned_to_fkey | assigned_to | hr_employee_directory | id |
| leads_assigned_to_fkey | assigned_to | users | id |
| leads_created_by_fkey | created_by | hr_employee_directory | id |
| leads_created_by_fkey | created_by | users | id |
| leads_department_id_fkey | department_id | departments | id |
| leads_department_id_fkey | department_id | hr_employee_directory | department_id |

## leave_balances

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| id | string |
| leave_type_id | string |
| remaining_days | number \| null |
| total_days | number |
| updated_at | string \| null |
| used_days | number |
| user_id | string |
| year | number |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| leave_balances_leave_type_id_fkey | leave_type_id | leave_types | id |
| leave_balances_user_id_fkey | user_id | hr_employee_directory | id |
| leave_balances_user_id_fkey | user_id | users | id |

## leave_requests

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| end_date | string |
| hr_approved_at | string \| null |
| hr_approved_by | string \| null |
| hr_notes | string \| null |
| id | string |
| leave_type_id | string |
| manager_approved_at | string \| null |
| manager_id | string \| null |
| manager_notes | string \| null |
| reason | string \| null |
| start_date | string |
| status | string \| null |
| total_days | number \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| leave_requests_hr_approved_by_fkey | hr_approved_by | hr_employee_directory | id |
| leave_requests_hr_approved_by_fkey | hr_approved_by | users | id |
| leave_requests_leave_type_id_fkey | leave_type_id | leave_types | id |
| leave_requests_manager_id_fkey | manager_id | hr_employee_directory | id |
| leave_requests_manager_id_fkey | manager_id | users | id |
| leave_requests_user_id_fkey | user_id | hr_employee_directory | id |
| leave_requests_user_id_fkey | user_id | users | id |

## leave_types

### Columns

| Column | Type |
|---|---|
| carry_forward | boolean \| null |
| created_at | string \| null |
| days_allowed | number |
| description | string \| null |
| id | string |
| is_active | boolean \| null |
| is_paid | boolean \| null |
| max_carry_forward_days | number \| null |
| name | string |
| updated_at | string \| null |

### Relationships

No relationships declared in generated types.

## notifications

### Columns

| Column | Type |
|---|---|
| action_url | string \| null |
| created_at | string \| null |
| id | string |
| is_read | boolean \| null |
| message | string |
| priority | string \| null |
| related_entity_id | string \| null |
| related_entity_type | string \| null |
| title | string |
| type | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| notifications_user_id_fkey | user_id | hr_employee_directory | id |
| notifications_user_id_fkey | user_id | users | id |

## offboarding_records

### Columns

| Column | Type |
|---|---|
| communication_sent_at | string \| null |
| communication_status | string |
| completed_at | string \| null |
| created_at | string |
| created_by | string \| null |
| department_id | string \| null |
| department_name | string \| null |
| employee_email | string |
| employee_id | string |
| employee_name | string |
| id | string |
| manager_id | string \| null |
| manager_name | string \| null |
| offboarding_date | string |
| reason | string |
| reason_notes | string \| null |
| role | string |
| status | string |
| team_id | string \| null |
| team_name | string \| null |
| updated_at | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| offboarding_records_created_by_fkey | created_by | hr_employee_directory | id |
| offboarding_records_created_by_fkey | created_by | users | id |
| offboarding_records_department_id_fkey | department_id | departments | id |
| offboarding_records_department_id_fkey | department_id | hr_employee_directory | department_id |
| offboarding_records_employee_id_fkey | employee_id | hr_employee_directory | id |
| offboarding_records_employee_id_fkey | employee_id | users | id |
| offboarding_records_manager_id_fkey | manager_id | hr_employee_directory | id |
| offboarding_records_manager_id_fkey | manager_id | users | id |
| offboarding_records_team_id_fkey | team_id | hr_employee_directory | team_id |
| offboarding_records_team_id_fkey | team_id | teams | id |

## onboarding_records

### Columns

| Column | Type |
|---|---|
| communication_sent_at | string \| null |
| communication_status | string |
| created_at | string |
| created_by | string \| null |
| department_id | string \| null |
| department_name | string \| null |
| employee_email | string |
| employee_id | string |
| employee_name | string |
| id | string |
| joining_date | string |
| manager_id | string \| null |
| manager_name | string \| null |
| notes | string \| null |
| role | string |
| status | string |
| team_id | string \| null |
| team_name | string \| null |
| updated_at | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| onboarding_records_created_by_fkey | created_by | hr_employee_directory | id |
| onboarding_records_created_by_fkey | created_by | users | id |
| onboarding_records_department_id_fkey | department_id | departments | id |
| onboarding_records_department_id_fkey | department_id | hr_employee_directory | department_id |
| onboarding_records_employee_id_fkey | employee_id | hr_employee_directory | id |
| onboarding_records_employee_id_fkey | employee_id | users | id |
| onboarding_records_manager_id_fkey | manager_id | hr_employee_directory | id |
| onboarding_records_manager_id_fkey | manager_id | users | id |
| onboarding_records_team_id_fkey | team_id | hr_employee_directory | team_id |
| onboarding_records_team_id_fkey | team_id | teams | id |

## otp_tokens

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| email | string |
| expires_at | string |
| id | string |
| is_used | boolean \| null |
| otp_code | string |
| type | string |

### Relationships

No relationships declared in generated types.

## payments

### Columns

| Column | Type |
|---|---|
| amount | number |
| created_at | string \| null |
| id | string |
| invoice_id | string |
| notes | string \| null |
| payment_date | string |
| payment_mode | Database["public"]["Enums"]["payment_mode"] |
| recorded_by | string \| null |
| status | Database["public"]["Enums"]["payment_status"] \| null |
| transaction_id | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| payments_invoice_id_fkey | invoice_id | invoices | id |
| payments_recorded_by_fkey | recorded_by | hr_employee_directory | id |
| payments_recorded_by_fkey | recorded_by | users | id |

## payroll_records

### Columns

| Column | Type |
|---|---|
| attendance_summary | Json \| null |
| created_at | string \| null |
| deductions | Json |
| earnings | Json |
| edits | Json[] \| null |
| employee_id | string |
| gross_pay | number |
| id | string |
| month | string |
| net_pay | number |
| payroll_run_id | string |
| total_deductions | number |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| payroll_records_employee_id_fkey | employee_id | hr_employee_directory | id |
| payroll_records_employee_id_fkey | employee_id | users | id |
| payroll_records_payroll_run_id_fkey | payroll_run_id | payroll_runs | id |

## payroll_runs

### Columns

| Column | Type |
|---|---|
| approved_by | string \| null |
| cohort_name | string \| null |
| created_at | string \| null |
| disbursed_at | string \| null |
| employee_selection | Json \| null |
| id | string |
| initiated_by | string |
| is_correction | boolean \| null |
| month | string |
| notes | string \| null |
| original_run_id | string \| null |
| status | string \| null |
| total_deductions | number \| null |
| total_gross | number \| null |
| total_net | number \| null |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| payroll_runs_approved_by_fkey | approved_by | hr_employee_directory | id |
| payroll_runs_approved_by_fkey | approved_by | users | id |
| payroll_runs_initiated_by_fkey | initiated_by | hr_employee_directory | id |
| payroll_runs_initiated_by_fkey | initiated_by | users | id |
| payroll_runs_original_run_id_fkey | original_run_id | payroll_runs | id |

## peer_feedback_submissions

### Columns

| Column | Type |
|---|---|
| comment | string \| null |
| dimension | string |
| id | string |
| review_id | string |
| score | number \| null |
| submitted_at | string \| null |
| submitter_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| peer_feedback_submissions_review_id_fkey | review_id | performance_reviews | id |
| peer_feedback_submissions_submitter_id_fkey | submitter_id | hr_employee_directory | id |
| peer_feedback_submissions_submitter_id_fkey | submitter_id | users | id |

## performance_reviews

### Columns

| Column | Type |
|---|---|
| acknowledged_at | string \| null |
| acknowledgement_note | string \| null |
| calibrated_rating | string \| null |
| created_at | string \| null |
| cycle_id | string |
| employee_id | string |
| goals | Json[] \| null |
| id | string |
| manager_id | string \| null |
| manager_review | Json \| null |
| peer_feedback | Json \| null |
| pip_triggered | boolean \| null |
| self_assessment | Json \| null |
| status | string \| null |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| performance_reviews_cycle_id_fkey | cycle_id | review_cycles | id |
| performance_reviews_employee_id_fkey | employee_id | hr_employee_directory | id |
| performance_reviews_employee_id_fkey | employee_id | users | id |
| performance_reviews_manager_id_fkey | manager_id | hr_employee_directory | id |
| performance_reviews_manager_id_fkey | manager_id | users | id |

## project_files

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| description | string \| null |
| file_size | number \| null |
| file_type | string \| null |
| id | string |
| name | string |
| project_id | string |
| storage_path | string |
| updated_at | string \| null |
| uploaded_by | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| project_files_project_id_fkey | project_id | projects | id |
| project_files_uploaded_by_fkey | uploaded_by | hr_employee_directory | id |
| project_files_uploaded_by_fkey | uploaded_by | users | id |

## project_members

### Columns

| Column | Type |
|---|---|
| allocation_percentage | number |
| id | string |
| joined_at | string |
| project_id | string |
| role | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| project_members_project_id_fkey | project_id | projects | id |
| project_members_user_id_fkey | user_id | hr_employee_directory | id |
| project_members_user_id_fkey | user_id | users | id |

## project_notes

### Columns

| Column | Type |
|---|---|
| content | string |
| created_at | string \| null |
| id | string |
| is_pinned | boolean \| null |
| is_private | boolean |
| project_id | string |
| updated_at | string \| null |
| user_id | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| project_notes_project_id_fkey | project_id | projects | id |
| project_notes_user_id_fkey | user_id | hr_employee_directory | id |
| project_notes_user_id_fkey | user_id | users | id |

## projects

### Columns

| Column | Type |
|---|---|
| client_name | string \| null |
| created_at | string |
| description | string \| null |
| end_date | string \| null |
| id | string |
| lead_id | string \| null |
| manager_id | string |
| name | string |
| priority | string |
| start_date | string \| null |
| status | string |
| updated_at | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| projects_lead_id_fkey | lead_id | leads | id |
| projects_manager_id_fkey | manager_id | hr_employee_directory | id |
| projects_manager_id_fkey | manager_id | users | id |

## recurring_schedules

### Columns

| Column | Type |
|---|---|
| auto_send_email | boolean \| null |
| base_amount | number |
| client_email | string |
| client_name | string |
| created_at | string \| null |
| created_by | string \| null |
| day_of_month | number \| null |
| day_of_week | number \| null |
| department_id | string \| null |
| end_date | string \| null |
| frequency | Database["public"]["Enums"]["recurring_frequency"] |
| id | string |
| is_active | boolean \| null |
| lead_id | string \| null |
| line_items_template | Json \| null |
| name | string |
| next_run_date | string |
| requires_approval | boolean \| null |
| start_date | string |
| tax_rate | number \| null |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| recurring_schedules_created_by_fkey | created_by | hr_employee_directory | id |
| recurring_schedules_created_by_fkey | created_by | users | id |
| recurring_schedules_department_id_fkey | department_id | departments | id |
| recurring_schedules_department_id_fkey | department_id | hr_employee_directory | department_id |
| recurring_schedules_lead_id_fkey | lead_id | leads | id |

## refresh_tokens

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| expires_at | string |
| id | string |
| is_revoked | boolean \| null |
| token | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| refresh_tokens_user_id_fkey | user_id | hr_employee_directory | id |
| refresh_tokens_user_id_fkey | user_id | users | id |

## review_cycles

### Columns

| Column | Type |
|---|---|
| calibration_deadline | string \| null |
| created_at | string \| null |
| created_by | string \| null |
| department_id | string \| null |
| final_approval_note | string \| null |
| final_approved_at | string \| null |
| final_approved_by | string \| null |
| frequency | string \| null |
| goal_setting_deadline | string \| null |
| id | string |
| manager_review_deadline | string \| null |
| mid_checkin_date | string \| null |
| name | string |
| results_release_date | string \| null |
| scope | string \| null |
| self_assessment_deadline | string \| null |
| status | string \| null |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| review_cycles_created_by_fkey | created_by | hr_employee_directory | id |
| review_cycles_created_by_fkey | created_by | users | id |
| review_cycles_final_approved_by_fkey | final_approved_by | hr_employee_directory | id |
| review_cycles_final_approved_by_fkey | final_approved_by | users | id |

## roles

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| created_by | string \| null |
| department_id | string \| null |
| department_ids | string[] \| null |
| id | string |
| is_system | boolean |
| name | string |
| permissions | string[] |
| scope | string |
| slug | string |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| roles_department_id_fkey | department_id | departments | id |
| roles_department_id_fkey | department_id | hr_employee_directory | department_id |

## salary_bands

### Columns

| Column | Type |
|---|---|
| components_template | Json \| null |
| created_at | string \| null |
| created_by | string \| null |
| department | string \| null |
| designation | string |
| id | string |
| max_ctc | number |
| min_ctc | number |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| salary_bands_created_by_fkey | created_by | hr_employee_directory | id |
| salary_bands_created_by_fkey | created_by | users | id |

## scheduled_emails

### Columns

| Column | Type |
|---|---|
| attempts | number \| null |
| created_at | string \| null |
| email_request_id | string |
| error_message | string \| null |
| id | string |
| last_attempt_at | string \| null |
| scheduled_for | string |
| status | Database["public"]["Enums"]["scheduled_email_status"] \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| scheduled_emails_email_request_id_fkey | email_request_id | email_requests | id |

## settings

### Columns

| Column | Type |
|---|---|
| category | string |
| id | string |
| key | string |
| updated_at | string \| null |
| updated_by | string \| null |
| value | Json |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| settings_updated_by_fkey | updated_by | hr_employee_directory | id |
| settings_updated_by_fkey | updated_by | users | id |

## tasks

### Columns

| Column | Type |
|---|---|
| assigned_by | string |
| assigned_to | string |
| attachments | Json \| null |
| completed_at | string \| null |
| created_at | string \| null |
| department_id | string \| null |
| description | string \| null |
| due_date | string \| null |
| id | string |
| is_deleted | boolean \| null |
| priority | Database["public"]["Enums"]["task_priority"] \| null |
| project_id | string \| null |
| related_lead_id | string \| null |
| related_team_id | string \| null |
| related_user_id | string \| null |
| reminder_before_minutes | number \| null |
| reminder_sent | boolean \| null |
| reminder_sent_30min | boolean \| null |
| reminder_sent_5min | boolean \| null |
| reminder_sent_at_time | boolean \| null |
| reminder_sent_overdue | boolean \| null |
| search_vector | unknown |
| status | Database["public"]["Enums"]["task_status"] \| null |
| tags | string[] \| null |
| task_type | string \| null |
| title | string |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| tasks_assigned_by_fkey | assigned_by | hr_employee_directory | id |
| tasks_assigned_by_fkey | assigned_by | users | id |
| tasks_assigned_to_fkey | assigned_to | hr_employee_directory | id |
| tasks_assigned_to_fkey | assigned_to | users | id |
| tasks_department_id_fkey | department_id | departments | id |
| tasks_department_id_fkey | department_id | hr_employee_directory | department_id |
| tasks_project_id_fkey | project_id | projects | id |
| tasks_related_lead_id_fkey | related_lead_id | leads | id |
| tasks_related_team_id_fkey | related_team_id | hr_employee_directory | team_id |
| tasks_related_team_id_fkey | related_team_id | teams | id |
| tasks_related_user_id_fkey | related_user_id | hr_employee_directory | id |
| tasks_related_user_id_fkey | related_user_id | users | id |

## team_notes

### Columns

| Column | Type |
|---|---|
| content | string |
| created_at | string |
| id | string |
| team_id | string |
| updated_at | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| team_notes_team_id_fkey | team_id | hr_employee_directory | team_id |
| team_notes_team_id_fkey | team_id | teams | id |
| team_notes_user_id_fkey | user_id | hr_employee_directory | id |
| team_notes_user_id_fkey | user_id | users | id |

## teams

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| department_id | string \| null |
| description | string \| null |
| id | string |
| manager_id | string \| null |
| name | string |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| teams_department_id_fkey | department_id | departments | id |
| teams_department_id_fkey | department_id | hr_employee_directory | department_id |
| teams_manager_fk | manager_id | hr_employee_directory | id |
| teams_manager_fk | manager_id | users | id |

## user_activities

### Columns

| Column | Type |
|---|---|
| activity_type | string |
| created_at | string \| null |
| description | string \| null |
| entity_id | string \| null |
| entity_type | string \| null |
| id | string |
| ip_address | string \| null |
| metadata | Json \| null |
| title | string |
| user_agent | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| user_activities_user_id_fkey | user_id | hr_employee_directory | id |
| user_activities_user_id_fkey | user_id | users | id |

## user_departments

### Columns

| Column | Type |
|---|---|
| assigned_at | string \| null |
| department_id | string |
| id | string |
| is_primary | boolean \| null |
| job_title | string \| null |
| shift_type | string \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| user_departments_department_id_fkey | department_id | departments | id |
| user_departments_department_id_fkey | department_id | hr_employee_directory | department_id |
| user_departments_user_id_fkey | user_id | hr_employee_directory | id |
| user_departments_user_id_fkey | user_id | users | id |

## user_email_settings

### Columns

| Column | Type |
|---|---|
| created_at | string \| null |
| daily_sent_count | number \| null |
| email_type | string \| null |
| id | string |
| is_configured | boolean \| null |
| last_sent_reset_date | string \| null |
| last_test_at | string \| null |
| last_test_success | boolean \| null |
| smtp_host | string \| null |
| smtp_password_encrypted | string \| null |
| smtp_port | number \| null |
| smtp_secure | boolean \| null |
| smtp_user | string \| null |
| updated_at | string \| null |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| user_email_settings_user_id_fkey | user_id | hr_employee_directory | id |
| user_email_settings_user_id_fkey | user_id | users | id |

## user_roles

### Columns

| Column | Type |
|---|---|
| assigned_at | string \| null |
| assigned_by | string \| null |
| id | string |
| role_id | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| user_roles_role_id_fkey | role_id | roles | id |

## user_teams

### Columns

| Column | Type |
|---|---|
| joined_at | string |
| role | string |
| team_id | string |
| user_id | string |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| user_teams_team_id_fkey | team_id | hr_employee_directory | team_id |
| user_teams_team_id_fkey | team_id | teams | id |
| user_teams_user_id_fkey | user_id | hr_employee_directory | id |
| user_teams_user_id_fkey | user_id | users | id |

## users

### Columns

| Column | Type |
|---|---|
| address | string \| null |
| avatar_url | string \| null |
| country | string \| null |
| created_at | string \| null |
| department_id | string \| null |
| email | string |
| full_name | string |
| id | string |
| is_2fa_enabled | boolean \| null |
| is_active | boolean \| null |
| job_title | string \| null |
| last_login | string \| null |
| manager_id | string \| null |
| notification_preferences | Json \| null |
| notification_settings | Json \| null |
| phone | string \| null |
| primary_color | string \| null |
| role | Database["public"]["Enums"]["user_role"] \| null |
| search_vector | unknown |
| shift_type | string \| null |
| team_id | string \| null |
| theme_preference | string \| null |
| timezone | string \| null |
| two_factor_secret | string \| null |
| updated_at | string \| null |

### Relationships

| Foreign Key | Columns | References | Referenced Columns |
|---|---|---|---|
| users_department_id_fkey | department_id | departments | id |
| users_department_id_fkey | department_id | hr_employee_directory | department_id |
| users_manager_id_fkey | manager_id | hr_employee_directory | id |
| users_manager_id_fkey | manager_id | users | id |
| users_team_id_fkey | team_id | hr_employee_directory | team_id |
| users_team_id_fkey | team_id | teams | id |
