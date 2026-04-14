# RLS Policy Documentation

This file summarizes tables with RLS enabled and all explicit `CREATE POLICY` statements found in Supabase migrations.

Migration source folder: `crm-be-Main/supabase/migrations`

## Tables With RLS Enabled

Total tables with explicit RLS enable statements: **61**

| Table | Enabled In Migrations |
|---|---|
| activity_logs | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| attendance | 001_initial_schema.sql, 002_fix_rls.sql, 033_comprehensive_rls.sql |
| attendance_rules | 002_fix_rls.sql, 032_add_shift_system.sql, 033_comprehensive_rls.sql |
| candidates | 002_hr_rls_policies.sql |
| comments | 033_comprehensive_rls.sql |
| csv_export_jobs | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| csv_import_jobs | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| departments | 032_add_shift_system.sql, 033_comprehensive_rls.sql |
| email_requests | 019_finance_module.sql |
| email_send_log | 003_user_email_settings.sql, 033_comprehensive_rls.sql |
| email_templates | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| employee_compensation_history | 002_hr_rls_policies.sql |
| employee_details | 033_comprehensive_rls.sql, hr_schema.sql |
| employee_documents | 033_comprehensive_rls.sql, hr_schema.sql |
| employee_profiles | 002_hr_rls_policies.sql |
| expense_categories | 019_finance_module.sql |
| expenses | 019_finance_module.sql |
| finance_approvals | 019_finance_module.sql |
| holidays | 002_fix_rls.sql, 032_add_shift_system.sql, 033_comprehensive_rls.sql |
| increment_proposals | 002_hr_rls_policies.sql |
| interviews | 002_hr_rls_policies.sql |
| invoice_line_items | 019_finance_module.sql |
| invoices | 019_finance_module.sql |
| job_postings | 002_hr_rls_policies.sql |
| lead_activities | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| lead_assignments_history | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| lead_reminders | 033_comprehensive_rls.sql |
| leads | 001_initial_schema.sql, 002_fix_rls.sql, 033_comprehensive_rls.sql |
| leave_balances | 033_comprehensive_rls.sql, hr_schema.sql |
| leave_requests | 033_comprehensive_rls.sql, hr_schema.sql |
| leave_types | 033_comprehensive_rls.sql |
| notification_preferences | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| notifications | 001_initial_schema.sql, 002_fix_rls.sql, 033_comprehensive_rls.sql |
| onboarding_checklists | 002_hr_rls_policies.sql |
| onboarding_templates | 002_hr_rls_policies.sql |
| payments | 019_finance_module.sql |
| payroll_records | 002_hr_rls_policies.sql |
| payroll_runs | 002_hr_rls_policies.sql |
| peer_feedback_submissions | 002_hr_rls_policies.sql |
| performance_reviews | 002_hr_rls_policies.sql |
| project_files | project_notes_schema.sql |
| project_members | 023_create_projects.sql, 033_comprehensive_rls.sql |
| project_notes | project_notes_schema.sql |
| projects | 023_create_projects.sql, 033_comprehensive_rls.sql |
| public.team_notes | team_notes_schema.sql |
| recurring_schedules | 019_finance_module.sql |
| refresh_tokens | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| review_cycles | 002_hr_rls_policies.sql |
| roles | 049_rbac_system.sql |
| salary_bands | 002_hr_rls_policies.sql |
| saved_filters | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| scheduled_emails | 019_finance_module.sql |
| settings | 002_fix_rls.sql, 033_comprehensive_rls.sql |
| task_comments | 002_fix_rls.sql |
| tasks | 001_initial_schema.sql, 002_fix_rls.sql, 033_comprehensive_rls.sql |
| team_notes | 033_comprehensive_rls.sql |
| teams | 002_fix_rls.sql, 032_add_shift_system.sql, 033_comprehensive_rls.sql |
| user_activities | 033_comprehensive_rls.sql |
| user_email_settings | 003_user_email_settings.sql, 033_comprehensive_rls.sql |
| user_roles | 049_rbac_system.sql |
| users | 001_initial_schema.sql, 002_fix_rls.sql, 033_comprehensive_rls.sql |

## Policies

Total explicit policies discovered: **128**

| Policy Name | Table | Migration |
|---|---|---|
| activity_logs_select_policy | activity_logs | 033_comprehensive_rls.sql |
| Service role full access | activity_logs | 002_fix_rls.sql |
| attendance_select_policy | attendance | 033_comprehensive_rls.sql |
| Service role full access | attendance | 002_fix_rls.sql |
| Users read own attendance | attendance | 032_add_shift_system.sql |
| Public read attendance_rules | attendance_rules | 032_add_shift_system.sql |
| Service role full access | attendance_rules | 002_fix_rls.sql |
| candidates_hr_only | candidates | 002_hr_rls_policies.sql |
| comments_select_policy | comments | 033_comprehensive_rls.sql |
| csv_export_select_policy | csv_export_jobs | 033_comprehensive_rls.sql |
| Service role full access | csv_export_jobs | 002_fix_rls.sql |
| csv_import_select_policy | csv_import_jobs | 033_comprehensive_rls.sql |
| Service role full access | csv_import_jobs | 002_fix_rls.sql |
| Public read departments | departments | 032_add_shift_system.sql |
| Allow all for authenticated users | email_requests | 019_finance_module.sql |
| admin_view_email_logs | email_send_log | 033_comprehensive_rls.sql |
| Users can insert own email logs | email_send_log | 003_user_email_settings.sql |
| Users can view own email logs | email_send_log | 003_user_email_settings.sql |
| email_templates_select_policy | email_templates | 033_comprehensive_rls.sql |
| Service role full access | email_templates | 002_fix_rls.sql |
| comp_history_admin_insert | employee_compensation_history | 002_hr_rls_policies.sql |
| comp_history_own_read | employee_compensation_history | 002_hr_rls_policies.sql |
| employee_details_select_policy | employee_details | 033_comprehensive_rls.sql |
| employee_documents_select_policy | employee_documents | 033_comprehensive_rls.sql |
| employee_profiles_admin_all | employee_profiles | 002_hr_rls_policies.sql |
| employee_profiles_own_read | employee_profiles | 002_hr_rls_policies.sql |
| employee_profiles_own_update | employee_profiles | 002_hr_rls_policies.sql |
| Admin can manage expense categories | expense_categories | 019_finance_module.sql |
| Anyone can read expense categories | expense_categories | 019_finance_module.sql |
| Allow all for authenticated users | expenses | 019_finance_module.sql |
| Allow all for authenticated users | finance_approvals | 019_finance_module.sql |
| Public read holidays | holidays | 032_add_shift_system.sql |
| Service role full access | holidays | 002_fix_rls.sql |
| increment_proposals_hr_all | increment_proposals | 002_hr_rls_policies.sql |
| increment_proposals_own_read | increment_proposals | 002_hr_rls_policies.sql |
| interviews_hr_manage | interviews | 002_hr_rls_policies.sql |
| interviews_interviewer_read | interviews | 002_hr_rls_policies.sql |
| Allow all for authenticated users | invoice_line_items | 019_finance_module.sql |
| Allow all for authenticated users | invoices | 019_finance_module.sql |
| job_postings_hr_manage | job_postings | 002_hr_rls_policies.sql |
| job_postings_read_all | job_postings | 002_hr_rls_policies.sql |
| lead_activities_select_policy | lead_activities | 033_comprehensive_rls.sql |
| lead_activities_select_policy | lead_activities | 064_optimize_leads_rls_for_managers.sql |
| Service role full access | lead_activities | 002_fix_rls.sql |
| lead_assignments_select_policy | lead_assignments_history | 033_comprehensive_rls.sql |
| lead_assignments_select_policy | lead_assignments_history | 064_optimize_leads_rls_for_managers.sql |
| Service role full access | lead_assignments_history | 002_fix_rls.sql |
| lead_reminders_select_policy | lead_reminders | 033_comprehensive_rls.sql |
| leads_select_policy | leads | 033_comprehensive_rls.sql |
| leads_select_policy | leads | 064_optimize_leads_rls_for_managers.sql |
| Service role full access | leads | 002_fix_rls.sql |
| leave_balances_select_policy | leave_balances | 033_comprehensive_rls.sql |
| leave_requests_select_policy | leave_requests | 033_comprehensive_rls.sql |
| leave_types_select_policy | leave_types | 033_comprehensive_rls.sql |
| notification_prefs_select_policy | notification_preferences | 033_comprehensive_rls.sql |
| Service role full access | notification_preferences | 002_fix_rls.sql |
| notifications_select_policy | notifications | 033_comprehensive_rls.sql |
| Service role full access | notifications | 002_fix_rls.sql |
| Users read own notifications | notifications | 032_add_shift_system.sql |
| onboarding_checklists_hr_all | onboarding_checklists | 002_hr_rls_policies.sql |
| onboarding_checklists_own_read | onboarding_checklists | 002_hr_rls_policies.sql |
| onboarding_templates_hr_manage | onboarding_templates | 002_hr_rls_policies.sql |
| onboarding_templates_read | onboarding_templates | 002_hr_rls_policies.sql |
| Allow all for authenticated users | payments | 019_finance_module.sql |
| payroll_records_hr_all | payroll_records | 002_hr_rls_policies.sql |
| payroll_records_own_read | payroll_records | 002_hr_rls_policies.sql |
| payroll_runs_hr_only | payroll_runs | 002_hr_rls_policies.sql |
| peer_feedback_admin_read | peer_feedback_submissions | 002_hr_rls_policies.sql |
| peer_feedback_submitter_insert | peer_feedback_submissions | 002_hr_rls_policies.sql |
| perf_reviews_hr_all | performance_reviews | 002_hr_rls_policies.sql |
| perf_reviews_own_read | performance_reviews | 002_hr_rls_policies.sql |
| perf_reviews_own_self_assessment | performance_reviews | 002_hr_rls_policies.sql |
| project_files_delete_policy | project_files | 053_fix_rls_recursion.sql |
| project_files_delete_policy | project_files | project_notes_schema.sql |
| project_files_insert_policy | project_files | 053_fix_rls_recursion.sql |
| project_files_insert_policy | project_files | project_notes_schema.sql |
| project_files_select_policy | project_files | 053_fix_rls_recursion.sql |
| project_files_select_policy | project_files | project_notes_schema.sql |
| Allow all access for service role | project_members | 023_create_projects.sql |
| project_members_select_policy | project_members | 033_comprehensive_rls.sql |
| project_members_select_policy | project_members | 052_fix_pm_rls.sql |
| project_members_select_policy | project_members | 053_fix_rls_recursion.sql |
| project_notes_select_policy | project_notes | 052_fix_pm_rls.sql |
| project_notes_select_policy | project_notes | 053_fix_rls_recursion.sql |
| Allow all access for service role | projects | 023_create_projects.sql |
| projects_select_policy | projects | 033_comprehensive_rls.sql |
| projects_select_policy | projects | 053_fix_rls_recursion.sql |
| activity_events_select_policy | public.activity_events | 065_harden_rls_activity_email_comments_reminders.sql |
| comments_select_policy | public.comments | 065_harden_rls_activity_email_comments_reminders.sql |
| email_requests_delete_policy | public.email_requests | 065_harden_rls_activity_email_comments_reminders.sql |
| email_requests_insert_policy | public.email_requests | 065_harden_rls_activity_email_comments_reminders.sql |
| email_requests_select_policy | public.email_requests | 065_harden_rls_activity_email_comments_reminders.sql |
| email_requests_update_policy | public.email_requests | 065_harden_rls_activity_email_comments_reminders.sql |
| lead_reminders_select_policy | public.lead_reminders | 065_harden_rls_activity_email_comments_reminders.sql |
| Create team notes | public.team_notes | team_notes_schema.sql |
| Delete team notes | public.team_notes | team_notes_schema.sql |
| Update team notes | public.team_notes | team_notes_schema.sql |
| View team notes | public.team_notes | team_notes_schema.sql |
| Allow all for authenticated users | recurring_schedules | 019_finance_module.sql |
| refresh_tokens_no_access | refresh_tokens | 033_comprehensive_rls.sql |
| Service role full access | refresh_tokens | 002_fix_rls.sql |
| review_cycles_hr_all | review_cycles | 002_hr_rls_policies.sql |
| review_cycles_read | review_cycles | 002_hr_rls_policies.sql |
| roles_read | roles | 049_rbac_system.sql |
| roles_write | roles | 049_rbac_system.sql |
| salary_bands_hr_only | salary_bands | 002_hr_rls_policies.sql |
| saved_filters_select_policy | saved_filters | 033_comprehensive_rls.sql |
| Service role full access | saved_filters | 002_fix_rls.sql |
| Allow all for authenticated users | scheduled_emails | 019_finance_module.sql |
| Service role full access | settings | 002_fix_rls.sql |
| settings_select_policy | settings | 033_comprehensive_rls.sql |
| Authenticated Upload | storage.objects | project_notes_schema.sql |
| Public Access | storage.objects | project_notes_schema.sql |
| User Delete | storage.objects | project_notes_schema.sql |
| Service role full access | task_comments | 002_fix_rls.sql |
| Service role full access | tasks | 002_fix_rls.sql |
| tasks_select_policy | tasks | 033_comprehensive_rls.sql |
| tasks_select_policy | tasks | 053_fix_rls_recursion.sql |
| Public read teams | teams | 032_add_shift_system.sql |
| Service role full access | teams | 002_fix_rls.sql |
| user_activities_select_policy | user_activities | 033_comprehensive_rls.sql |
| admin_view_email_settings | user_email_settings | 033_comprehensive_rls.sql |
| Users can manage own email settings | user_email_settings | 003_user_email_settings.sql |
| Users can view own email settings | user_email_settings | 003_user_email_settings.sql |
| user_roles_read_own | user_roles | 049_rbac_system.sql |
| user_roles_write | user_roles | 049_rbac_system.sql |
| Authenticated users read active users | users | 033_comprehensive_rls.sql |
| Service role full access | users | 002_fix_rls.sql |

## Additional Manual RLS Notes

- See: `RLS_RECURSION_FIX.md`