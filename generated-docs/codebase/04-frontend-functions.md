# Frontend (crm-fe-main/src) - Function and Code Documentation

Source root: `crm-fe-main/src`

This catalog lists top-level functions/classes detected in each file and an inferred purpose from naming + location.

## crm-fe-main/src/app/(auth)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AuthLayout | Component/Class/Type Constructor | Authentication/authorization handling |

## crm-fe-main/src/app/(auth)/login/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleBack | Function | Domain-specific processing |
| handleVerify2FA | Function | Domain-specific processing |
| LoginForm | Component/Class/Type Constructor | Authentication/authorization handling |
| LoginPage | Component/Class/Type Constructor | Authentication/authorization handling |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(finance)/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| FinanceError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/analytics/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AnalyticsSkeleton | Component/Class/Type Constructor | Domain-specific processing |
| FinanceAnalyticsPage | Component/Class/Type Constructor | Domain-specific processing |
| formatCurrency | Function | Transforms data shape/format |
| formatMonth | Function | Transforms data shape/format |

## crm-fe-main/src/app/(finance)/finance/approvals/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ApprovalsPage | Component/Class/Type Constructor | Domain-specific processing |
| getTypeColor | Function | Reads/query data |
| getTypeIcon | Function | Reads/query data |
| handleApprove | Function | Domain-specific processing |
| handleReject | Function | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/emails/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EmailRequestDetailPage | Component/Class/Type Constructor | Communication/notification handling |
| handleApprove | Function | Domain-specific processing |
| handleReject | Function | Domain-specific processing |
| handleSend | Function | Communication/notification handling |
| handleSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/emails/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleInvoiceChange | Function | Domain-specific processing |
| handleLeadChange | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| NewEmailRequestPage | Component/Class/Type Constructor | Communication/notification handling |

## crm-fe-main/src/app/(finance)/finance/emails/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EmailRequestsPage | Component/Class/Type Constructor | Communication/notification handling |
| handleApprove | Function | Domain-specific processing |
| handleReject | Function | Domain-specific processing |
| handleSend | Function | Communication/notification handling |

## crm-fe-main/src/app/(finance)/finance/expenses/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ExpenseDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| handleApprove | Function | Domain-specific processing |
| handleReject | Function | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/expenses/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleSubmit | Function | Domain-specific processing |
| NewExpensePage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/expenses/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ExpensesPage | Component/Class/Type Constructor | Domain-specific processing |
| handleApprove | Function | Domain-specific processing |
| handleReject | Function | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/invoices/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleApprove | Function | Domain-specific processing |
| handleRecordPayment | Function | Domain-specific processing |
| handleReject | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| InvoiceDetailPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/invoices/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| addLineItem | Function | Creates new records/resources |
| handleLeadChange | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| NewInvoicePage | Component/Class/Type Constructor | Domain-specific processing |
| removeLineItem | Function | Deletes records/resources |
| updateLineItem | Function | Updates existing records/resources |

## crm-fe-main/src/app/(finance)/finance/invoices/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleApprove | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| InvoicesPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| DashboardSkeleton | Component/Class/Type Constructor | Domain-specific processing |
| FinanceDashboardPage | Component/Class/Type Constructor | Domain-specific processing |
| formatCurrency | Function | Transforms data shape/format |
| StatCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/payments/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| PaymentsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/recurring/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleDelete | Function | Domain-specific processing |
| handlePause | Function | Domain-specific processing |
| handleResume | Function | Domain-specific processing |
| RecurringScheduleDetailPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/finance/recurring/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| addLineItem | Function | Creates new records/resources |
| handleLeadChange | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| NewRecurringSchedulePage | Component/Class/Type Constructor | Domain-specific processing |
| removeLineItem | Function | Deletes records/resources |
| updateLineItem | Function | Updates existing records/resources |

## crm-fe-main/src/app/(finance)/finance/recurring/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleDelete | Function | Domain-specific processing |
| handlePause | Function | Domain-specific processing |
| handleResume | Function | Domain-specific processing |
| RecurringSchedulesPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(finance)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| FinanceLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(global)/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| GlobalGroupError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/activity/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ActivityRedirect | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleDepartmentChange | Function | Domain-specific processing |
| handleRoleChange | Function | Domain-specific processing |
| jobTitleLabel | Function | Domain-specific processing |
| NewUserPage | Component/Class/Type Constructor | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |
| slugSeniority | Function | Domain-specific processing |
| slugToJobTitle | Function | Domain-specific processing |
| toggleRbacRole | Function | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| DashboardSkeleton | Component/Class/Type Constructor | Domain-specific processing |
| fetchEnhancedDashboard | Function | Reads/query data |
| GlobalDashboardPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/roles/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| applyPreset | Function | Domain-specific processing |
| handleDeleteClick | Function | Domain-specific processing |
| handleDeleteConfirm | Function | Domain-specific processing |
| handleSave | Function | Domain-specific processing |
| openCreate | Function | Domain-specific processing |
| openEdit | Function | Domain-specific processing |
| PermissionChecklist | Component/Class/Type Constructor | Domain-specific processing |
| RoleDetailsDialog | Component/Class/Type Constructor | UI rendering and interaction |
| RoleModal | Component/Class/Type Constructor | UI rendering and interaction |
| RolesPage | Component/Class/Type Constructor | Domain-specific processing |
| toggle | Function | Domain-specific processing |
| toggleDept | Function | Domain-specific processing |
| toggleGroup | Function | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/teams/[id]/add-member/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AddMemberPage | Component/Class/Type Constructor | Creates new records/resources |
| handleSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/teams/[id]/edit/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EditTeamPage | Component/Class/Type Constructor | Updates existing records/resources |
| handleSubmit | Function | Domain-specific processing |
| validate | Function | Validates input payloads |

## crm-fe-main/src/app/(global)/global/teams/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| GlobalTeamDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| handleRemoveMember | Function | Domain-specific processing |
| TeamDetailSkeleton | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/teams/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleSubmit | Function | Domain-specific processing |
| NewTeamPage | Component/Class/Type Constructor | Domain-specific processing |
| validate | Function | Validates input payloads |

## crm-fe-main/src/app/(global)/global/teams/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| getDepartmentName | Function | Reads/query data |
| GlobalTeamsPage | Component/Class/Type Constructor | Domain-specific processing |
| handleDelete | Function | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/users/[id]/edit/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EditUserPage | Component/Class/Type Constructor | Updates existing records/resources |
| formatTitleLabel | Function | Transforms data shape/format |
| handleAssignRole | Function | Domain-specific processing |
| handleDeleteEmailSettings | Function | Communication/notification handling |
| handleEmailTypeChange | Function | Communication/notification handling |
| handleRemoveRole | Function | Domain-specific processing |
| handleResetPassword | Function | Domain-specific processing |
| handleSaveEmailSettings | Function | Communication/notification handling |
| handleTestEmailSettings | Function | Communication/notification handling |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(global)/global/users/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| formatJobTitle | Function | Transforms data shape/format |
| getActivityIcon | Function | Reads/query data |
| getRoleIcon | Function | Reads/query data |
| UserDetailPage | Component/Class/Type Constructor | Custom hook encapsulating state/data logic |

## crm-fe-main/src/app/(global)/global/users/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| getRoleBadge | Function | Reads/query data |
| saveBulkUsers | Function | Domain-specific processing |
| scrollToBulkTable | Function | Domain-specific processing |
| toggleAll | Function | Domain-specific processing |
| UsersPage | Component/Class/Type Constructor | Custom hook encapsulating state/data logic |

## crm-fe-main/src/app/(global)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| GlobalLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| HRError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/analytics/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchAnalytics | Function | Reads/query data |
| HRAnalyticsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/attendance/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| HRAttendancePage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/documents/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| HrDocumentsPage | Component/Class/Type Constructor | Domain-specific processing |
| onVis | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/employees/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| clearFilters | Function | Domain-specific processing |
| confirmBulkDeactivate | Function | Domain-specific processing |
| exportFiltered | Function | Domain-specific processing |
| exportSelected | Function | Domain-specific processing |
| HREmployeesPage | Component/Class/Type Constructor | Domain-specific processing |
| onCreated | Function | Domain-specific processing |
| openDrawer | Function | Domain-specific processing |
| saveBulkEmployees | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/holidays/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| goBack | Function | Domain-specific processing |
| goForward | Function | Domain-specific processing |
| handleAdd | Function | Domain-specific processing |
| handleDelete | Function | Domain-specific processing |
| HRHolidaysPage | Component/Class/Type Constructor | Domain-specific processing |
| openCreate | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/leaves/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| HrLeavesPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ActivityFeedCard | Component/Class/Type Constructor | Domain-specific processing |
| AlertsCard | Component/Class/Type Constructor | Domain-specific processing |
| ComplianceCard | Component/Class/Type Constructor | Domain-specific processing |
| HeadcountCard | Component/Class/Type Constructor | Domain-specific processing |
| HRDashboardPage | Component/Class/Type Constructor | Domain-specific processing |
| LeaveCard | Component/Class/Type Constructor | Domain-specific processing |
| PayrollCard | Component/Class/Type Constructor | Domain-specific processing |
| PerformanceCard | Component/Class/Type Constructor | Domain-specific processing |
| RecruitmentCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/payroll/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| PayrollRunDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| transition | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/payroll/my-payslips/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleDownloadPdf | Function | Domain-specific processing |
| MyPayslipsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/payroll/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| approveAllPendingIncrements | Function | Domain-specific processing |
| confirmApproveInc | Function | Transforms data shape/format |
| confirmRejectInc | Function | Domain-specific processing |
| handleQuickApprove | Function | Domain-specific processing |
| loadEmployees | Function | Domain-specific processing |
| PayrollRunsPage | Component/Class/Type Constructor | Domain-specific processing |
| rejectAllPendingIncrements | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/payroll/salary-bands/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| confirmDelete | Function | Domain-specific processing |
| refreshEmployees | Function | Domain-specific processing |
| SalaryBandsPage | Component/Class/Type Constructor | Domain-specific processing |
| templateLabel | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/performance/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| confirmActivate | Function | Domain-specific processing |
| confirmDeactivate | Function | Domain-specific processing |
| CycleDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| onApprove | Function | Domain-specific processing |
| onRelease | Function | Domain-specific processing |
| openPanel | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/performance/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| goToStep | Function | Domain-specific processing |
| isoToDate | Function | Domain-specific processing |
| NewPerformanceCyclePage | Component/Class/Type Constructor | Domain-specific processing |
| nextFromDeadlines | Function | Domain-specific processing |
| nextFromSetup | Function | Domain-specific processing |
| parse | Function | Domain-specific processing |
| save | Function | Domain-specific processing |
| toIsoEndOfDay | Function | Domain-specific processing |

## crm-fe-main/src/app/(hr)/hr/performance/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| confirmActivate | Function | Domain-specific processing |
| confirmDelete | Function | Domain-specific processing |
| PerformanceCyclesPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(hr)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| hasOnboardingModuleAccess | Function | Domain-specific processing |
| hasPayrollAccess | Function | Domain-specific processing |
| hasPerformanceHrAccess | Function | Domain-specific processing |
| HRLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ProjectsError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ProjectsLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/activity/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| extractChanges | Function | Domain-specific processing |
| getActionColor | Function | Reads/query data |
| getActionIcon | Function | Reads/query data |
| getDateRange | Function | Reads/query data |
| getEntityUrl | Function | Reads/query data |
| ProjectActivityPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/analytics/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| normTask | Function | Domain-specific processing |
| ProjectAnalyticsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/discussion/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ProjectDiscussionPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/files/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchFiles | Function | Reads/query data |
| formatFileSize | Function | Transforms data shape/format |
| getFileIcon | Function | Reads/query data |
| handleDelete | Function | Domain-specific processing |
| handleDownload | Function | Domain-specific processing |
| handleFileSelect | Function | Domain-specific processing |
| handleUploadCancel | Function | Domain-specific processing |
| handleUploadConfirm | Function | Domain-specific processing |
| ProjectFilesPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| isActive | Function | Domain-specific processing |
| ProjectLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/members/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AddMemberDialog | Component/Class/Type Constructor | Creates new records/resources |
| confirmRemove | Function | Domain-specific processing |
| fetchProject | Function | Reads/query data |
| getRoleBadgeColor | Function | Reads/query data |
| getRoleLabel | Function | Reads/query data |
| handleSubmit | Function | Domain-specific processing |
| ProjectResourcesPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/notes/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchNotes | Function | Reads/query data |
| FileChip | Component/Class/Type Constructor | Domain-specific processing |
| formatFileSize | Function | Transforms data shape/format |
| getFileIcon | Function | Reads/query data |
| getInitials | Function | Reads/query data |
| handleDownload | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| insertFileRef | Function | Creates new records/resources |
| loadProjectFiles | Function | Domain-specific processing |
| openFilePicker | Function | Domain-specific processing |
| PrivateNotes | Component/Class/Type Constructor | Domain-specific processing |
| ProjectNotesPage | Component/Class/Type Constructor | Domain-specific processing |
| renderContent | Function | UI rendering and interaction |

## crm-fe-main/src/app/(projects)/projects/[id]/overview/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchData | Function | Reads/query data |
| ProjectOverviewPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ProjectRootPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/reminders/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| getReminderLabel | Function | Reads/query data |
| ProjectRemindersPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/settings/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleDelete | Function | Domain-specific processing |
| handleSave | Function | Domain-specific processing |
| ProjectSettingsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/tasks/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ProjectTasksPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/[id]/team/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| LegacyTeamPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/activity/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| formatActivityDescription | Function | Transforms data shape/format |
| getActionIcon | Function | Reads/query data |
| ProjectActivityPage | Component/Class/Type Constructor | Domain-specific processing |
| toggleExpanded | Function | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/analytics/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchStats | Function | Reads/query data |
| getInitials | Function | Reads/query data |
| ProjectAnalyticsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/calendar/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| CreateTaskModal | Component/Class/Type Constructor | Creates new records/resources |
| dateToKey | Function | Domain-specific processing |
| DayColumn | Component/Class/Type Constructor | Domain-specific processing |
| EventCard | Component/Class/Type Constructor | Domain-specific processing |
| getProjectColorClass | Function | Reads/query data |
| goBack | Function | Domain-specific processing |
| goForward | Function | Domain-specific processing |
| goToday | Function | Domain-specific processing |
| handleCreate | Function | Domain-specific processing |
| handleDragStart | Function | Domain-specific processing |
| handleDrop | Function | Domain-specific processing |
| ProjectCalendarPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/members/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchData | Function | Reads/query data |
| filterMembers | Function | Domain-specific processing |
| filterProjects | Function | Domain-specific processing |
| getInitials | Function | Reads/query data |
| getRoleConfig | Function | Reads/query data |
| getRoleLabel | Function | Reads/query data |
| GlobalMembersPage | Component/Class/Type Constructor | Domain-specific processing |
| renderMemberCard | Function | UI rendering and interaction |
| upsert | Function | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/my-projects/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchProjects | Function | Reads/query data |
| MyProjectsPage | Component/Class/Type Constructor | Domain-specific processing |
| ProjectCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/my-tasks/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| fetchTasks | Function | Reads/query data |
| handleCreateTask | Function | Domain-specific processing |
| handleStatusChange | Function | Domain-specific processing |
| MyTasksPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/notes/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| GlobalNotesPage | Component/Class/Type Constructor | Domain-specific processing |
| stripFileRefs | Function | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| clearFilters | Function | Domain-specific processing |
| fetchProjects | Function | Reads/query data |
| filterByStatus | Function | Domain-specific processing |
| getInitials | Function | Reads/query data |
| ProjectsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/tasks/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| NewProjectTaskPage | Component/Class/Type Constructor | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/tasks/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ProjectTasksPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(projects)/projects/team/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| LegacyTeamPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| SalesError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| SalesLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/analytics/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AnalyticsSkeleton | Component/Class/Type Constructor | Domain-specific processing |
| applyPreset | Function | Domain-specific processing |
| buildPresetDate | Function | Domain-specific processing |
| EmptyState | Component/Class/Type Constructor | Domain-specific processing |
| fmtCurrency | Function | Domain-specific processing |
| initDateFromUrl | Function | Domain-specific processing |
| loadFilters | Function | Domain-specific processing |
| MetricCard | Component/Class/Type Constructor | Domain-specific processing |
| normalizeActivity | Function | Domain-specific processing |
| normalizeOverview | Function | Domain-specific processing |
| normalizeTeams | Function | Domain-specific processing |
| normalizeUsers | Function | Domain-specific processing |
| normalizeUserWise | Function | Domain-specific processing |
| PieLegendChart | Component/Class/Type Constructor | Domain-specific processing |
| readUrlParam | Function | Domain-specific processing |
| SalesAnalyticsPage | Component/Class/Type Constructor | Domain-specific processing |
| SectionLabel | Component/Class/Type Constructor | Domain-specific processing |
| SummaryBadge | Component/Class/Type Constructor | Domain-specific processing |
| toNumber | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/duplicate-leads/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| DuplicateLeadsPage | Component/Class/Type Constructor | Domain-specific processing |
| getLeadHref | Function | Reads/query data |

## crm-fe-main/src/app/(sales)/sales/leads/[id]/edit/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EditLeadPage | Component/Class/Type Constructor | Updates existing records/resources |

## crm-fe-main/src/app/(sales)/sales/leads/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| CommentItem | Component/Class/Type Constructor | Domain-specific processing |
| CommentsPanel | Component/Class/Type Constructor | Domain-specific processing |
| formatActivityDescription | Function | Transforms data shape/format |
| formatValue | Function | Transforms data shape/format |
| handleAddComment | Function | Domain-specific processing |
| handleAssign | Function | Domain-specific processing |
| handleDeleteComment | Function | Domain-specific processing |
| handleMarkReminderDone | Function | Domain-specific processing |
| handleNlaCancel | Function | Domain-specific processing |
| handleNlaSubmit | Function | Domain-specific processing |
| handleSaveClientResponse | Function | Domain-specific processing |
| handleSaveCountry | Function | Domain-specific processing |
| handleSaveNalReason | Function | Domain-specific processing |
| handleSaveTimezone | Function | Domain-specific processing |
| handleStatusChange | Function | Domain-specific processing |
| handleUpdateComment | Function | Domain-specific processing |
| isReminderOverdue | Function | Domain-specific processing |
| LeadDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| LeadDetailSkeleton | Component/Class/Type Constructor | Domain-specific processing |
| performStatusChange | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/leads/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| NewLeadPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/leads/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| clearSelection | Function | Domain-specific processing |
| getLeadsByStatus | Function | Reads/query data |
| getTotalCountByStatus | Function | Reads/query data |
| handleBulkAssign | Function | Domain-specific processing |
| handleDragEnd | Function | Domain-specific processing |
| handleNalCancel | Function | Domain-specific processing |
| handleNalConfirm | Function | Domain-specific processing |
| handleReassign | Function | Domain-specific processing |
| LeadsPage | Component/Class/Type Constructor | Domain-specific processing |
| loadMoreForStatus | Function | Domain-specific processing |
| openReassignDialog | Function | UI rendering and interaction |
| performStatusUpdate | Function | Domain-specific processing |
| renderCell | Function | UI rendering and interaction |
| toggleColumn | Function | Domain-specific processing |
| toggleSelect | Function | Domain-specific processing |
| toggleSelectAll | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| loadScopeContext | Function | Domain-specific processing |
| PageSkeleton | Component/Class/Type Constructor | Domain-specific processing |
| run | Function | Domain-specific processing |
| SalesDashboardPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/tasks/[id]/edit/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EditTaskPage | Component/Class/Type Constructor | Updates existing records/resources |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/tasks/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handlePostComment | Function | Domain-specific processing |
| handleStatusChange | Function | Domain-specific processing |
| isOverdue | Function | Domain-specific processing |
| TaskDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| TaskDetailSkeleton | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/tasks/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| NewTaskPage | Component/Class/Type Constructor | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/tasks/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| isOverdue | Function | Domain-specific processing |
| TasksPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/teams/[id]/add-member/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AddMemberPage | Component/Class/Type Constructor | Creates new records/resources |
| handleAddMember | Function | Domain-specific processing |
| handleSelectUser | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/teams/[id]/edit/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| EditTeamPage | Component/Class/Type Constructor | Updates existing records/resources |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/teams/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleRemoveMember | Function | Domain-specific processing |
| TeamDetailPage | Component/Class/Type Constructor | Domain-specific processing |
| TeamDetailSkeleton | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/teams/new/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| loadData | Function | Domain-specific processing |
| NewTeamPage | Component/Class/Type Constructor | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(sales)/sales/teams/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| getInitials | Function | Reads/query data |
| handleDelete | Function | Domain-specific processing |
| TeamsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/activity/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ActivityPage | Component/Class/Type Constructor | Domain-specific processing |
| formatActivityDescription | Function | Transforms data shape/format |
| getDateKey | Function | Reads/query data |
| getDateLabel | Function | Reads/query data |
| getDateRange | Function | Reads/query data |
| getEntityGroupId | Function | Reads/query data |
| getEntityLabel | Function | Reads/query data |
| isDateAccordionRange | Function | Domain-specific processing |
| isLeadUpdate | Function | Domain-specific processing |
| isProjectModification | Function | Domain-specific processing |
| isTaskCompletion | Function | Domain-specific processing |
| isUserLogin | Function | Authentication/authorization handling |
| matchesQuickFilter | Function | Domain-specific processing |
| renderActivityItem | Function | UI rendering and interaction |
| renderTimelineActivityItem | Function | UI rendering and interaction |
| ScrollAnchor | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/attendance/[userId]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| deriveDayStatus | Function | Domain-specific processing |
| getInitials | Function | Reads/query data |
| handleAdminRestore | Function | Domain-specific processing |
| listDates | Function | Reads/query data |
| safeSessionHours | Function | Domain-specific processing |
| UserAttendancePage | Component/Class/Type Constructor | Custom hook encapsulating state/data logic |

## crm-fe-main/src/app/(shared)/attendance/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| AttendancePage | Component/Class/Type Constructor | Domain-specific processing |
| handleClockIn | Function | Domain-specific processing |
| handleClockOut | Function | Domain-specific processing |
| navigateMyHistoryMonth | Function | Domain-specific processing |
| updateTimer | Function | Updates existing records/resources |
| weeklyTooltip | Function | Domain-specific processing |

## crm-fe-main/src/app/(shared)/calendar/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| CreateEventModal | Component/Class/Type Constructor | Creates new records/resources |
| getInitials | Function | Reads/query data |
| GlobalCalendarPage | Component/Class/Type Constructor | Domain-specific processing |
| goBack | Function | Domain-specific processing |
| goForward | Function | Domain-specific processing |
| goToday | Function | Domain-specific processing |
| handleComplete | Function | Domain-specific processing |
| handleCreate | Function | Domain-specific processing |
| handleDelete | Function | Domain-specific processing |
| handleEventClick | Function | Domain-specific processing |
| handleOpenFull | Function | Domain-specific processing |
| ViewEventModal | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/app/(shared)/components/TeamDiscussion.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| getInitials | Function | Reads/query data |
| getSortedNotes | Function | Reads/query data |
| handleCreateNote | Function | Domain-specific processing |
| handleTogglePin | Function | Domain-specific processing |
| TeamDiscussion | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/documents/my-documents/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| formatDate | Function | Transforms data shape/format |
| loadData | Function | Domain-specific processing |
| MyDocumentsPage | Component/Class/Type Constructor | Domain-specific processing |
| resetUpload | Function | Domain-specific processing |
| submitUpload | Function | Domain-specific processing |

## crm-fe-main/src/app/(shared)/email/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| clearSelection | Function | Domain-specific processing |
| EmailComposePage | Component/Class/Type Constructor | Communication/notification handling |
| handleSend | Function | Communication/notification handling |
| selectAll | Function | Domain-specific processing |
| toggleLead | Function | Domain-specific processing |

## crm-fe-main/src/app/(shared)/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| SharedError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| SharedLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/notifications/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| handleDelete | Function | Domain-specific processing |
| handleMarkAllRead | Function | Domain-specific processing |
| handleMarkAsRead | Function | Domain-specific processing |
| handleNavigateToEntity | Function | Domain-specific processing |
| hasLink | Function | Domain-specific processing |
| isLinkedNotification | Function | Domain-specific processing |
| NotificationsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/performance/my-review/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| acknowledge | Function | Domain-specific processing |
| load | Function | Domain-specific processing |
| MyPerformanceReviewPage | Component/Class/Type Constructor | Domain-specific processing |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/app/(shared)/performance/peer-feedback/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| openForm | Function | Domain-specific processing |
| PeerFeedbackPage | Component/Class/Type Constructor | Domain-specific processing |
| submitAllDimensions | Function | Domain-specific processing |

## crm-fe-main/src/app/(shared)/reminders/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| getInitials | Function | Reads/query data |
| RemindersPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/settings/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| SettingsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/settings/password/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| ChangePasswordPage | Component/Class/Type Constructor | Domain-specific processing |
| handleRequestOTP | Function | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/app/(shared)/tasks/[id]/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| TaskDetailsPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/(shared)/tasks/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| GlobalTasksPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/error.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| GlobalError | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/forbidden.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| Forbidden | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/layout.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| RootLayout | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/not-found.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| NotFound | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/app/page.tsx

**File role:** Next.js route page/layout/error boundary

| Symbol | Kind | Purpose |
|---|---|---|
| RootPage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/auth/login-notice-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| LoginNoticeDialog | Component/Class/Type Constructor | Authentication/authorization handling |

## crm-fe-main/src/components/calendar/calendar-primitives.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| dateToKey | Function | Domain-specific processing |
| DayColumn | Component/Class/Type Constructor | Domain-specific processing |
| EventCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/activity-feed.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ActivityFeed | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/attendance-widget.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AttendanceWidget | Component/Class/Type Constructor | Domain-specific processing |
| handleClockIn | Function | Domain-specific processing |
| handleClockOut | Function | Domain-specific processing |
| updateTimer | Function | Updates existing records/resources |

## crm-fe-main/src/components/dashboard/charts.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CustomTooltip | Component/Class/Type Constructor | Domain-specific processing |
| LeadPipelineChart | Component/Class/Type Constructor | Domain-specific processing |
| LeadSourceChart | Component/Class/Type Constructor | Domain-specific processing |
| TrendChart | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/high-priority-section.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| HighPrioritySection | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/index.ts

**File role:** Reusable UI or domain components

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/components/dashboard/mini-stats-card.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| MiniStatsCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/recent-leads-list.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| RecentLeadsList | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/stats-card.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| StatsCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/today-reminders.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| handleMarkDone | Function | Domain-specific processing |
| isOverdue | Function | Domain-specific processing |
| TodayReminders | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/top-performers.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| getInitials | Function | Reads/query data |
| TopPerformers | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/dashboard/trend-charts.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CustomTooltip | Component/Class/Type Constructor | Domain-specific processing |
| DepartmentPerformanceChart | Component/Class/Type Constructor | Domain-specific processing |
| LeadTrendChart | Component/Class/Type Constructor | Domain-specific processing |
| ProjectStatusChart | Component/Class/Type Constructor | Domain-specific processing |
| RevenueTrendChart | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/DeleteDocumentDialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| confirmDelete | Function | Domain-specific processing |
| DeleteDocumentDialog | Component/Class/Type Constructor | Deletes records/resources |

## crm-fe-main/src/components/hr/documents/document-utils.ts

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| formatDocDate | Function | Transforms data shape/format |
| isAllowedUploadFile | Function | Domain-specific processing |
| slugToLabel | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/DocumentKPICards.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DocumentKPICards | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/DocumentRow.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DocumentRow | Component/Class/Type Constructor | Domain-specific processing |
| openFile | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/DocumentsListTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DocumentsListTab | Component/Class/Type Constructor | Domain-specific processing |
| doRefresh | Function | Domain-specific processing |
| empDept | Function | Domain-specific processing |
| empName | Function | Domain-specific processing |
| handleRejectConfirm | Function | Domain-specific processing |
| handleVerify | Function | Domain-specific processing |
| openRejectDialog | Function | UI rendering and interaction |
| toggleEmployee | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/DocumentTypeModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DocumentTypeModal | Component/Class/Type Constructor | UI rendering and interaction |
| slugify | Function | Domain-specific processing |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/DocumentTypesTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DocumentTypesTab | Component/Class/Type Constructor | Domain-specific processing |
| runToggle | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/EditDocumentModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EditDocumentModal | Component/Class/Type Constructor | Updates existing records/resources |
| save | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/EmployeeDocumentStatus.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CellIcon | Component/Class/Type Constructor | Domain-specific processing |
| cellStateForSlug | Function | Domain-specific processing |
| empDept | Function | Domain-specific processing |
| EmployeeDocumentStatus | Component/Class/Type Constructor | Domain-specific processing |
| empName | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/documents/UploadDocumentModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| onDrop | Function | Domain-specific processing |
| submit | Function | Domain-specific processing |
| UploadDocumentModal | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/hr/employees/AddEmployeeModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AddEmployeeModal | Component/Class/Type Constructor | Creates new records/resources |
| copyPw | Function | Domain-specific processing |
| generatePassword | Function | Domain-specific processing |
| pick | Function | Domain-specific processing |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/BulkActionsBar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| BulkActionsBar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/BulkEditTable.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| applyDepartmentChange | Function | Domain-specific processing |
| applyFillToRange | Function | Domain-specific processing |
| BulkEditTable | Component/Class/Type Constructor | Domain-specific processing |
| focusNumericCell | Function | Domain-specific processing |
| formatWithCommas | Function | Transforms data shape/format |
| handleNumericArrowNavigation | Function | Domain-specific processing |
| handleSave | Function | Domain-specific processing |
| isCellInFillRange | Function | Domain-specific processing |
| maybeStartFillDragFromCorner | Function | Domain-specific processing |
| normalizeNumberText | Function | Domain-specific processing |
| onMouseMove | Function | Domain-specific processing |
| onMouseUp | Function | Domain-specific processing |
| renderFillHandle | Function | UI rendering and interaction |
| setNumericCellRef | Function | Domain-specific processing |
| startFillDrag | Function | Domain-specific processing |
| tick | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/CompensationHistoryExpand.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CompensationHistoryExpand | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/DeactivateConfirmDialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ActivateConfirmDialog | Component/Class/Type Constructor | UI rendering and interaction |
| DeactivateConfirmDialog | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/hr/employees/detail/EmployeeActivityTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeActivityTab | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/detail/EmployeeCompensationTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeCompensationTab | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/detail/EmployeeDetailDrawer.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeDetailDrawer | Component/Class/Type Constructor | Domain-specific processing |
| initials | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/detail/EmployeeDocumentsTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeDocumentsTab | Component/Class/Type Constructor | Domain-specific processing |
| unwrapDocs | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/detail/EmployeeLeaveSummaryTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeLeaveSummaryTab | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/detail/EmployeeOverviewTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| copy | Function | Domain-specific processing |
| EmployeeOverviewTab | Component/Class/Type Constructor | Domain-specific processing |
| save | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/detail/EmployeePerformanceTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeePerformanceTab | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/EmployeeKPICards.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeKPICards | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/EmployeeSearchFilters.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| clearAll | Function | Domain-specific processing |
| EmployeeSearchFilters | Component/Class/Type Constructor | Domain-specific processing |
| filterEmployeesList | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/EmployeeTable.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeTable | Component/Class/Type Constructor | Domain-specific processing |
| sortMark | Function | Domain-specific processing |
| toggleSort | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/employees/EmployeeTableRow.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmployeeTableRow | Component/Class/Type Constructor | Domain-specific processing |
| initials | Function | Domain-specific processing |
| roleBadge | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/hr-team-leave-calendar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| goBack | Function | Domain-specific processing |
| goForward | Function | Domain-specific processing |
| goToday | Function | Domain-specific processing |
| HRTeamLeaveCalendar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/AllRequestsTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AllRequestsTab | Component/Class/Type Constructor | Domain-specific processing |
| empDept | Function | Domain-specific processing |
| empTitle | Function | Domain-specific processing |
| onApprove | Function | Domain-specific processing |
| onRejectConfirm | Function | Domain-specific processing |
| toastErr | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/CreateLeaveModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CreateLeaveModal | Component/Class/Type Constructor | Creates new records/resources |
| empDeptId | Function | Domain-specific processing |
| empDeptName | Function | Domain-specific processing |
| empTeamId | Function | Domain-specific processing |
| empTeamName | Function | Domain-specific processing |
| normName | Function | Domain-specific processing |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/LeaveDetailDrawer.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| initials | Function | Domain-specific processing |
| LeaveDetailDrawer | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/LeaveKPICards.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| LeaveKPICards | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/LeaveRequestCard.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| initials | Function | Domain-specific processing |
| LeaveRequestCard | Component/Class/Type Constructor | Domain-specific processing |
| typeColor | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/LeaveTypeModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| LeaveTypeModal | Component/Class/Type Constructor | UI rendering and interaction |
| save | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/PendingApprovalsTab.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| bulkApprove | Function | Domain-specific processing |
| handleApprove | Function | Domain-specific processing |
| handleRejectConfirm | Function | Domain-specific processing |
| PendingApprovalsTab | Component/Class/Type Constructor | Domain-specific processing |
| toastApiError | Function | Domain-specific processing |

## crm-fe-main/src/components/hr/leaves/RejectLeaveModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| RejectLeaveModal | Component/Class/Type Constructor | UI rendering and interaction |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/layout/app-shell.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AppShell | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/layout/department-switcher.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DepartmentSwitcher | Component/Class/Type Constructor | Domain-specific processing |
| getCurrentIcon | Function | Reads/query data |
| getCurrentLabel | Function | Reads/query data |

## crm-fe-main/src/components/layout/header.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| getInitials | Function | Reads/query data |
| handleRefresh | Function | Domain-specific processing |
| handleThemeToggle | Function | Domain-specific processing |
| Header | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/layout/index.ts

**File role:** Reusable UI or domain components

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/components/layout/mobile-sidebar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| MobileSidebar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/layout/sidebar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DepartmentDropdown | Component/Class/Type Constructor | Domain-specific processing |
| filterNav | Function | Domain-specific processing |
| getInitials | Function | Reads/query data |
| GlobalSidebar | Component/Class/Type Constructor | Domain-specific processing |
| handleDepartmentsOpenChange | Function | Domain-specific processing |
| handleOpenChange | Function | Domain-specific processing |
| NavLink | Component/Class/Type Constructor | Domain-specific processing |
| Sidebar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/leads/bulk-edit-leads-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| BulkEditLeadsDialog | Component/Class/Type Constructor | UI rendering and interaction |
| handleClose | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| resetForm | Function | Domain-specific processing |

## crm-fe-main/src/components/leads/export-leads-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ExportLeadsDialog | Component/Class/Type Constructor | UI rendering and interaction |
| handleExport | Function | Domain-specific processing |

## crm-fe-main/src/components/leads/import-leads-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| actionColor | Function | Domain-specific processing |
| actionIcon | Function | Domain-specific processing |
| clearFile | Function | Domain-specific processing |
| handleCheckDuplicates | Function | Domain-specific processing |
| handleFileSelect | Function | Domain-specific processing |
| handleImport | Function | Domain-specific processing |
| ImportLeadsDialog | Component/Class/Type Constructor | UI rendering and interaction |
| setRowAction | Function | Domain-specific processing |

## crm-fe-main/src/components/leads/lead-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| LeadForm | Component/Class/Type Constructor | Domain-specific processing |
| normalizeWebsite | Function | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |
| sanitize | Function | Domain-specific processing |

## crm-fe-main/src/components/leads/lead-reminder-widget.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| checkReminders | Function | Domain-specific processing |
| getApiErrorMessage | Function | Reads/query data |
| handleCreate | Function | Domain-specific processing |
| handleCreateReminder | Function | Domain-specific processing |
| handleDeleteReminder | Function | Domain-specific processing |
| handleMarkDone | Function | Domain-specific processing |
| isOverdue | Function | Domain-specific processing |
| LeadReminderWidget | Component/Class/Type Constructor | Domain-specific processing |
| refreshReminderList | Function | Domain-specific processing |
| resetForm | Function | Domain-specific processing |
| SetReminderButton | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/notifications/notifications-popover.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| NotificationIcon | Component/Class/Type Constructor | Domain-specific processing |
| NotificationsPopover | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/notifications/reminders-popover.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| LeadReminderItem | Component/Class/Type Constructor | Domain-specific processing |
| ReminderItem | Component/Class/Type Constructor | Domain-specific processing |
| RemindersPopover | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/notifications/startup-alerts-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| LeadReminderItem | Component/Class/Type Constructor | Domain-specific processing |
| ReminderItem | Component/Class/Type Constructor | Domain-specific processing |
| StartupAlertsDialog | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/payroll/correction-run-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CorrectionRunModal | Component/Class/Type Constructor | UI rendering and interaction |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/create-increment-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CreateIncrementModal | Component/Class/Type Constructor | Creates new records/resources |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/department-cost-bar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DepartmentCostBar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/payroll/disburse-confirm-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DisburseConfirmDialog | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/payroll/edit-payroll-record-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EditPayrollRecordModal | Component/Class/Type Constructor | Updates existing records/resources |
| num | Function | Domain-specific processing |
| save | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/initiate-run-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| currentYm | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| InitiateRunModal | Component/Class/Type Constructor | UI rendering and interaction |
| toggleListValue | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/payroll-analytics-widget.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| PayrollAnalyticsWidget | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/payroll/payroll-records-table.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| PayrollRecordsTable | Component/Class/Type Constructor | Domain-specific processing |
| toggleSort | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/payroll-run-table-row.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| PayrollRunTableRow | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/payroll/payslip-view.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| PayslipView | Component/Class/Type Constructor | Domain-specific processing |
| printPayslip | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/quick-fix-missing-ctc-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| matchesJobTitle | Function | Domain-specific processing |
| QuickFixMissingCTCModal | Component/Class/Type Constructor | UI rendering and interaction |
| submit | Function | Domain-specific processing |
| toggleSelectAllVisible | Function | Domain-specific processing |
| toIsoDate | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/salary-band-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| isPctTemplate | Function | Domain-specific processing |
| SalaryBandModal | Component/Class/Type Constructor | UI rendering and interaction |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/payroll/set-ctc-for-employee-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| parseNumber | Function | Domain-specific processing |
| SetCTCForEmployeeModal | Component/Class/Type Constructor | UI rendering and interaction |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/performance/CalibrationModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CalibrationModal | Component/Class/Type Constructor | UI rendering and interaction |
| defaultRating | Function | Domain-specific processing |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/performance/GoalBuilderModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| GoalBuilderModal | Component/Class/Type Constructor | UI rendering and interaction |
| submit | Function | Domain-specific processing |

## crm-fe-main/src/components/performance/ManagerReviewModal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| doSubmit | Function | Domain-specific processing |
| ManagerReviewModal | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/performance/PeerFeedbackRadar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| PeerFeedbackRadar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/performance/PerformanceAnalytics.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CyclePerformanceAnalytics | Component/Class/Type Constructor | Domain-specific processing |
| HRPerformanceDashboardWidgets | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/performance/PIPNotification.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| PIPNotification | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/performance/RatingDisplay.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| RatingDisplay | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/performance/ReleaseConfirmDialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ReleaseConfirmDialog | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/performance/ReviewCycleCard.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| freqLabel | Function | Domain-specific processing |
| ReviewCycleCard | Component/Class/Type Constructor | Domain-specific processing |
| scopeLabel | Function | Domain-specific processing |

## crm-fe-main/src/components/performance/ReviewDetailPanel.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ManagerReviewView | Component/Class/Type Constructor | Domain-specific processing |
| ReviewDetailPanel | Component/Class/Type Constructor | Domain-specific processing |
| SelfAssessmentView | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/performance/StatusTracker.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| peerStepDone | Function | Domain-specific processing |
| StatusTracker | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/projects/create-project-modal.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CreateProjectModal | Component/Class/Type Constructor | Creates new records/resources |
| handleRemove | Function | Domain-specific processing |
| handleSelect | Function | Domain-specific processing |
| MultiSelectField | Component/Class/Type Constructor | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/components/projects/create-task-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| CreateTaskDialog | Component/Class/Type Constructor | Creates new records/resources |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/components/projects/project-card.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| getPriorityColor | Function | Reads/query data |
| getStatusColor | Function | Reads/query data |
| ProjectCard | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/projects/project-notes.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| canPin | Function | Domain-specific processing |
| FileChip | Component/Class/Type Constructor | Domain-specific processing |
| formatDayLabel | Function | Transforms data shape/format |
| formatFileSize | Function | Transforms data shape/format |
| getFileIcon | Function | Reads/query data |
| getInitials | Function | Reads/query data |
| handleDownload | Function | Domain-specific processing |
| handleScroll | Function | Domain-specific processing |
| handleSubmit | Function | Domain-specific processing |
| insertFileRef | Function | Creates new records/resources |
| insertMentionRef | Function | Creates new records/resources |
| isOwnMessage | Function | Domain-specific processing |
| loadProjectFiles | Function | Domain-specific processing |
| openFilePicker | Function | Domain-specific processing |
| openMentionPicker | Function | Domain-specific processing |
| ProjectNotes | Component/Class/Type Constructor | Domain-specific processing |
| renderNoteContent | Function | UI rendering and interaction |
| scrollToBottom | Function | Domain-specific processing |
| togglePin | Function | Domain-specific processing |

## crm-fe-main/src/components/projects/project-tasks-list.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| fetchTasks | Function | Reads/query data |
| ProjectTasksList | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/search/global-search.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| down | Function | Domain-specific processing |
| GlobalSearch | Component/Class/Type Constructor | Domain-specific processing |
| handleSelect | Function | Domain-specific processing |

## crm-fe-main/src/components/settings/appearance-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AppearanceForm | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/settings/email-settings-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmailSettingsForm | Component/Class/Type Constructor | Communication/notification handling |
| handleDelete | Function | Domain-specific processing |
| handleEmailTypeChange | Function | Communication/notification handling |
| handleTest | Function | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |

## crm-fe-main/src/components/settings/notifications-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| handleToggle | Function | Domain-specific processing |
| NotificationsForm | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/settings/profile-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| handleAvatarClick | Function | Domain-specific processing |
| handleFileChange | Function | Domain-specific processing |
| onSubmit | Function | Domain-specific processing |
| ProfileForm | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/settings/security-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| copySecret | Function | Domain-specific processing |
| handleDisable2FA | Function | Domain-specific processing |
| handleSetup2FA | Function | Domain-specific processing |
| handleVerify2FA | Function | Domain-specific processing |
| onRequestOTP | Function | Domain-specific processing |
| onSubmitPassword | Function | Domain-specific processing |
| SecurityForm | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/settings/team-members-form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| fetchAvailableUsers | Function | Reads/query data |
| fetchTeamMembers | Function | Reads/query data |
| fetchTeams | Function | Reads/query data |
| handleAddMember | Function | Domain-specific processing |
| handleRefresh | Function | Domain-specific processing |
| handleRemoveMember | Function | Domain-specific processing |
| TeamMembersForm | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/shared/empty-state.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| EmptyState | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/shared/user-selector.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| UserSelector | Component/Class/Type Constructor | Custom hook encapsulating state/data logic |

## crm-fe-main/src/components/ui/alert-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AlertDialog | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogAction | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogCancel | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogContent | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogDescription | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogFooter | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogHeader | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogOverlay | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogPortal | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogTitle | Component/Class/Type Constructor | UI rendering and interaction |
| AlertDialogTrigger | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/ui/alert.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Alert | Component/Class/Type Constructor | Domain-specific processing |
| AlertDescription | Component/Class/Type Constructor | Domain-specific processing |
| AlertTitle | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/avatar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Avatar | Component/Class/Type Constructor | Domain-specific processing |
| AvatarFallback | Component/Class/Type Constructor | Domain-specific processing |
| AvatarImage | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/badge.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Badge | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/button.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Button | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/calendar.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Calendar | Component/Class/Type Constructor | Domain-specific processing |
| CalendarDayButton | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/card.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Card | Component/Class/Type Constructor | Domain-specific processing |
| CardAction | Component/Class/Type Constructor | Domain-specific processing |
| CardContent | Component/Class/Type Constructor | Domain-specific processing |
| CardDescription | Component/Class/Type Constructor | Domain-specific processing |
| CardFooter | Component/Class/Type Constructor | Domain-specific processing |
| CardHeader | Component/Class/Type Constructor | Domain-specific processing |
| CardTitle | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/checkbox.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Checkbox | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/collapsible.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Collapsible | Component/Class/Type Constructor | Domain-specific processing |
| CollapsibleContent | Component/Class/Type Constructor | Domain-specific processing |
| CollapsibleTrigger | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/command.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Command | Component/Class/Type Constructor | Domain-specific processing |
| CommandDialog | Component/Class/Type Constructor | UI rendering and interaction |
| CommandEmpty | Component/Class/Type Constructor | Domain-specific processing |
| CommandGroup | Component/Class/Type Constructor | Domain-specific processing |
| CommandInput | Component/Class/Type Constructor | Domain-specific processing |
| CommandItem | Component/Class/Type Constructor | Domain-specific processing |
| CommandList | Component/Class/Type Constructor | Domain-specific processing |
| CommandSeparator | Component/Class/Type Constructor | Domain-specific processing |
| CommandShortcut | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/confirm-dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ConfirmDialog | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/ui/dialog.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Dialog | Component/Class/Type Constructor | UI rendering and interaction |
| DialogClose | Component/Class/Type Constructor | UI rendering and interaction |
| DialogContent | Component/Class/Type Constructor | UI rendering and interaction |
| DialogDescription | Component/Class/Type Constructor | UI rendering and interaction |
| DialogFooter | Component/Class/Type Constructor | UI rendering and interaction |
| DialogHeader | Component/Class/Type Constructor | UI rendering and interaction |
| DialogOverlay | Component/Class/Type Constructor | UI rendering and interaction |
| DialogPortal | Component/Class/Type Constructor | UI rendering and interaction |
| DialogTitle | Component/Class/Type Constructor | UI rendering and interaction |
| DialogTrigger | Component/Class/Type Constructor | UI rendering and interaction |

## crm-fe-main/src/components/ui/dropdown-menu.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| DropdownMenu | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuCheckboxItem | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuContent | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuGroup | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuItem | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuLabel | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuPortal | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuRadioGroup | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuRadioItem | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuSeparator | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuShortcut | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuSub | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuSubContent | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuSubTrigger | Component/Class/Type Constructor | Domain-specific processing |
| DropdownMenuTrigger | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/form.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| FormControl | Component/Class/Type Constructor | Domain-specific processing |
| FormDescription | Component/Class/Type Constructor | Domain-specific processing |
| FormItem | Component/Class/Type Constructor | Domain-specific processing |
| FormLabel | Component/Class/Type Constructor | Domain-specific processing |
| FormMessage | Component/Class/Type Constructor | Domain-specific processing |
| useFormField | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/components/ui/hover-card.tsx

**File role:** Reusable UI or domain components

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/components/ui/input-otp.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| InputOTP | Component/Class/Type Constructor | Domain-specific processing |
| InputOTPGroup | Component/Class/Type Constructor | Domain-specific processing |
| InputOTPSeparator | Component/Class/Type Constructor | Domain-specific processing |
| InputOTPSlot | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/input.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Input | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/label.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Label | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/password-input.tsx

**File role:** Reusable UI or domain components

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/components/ui/permission-gate.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| AllPermissionsGate | Component/Class/Type Constructor | Domain-specific processing |
| AnyPermissionGate | Component/Class/Type Constructor | Domain-specific processing |
| PermissionGate | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/popover.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Popover | Component/Class/Type Constructor | Domain-specific processing |
| PopoverAnchor | Component/Class/Type Constructor | Domain-specific processing |
| PopoverContent | Component/Class/Type Constructor | Domain-specific processing |
| PopoverTrigger | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/progress.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Progress | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/scroll-area.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| ScrollArea | Component/Class/Type Constructor | Domain-specific processing |
| ScrollBar | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/select.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Select | Component/Class/Type Constructor | Domain-specific processing |
| SelectContent | Component/Class/Type Constructor | Domain-specific processing |
| SelectGroup | Component/Class/Type Constructor | Domain-specific processing |
| SelectItem | Component/Class/Type Constructor | Domain-specific processing |
| SelectLabel | Component/Class/Type Constructor | Domain-specific processing |
| SelectScrollDownButton | Component/Class/Type Constructor | Domain-specific processing |
| SelectScrollUpButton | Component/Class/Type Constructor | Domain-specific processing |
| SelectSeparator | Component/Class/Type Constructor | Domain-specific processing |
| SelectTrigger | Component/Class/Type Constructor | Domain-specific processing |
| SelectValue | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/separator.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Separator | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/sheet.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Sheet | Component/Class/Type Constructor | Domain-specific processing |
| SheetClose | Component/Class/Type Constructor | Domain-specific processing |
| SheetContent | Component/Class/Type Constructor | Domain-specific processing |
| SheetDescription | Component/Class/Type Constructor | Domain-specific processing |
| SheetFooter | Component/Class/Type Constructor | Domain-specific processing |
| SheetHeader | Component/Class/Type Constructor | Domain-specific processing |
| SheetOverlay | Component/Class/Type Constructor | Domain-specific processing |
| SheetPortal | Component/Class/Type Constructor | Domain-specific processing |
| SheetTitle | Component/Class/Type Constructor | Domain-specific processing |
| SheetTrigger | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/skeleton.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Skeleton | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/sonner.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Toaster | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/switch.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Switch | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/table.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Table | Component/Class/Type Constructor | Domain-specific processing |
| TableBody | Component/Class/Type Constructor | Domain-specific processing |
| TableCaption | Component/Class/Type Constructor | Domain-specific processing |
| TableCell | Component/Class/Type Constructor | Domain-specific processing |
| TableFooter | Component/Class/Type Constructor | Domain-specific processing |
| TableHead | Component/Class/Type Constructor | Domain-specific processing |
| TableHeader | Component/Class/Type Constructor | Domain-specific processing |
| TableRow | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/tabs.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Tabs | Component/Class/Type Constructor | Domain-specific processing |
| TabsContent | Component/Class/Type Constructor | Domain-specific processing |
| TabsList | Component/Class/Type Constructor | Domain-specific processing |
| TabsTrigger | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/components/ui/textarea.tsx

**File role:** Reusable UI or domain components

| Symbol | Kind | Purpose |
|---|---|---|
| Textarea | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/config/constants.ts

**File role:** Configuration constants and environment contracts

| Symbol | Kind | Purpose |
|---|---|---|
| getAllStatuses | Function | Reads/query data |

## crm-fe-main/src/hooks/use-header-refresh.ts

**File role:** Custom React hooks and data state abstraction

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/hooks/use-payroll.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| optimisticApprove | Function | Domain-specific processing |
| optimisticReject | Function | Domain-specific processing |
| useIncrements | Function | Custom hook encapsulating state/data logic |
| usePayrollAnalytics | Function | Custom hook encapsulating state/data logic |
| usePayrollRecords | Function | Custom hook encapsulating state/data logic |
| usePayrollRun | Function | Custom hook encapsulating state/data logic |
| usePayrollRuns | Function | Custom hook encapsulating state/data logic |
| usePayslips | Function | Custom hook encapsulating state/data logic |
| useSalaryBands | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/use-permission.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useAnyPermission | Function | Custom hook encapsulating state/data logic |
| usePermission | Function | Custom hook encapsulating state/data logic |
| usePermissions | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/useBulkEmployeeActions.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| activateOne | Function | Domain-specific processing |
| deactivateOne | Function | Domain-specific processing |
| useBulkDeactivate | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/useDocumentsList.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useDocumentsList | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/useDocumentStats.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useDocumentStats | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/useDocumentTypes.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useDocumentTypes | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/useEmployees.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useEmployees | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/useLeaveStats.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useLeaveStats | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/hooks/usePerformance.ts

**File role:** Custom React hooks and data state abstraction

| Symbol | Kind | Purpose |
|---|---|---|
| useCycleDetail | Function | Custom hook encapsulating state/data logic |
| useHRPerformanceAnalytics | Function | Custom hook encapsulating state/data logic |
| usePerformanceAnalytics | Function | Custom hook encapsulating state/data logic |
| usePerformanceReview | Function | Custom hook encapsulating state/data logic |
| useReviewCycles | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/lib/api-error.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| getApiErrorMessage | Function | Reads/query data |
| toastApiError | Function | Domain-specific processing |

## crm-fe-main/src/lib/api.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| processQueue | Function | Domain-specific processing |
| unwrap | Function | Domain-specific processing |

## crm-fe-main/src/lib/data-ownership.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| getDataOwner | Function | Reads/query data |

## crm-fe-main/src/lib/date-utils.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| formatDateIST | Function | Transforms data shape/format |
| formatDateTimeIST | Function | Transforms data shape/format |
| formatDistanceToNowIST | Function | Transforms data shape/format |
| formatFullDateIST | Function | Transforms data shape/format |
| formatHoursToReadable | Function | Transforms data shape/format |
| formatIST | Function | Transforms data shape/format |
| formatTimeIST | Function | Transforms data shape/format |
| getShiftAwareDateKeyIST | Function | Reads/query data |
| getShiftAwareDayBoundsISO | Function | Reads/query data |
| getShiftAwareTodayKeyIST | Function | Reads/query data |
| getShiftAwareYesterdayKeyIST | Function | Reads/query data |
| getTodayIST | Function | Reads/query data |
| nowIST | Function | Domain-specific processing |
| nowISTAsUTC | Function | Domain-specific processing |
| parseStoredIST | Function | Domain-specific processing |
| toIST | Function | Domain-specific processing |
| toLocaleDateStringIST | Function | Domain-specific processing |
| toLocaleStringIST | Function | Domain-specific processing |
| toLocaleTimeStringIST | Function | Domain-specific processing |

## crm-fe-main/src/lib/documentService.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| getAccessToken | Function | Reads/query data |
| openDocumentUrl | Function | Domain-specific processing |
| uploadHrDocument | Function | Domain-specific processing |

## crm-fe-main/src/lib/employeeHelpers.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| buildEmployeeCSV | Function | Domain-specific processing |
| canEditEmployees | Function | Domain-specific processing |
| canFetchCompensationHistory | Function | Domain-specific processing |
| canSeeFullCTC | Function | Domain-specific processing |
| canViewEmployees | Function | Domain-specific processing |
| employeeMatchesKpiPreset | Function | Domain-specific processing |
| escapeCsv | Function | Domain-specific processing |
| formatCTC | Function | Transforms data shape/format |
| formatINRRange | Function | Transforms data shape/format |
| formatJoinedDisplay | Function | Transforms data shape/format |
| normalizeHrStatus | Function | Domain-specific processing |
| pctChange | Function | Domain-specific processing |
| shiftBadgeClass | Function | Domain-specific processing |
| shiftLabel | Function | Domain-specific processing |
| statusBadgeClass | Function | Domain-specific processing |

## crm-fe-main/src/lib/finance-api.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| unwrap | Function | Domain-specific processing |

## crm-fe-main/src/lib/hr-document-api.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| createDocumentType | Function | Creates new records/resources |
| deleteDocument | Function | Deletes records/resources |
| fetchActiveDocumentTypesForSelf | Function | Reads/query data |
| fetchDocumentById | Function | Reads/query data |
| fetchDocuments | Function | Reads/query data |
| fetchDocumentStats | Function | Reads/query data |
| fetchDocumentTypes | Function | Reads/query data |
| fetchUserDocuments | Function | Reads/query data |
| rejectDocument | Function | Domain-specific processing |
| updateDocument | Function | Updates existing records/resources |
| updateDocumentType | Function | Updates existing records/resources |
| verifyDocument | Function | Domain-specific processing |

## crm-fe-main/src/lib/hr-employee-api.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| fetchEmployeeCompensationHistory | Function | Reads/query data |
| fetchHrEmployeeById | Function | Reads/query data |
| fetchHrEmployees | Function | Reads/query data |
| g | Function | Domain-specific processing |
| normalizeCompensationRow | Function | Domain-specific processing |
| unwrapArrayPayload | Function | Domain-specific processing |
| unwrapEmployeeList | Function | Domain-specific processing |
| unwrapSingleEmployee | Function | Domain-specific processing |
| updateHrEmployee | Function | Updates existing records/resources |

## crm-fe-main/src/lib/hr-error-toast.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| toastHrError | Function | Domain-specific processing |

## crm-fe-main/src/lib/hr-leave-api.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| approveLeave | Function | Domain-specific processing |
| createLeaveOnBehalf | Function | Creates new records/resources |
| createLeaveType | Function | Creates new records/resources |
| fetchApprovedLeavesForCalendar | Function | Reads/query data |
| fetchHrEmployees | Function | Reads/query data |
| fetchLeaveBalances | Function | Reads/query data |
| fetchLeaveRequests | Function | Reads/query data |
| fetchLeaveStats | Function | Reads/query data |
| fetchLeaveTypes | Function | Reads/query data |
| fetchLeaveTypesAdmin | Function | Reads/query data |
| fetchOnLeaveToday | Function | Reads/query data |
| fetchPendingLeaves | Function | Reads/query data |
| normalizeLeaveRequest | Function | Domain-specific processing |
| rejectLeave | Function | Domain-specific processing |
| updateLeaveType | Function | Updates existing records/resources |

## crm-fe-main/src/lib/hr-leave-utils.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| countWorkingDays | Function | Domain-specific processing |
| formatLeaveDate | Function | Transforms data shape/format |
| formatLeaveRelative | Function | Transforms data shape/format |
| leaveStatusBadgeClass | Function | Domain-specific processing |
| leaveStatusLabel | Function | Domain-specific processing |
| slugifyLeaveTypeName | Function | Domain-specific processing |
| urgencyForDate | Function | Domain-specific processing |

## crm-fe-main/src/lib/hr-scope.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| canAccessHRDashboard | Function | Domain-specific processing |
| getHRScopeProfile | Function | Reads/query data |
| hasAnyPermissionPrefix | Function | Domain-specific processing |
| hasRoleName | Function | Domain-specific processing |
| isAdminOrDirector | Function | Domain-specific processing |
| isHRManagerProfile | Function | Domain-specific processing |
| normalize | Function | Domain-specific processing |

## crm-fe-main/src/lib/kanban-contract.ts

**File role:** Shared utility/API integration layer

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/lib/lead-status-config.ts

**File role:** Shared utility/API integration layer

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/lib/payroll-client.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| approveIncrement | Function | Domain-specific processing |
| approvePayrollRun | Function | Domain-specific processing |
| createCorrectionRun | Function | Creates new records/resources |
| createSalaryBand | Function | Creates new records/resources |
| deleteSalaryBand | Function | Deletes records/resources |
| disbursePayrollRun | Function | Domain-specific processing |
| downloadPayslipPdf | Function | Domain-specific processing |
| fetchHrEmployees | Function | Reads/query data |
| fetchIncrementProposals | Function | Reads/query data |
| fetchMyPayslips | Function | Reads/query data |
| fetchPayrollAnalytics | Function | Reads/query data |
| fetchPayrollRecords | Function | Reads/query data |
| fetchPayrollRun | Function | Reads/query data |
| fetchPayrollRuns | Function | Reads/query data |
| fetchSalaryBands | Function | Reads/query data |
| getPayrollErrorMessage | Function | Reads/query data |
| initiatePayrollRun | Function | Domain-specific processing |
| proposeIncrement | Function | Domain-specific processing |
| rejectIncrement | Function | Domain-specific processing |
| submitPayrollRun | Function | Domain-specific processing |
| updatePayrollRecord | Function | Updates existing records/resources |
| updateSalaryBand | Function | Updates existing records/resources |

## crm-fe-main/src/lib/payroll-format.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| attendanceSummaryDisplay | Function | Domain-specific processing |
| formatINR | Function | Transforms data shape/format |
| formatINRPrecise | Function | Transforms data shape/format |
| formatPayrollMonthLabel | Function | Transforms data shape/format |
| parseNum | Function | Domain-specific processing |

## crm-fe-main/src/lib/performance-api.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| acknowledgePerformanceReview | Function | Domain-specific processing |
| approveCycleResults | Function | Domain-specific processing |
| createPerformanceCycle | Function | Creates new records/resources |
| deletePerformanceCycle | Function | Deletes records/resources |
| fetchCycleReviews | Function | Reads/query data |
| fetchHRPerformanceAnalytics | Function | Reads/query data |
| fetchMyPerformanceReviews | Function | Reads/query data |
| fetchPeerFeedbackSubmissions | Function | Reads/query data |
| fetchPeerFeedbackTargets | Function | Reads/query data |
| fetchPerformanceAnalytics | Function | Reads/query data |
| fetchPerformanceCycle | Function | Reads/query data |
| fetchPerformanceCycles | Function | Reads/query data |
| fetchPerformanceReminderCounts | Function | Reads/query data |
| fetchPerformanceReview | Function | Reads/query data |
| releaseCycleResults | Function | Domain-specific processing |
| runCalibration | Function | Domain-specific processing |
| setPerformanceGoals | Function | Domain-specific processing |
| submitManagerReview | Function | Domain-specific processing |
| submitPeerFeedbackDimension | Function | Domain-specific processing |
| submitSelfAssessment | Function | Domain-specific processing |
| updatePerformanceCycle | Function | Updates existing records/resources |

## crm-fe-main/src/lib/performance-metrics.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| getCurrentPageKey | Function | Reads/query data |
| getCurrentPageMetrics | Function | Reads/query data |
| getState | Function | Reads/query data |
| inDev | Function | Domain-specific processing |
| isBrowser | Function | Domain-specific processing |
| recordHttpRequest | Function | Domain-specific processing |
| recordSWRRequest | Function | Domain-specific processing |
| warn | Function | Domain-specific processing |

## crm-fe-main/src/lib/performanceHelpers.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| calibratedRatingToStars | Function | Domain-specific processing |
| canSeeCalibratedRating | Function | Domain-specific processing |
| deadlineUrgency | Function | Domain-specific processing |
| goalsWeightTotal | Function | Domain-specific processing |
| ratingLabel | Function | Domain-specific processing |
| reviewStatusBadgeClass | Function | Domain-specific processing |
| reviewStatusLabel | Function | Domain-specific processing |
| starsToCalibratedRating | Function | Domain-specific processing |

## crm-fe-main/src/lib/permissions.ts

**File role:** Shared utility/API integration layer

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/lib/polling-coordinator.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| electLeader | Function | Domain-specific processing |
| getTabId | Function | Reads/query data |
| onStorage | Function | Domain-specific processing |
| onUnload | Function | Domain-specific processing |
| parseLease | Function | Domain-specific processing |
| parsePayload | Function | Domain-specific processing |
| readLease | Function | Domain-specific processing |
| usePollingCoordinator | Function | Custom hook encapsulating state/data logic |
| writeLease | Function | Domain-specific processing |

## crm-fe-main/src/lib/projects-api.ts

**File role:** Shared utility/API integration layer

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/lib/request-guardrails.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| isRecord | Function | Domain-specific processing |
| normalizeSWRKey | Function | Domain-specific processing |
| resolveWorkloadExceptionFromKey | Function | Domain-specific processing |
| resolveWorkloadExceptionFromRequest | Function | Domain-specific processing |

## crm-fe-main/src/lib/shared-queries.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| useDepartmentsQuery | Function | Custom hook encapsulating state/data logic |
| useHolidaysQuery | Function | Custom hook encapsulating state/data logic |
| useTeamsQuery | Function | Custom hook encapsulating state/data logic |
| useUsersLiteQuery | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/lib/smart-read.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| isDev | Function | Domain-specific processing |
| logFallback | Function | Domain-specific processing |
| logSource | Function | Domain-specific processing |
| normalizeValue | Function | Domain-specific processing |
| smartRead | Function | Domain-specific processing |

## crm-fe-main/src/lib/supabase-auth.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| clearSupabaseSession | Function | Domain-specific processing |
| hasSupabaseSession | Function | Domain-specific processing |
| syncSupabaseSession | Function | Domain-specific processing |

## crm-fe-main/src/lib/supabase-queries.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| endDate | Function | Domain-specific processing |
| getActivityLogs | Function | Reads/query data |
| getAllReminders | Function | Reads/query data |
| getAttendanceList | Function | Reads/query data |
| getAttendanceRules | Function | Reads/query data |
| getAttendanceSummary | Function | Reads/query data |
| getDepartments | Function | Reads/query data |
| getDistinctLeadsWorkedByUser | Function | Reads/query data |
| getEmailHistory | Function | Reads/query data |
| getEmailSettings | Function | Reads/query data |
| getHolidays | Function | Reads/query data |
| getJobTitles | Function | Reads/query data |
| getLeadActivities | Function | Reads/query data |
| getLeadActivitiesCountByUser | Function | Reads/query data |
| getLeadActivitiesLog | Function | Reads/query data |
| getLeadById | Function | Reads/query data |
| getLeadComments | Function | Reads/query data |
| getLeadPipeline | Function | Reads/query data |
| getLeadReminders | Function | Reads/query data |
| getLeads | Function | Reads/query data |
| getLeadStatsByUser | Function | Reads/query data |
| getLeaveBalances | Function | Reads/query data |
| getLeaveRequests | Function | Reads/query data |
| getLeaveTypes | Function | Reads/query data |
| getNotifications | Function | Reads/query data |
| getProjectActivities | Function | Reads/query data |
| getProjectById | Function | Reads/query data |
| getProjectManagers | Function | Reads/query data |
| getProjectNotes | Function | Reads/query data |
| getProjects | Function | Reads/query data |
| getRemindersCount | Function | Reads/query data |
| getRoles | Function | Reads/query data |
| getSavedFilters | Function | Reads/query data |
| getTaskById | Function | Reads/query data |
| getTaskComments | Function | Reads/query data |
| getTasks | Function | Reads/query data |
| getTaskSummary | Function | Reads/query data |
| getTeamById | Function | Reads/query data |
| getTeamMembers | Function | Reads/query data |
| getTeamNotes | Function | Reads/query data |
| getTeams | Function | Reads/query data |
| getTodayAttendance | Function | Reads/query data |
| getUnreadNotificationCount | Function | Reads/query data |
| getUpcomingLeadReminders | Function | Reads/query data |
| getUpcomingReminders | Function | Reads/query data |
| getUserAttendanceHistory | Function | Reads/query data |
| getUserById | Function | Reads/query data |
| getUsers | Function | Reads/query data |
| getUsersAttendanceToday | Function | Reads/query data |
| getUsersByJobTitle | Function | Reads/query data |
| getWeeklyHours | Function | Reads/query data |
| getWonLeads | Function | Reads/query data |
| mapToCamelCase | Function | Transforms data shape/format |
| snakeToCamel | Function | Domain-specific processing |

## crm-fe-main/src/lib/supabase.ts

**File role:** Shared utility/API integration layer

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/lib/utils.ts

**File role:** Shared utility/API integration layer

| Symbol | Kind | Purpose |
|---|---|---|
| cn | Function | Domain-specific processing |
| getInitials | Function | Reads/query data |

## crm-fe-main/src/providers/auth-provider.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| AuthProvider | Component/Class/Type Constructor | Authentication/authorization handling |
| checkAuth | Function | Authentication/authorization handling |
| useAuth | Function | Authentication/authorization handling |
| useIsAdmin | Function | Custom hook encapsulating state/data logic |
| useIsManager | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/providers/color-sync.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| applyPrimaryColor | Function | Domain-specific processing |
| getStoredPrimaryColor | Function | Reads/query data |
| PrimaryColorSyncProvider | Component/Class/Type Constructor | Domain-specific processing |
| updateDarkMode | Function | Updates existing records/resources |
| usePrimaryColorSync | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/providers/department-context.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| DepartmentProvider | Component/Class/Type Constructor | Domain-specific processing |
| useDepartment | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/providers/header-refresh-provider.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| HeaderRefreshProvider | Component/Class/Type Constructor | Domain-specific processing |
| useHeaderRefresh | Function | Custom hook encapsulating state/data logic |
| useHeaderRefreshController | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/providers/swr-provider.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| SWRProvider | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/providers/theme-provider.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| ThemeProvider | Component/Class/Type Constructor | Domain-specific processing |

## crm-fe-main/src/providers/theme-sync.tsx

**File role:** React context providers and app-wide state

| Symbol | Kind | Purpose |
|---|---|---|
| ThemeSyncProvider | Component/Class/Type Constructor | Domain-specific processing |
| useThemeSync | Function | Custom hook encapsulating state/data logic |

## crm-fe-main/src/types/hr-documents.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/types/hr-leaves.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/types/hr.types.ts

**File role:** Type definitions and contracts

| Symbol | Kind | Purpose |
|---|---|---|
| toEmployeeProfile | Function | Domain-specific processing |

## crm-fe-main/src/types/index.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/types/payroll.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-fe-main/src/types/performance.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).
