# Backend (crm-be-Main/src) - Function and Code Documentation

Source root: `crm-be-Main/src`

This catalog lists top-level functions/classes detected in each file and an inferred purpose from naming + location.

## crm-be-Main/src/config/constants.ts

**File role:** Configuration constants and environment contracts

| Symbol | Kind | Purpose |
|---|---|---|
| getJobTitlesForDepartment | Function | Reads/query data |
| isValidJobTitleForDepartment | Function | Domain-specific processing |

## crm-be-Main/src/config/env.ts

**File role:** Configuration constants and environment contracts

| Symbol | Kind | Purpose |
|---|---|---|
| parseEnv | Function | Domain-specific processing |

## crm-be-Main/src/config/supabase.ts

**File role:** Configuration constants and environment contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/controllers/projects.controller.ts

**File role:** Controller layer for request orchestration

| Symbol | Kind | Purpose |
|---|---|---|
| addMember | Function | Creates new records/resources |
| byManager | Function | Domain-specific processing |
| create | Function | Creates new records/resources |
| getById | Function | Reads/query data |
| idleProjects | Function | Domain-specific processing |
| list | Function | Reads/query data |
| remove | Function | Deletes records/resources |
| removeMember | Function | Deletes records/resources |
| resources | Function | Domain-specific processing |
| stats | Function | Domain-specific processing |
| update | Function | Updates existing records/resources |
| updateMember | Function | Updates existing records/resources |

## crm-be-Main/src/index.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| projectRef | Function | Domain-specific processing |
| verifyAttendanceSchema | Function | Validates input payloads |

## crm-be-Main/src/lib/permissions.ts

**File role:** Shared utility/API integration layer

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/middleware/auth.middleware.ts

**File role:** Express middleware for auth/validation/errors

| Symbol | Kind | Purpose |
|---|---|---|
| authenticate | Function | Authentication/authorization handling |
| checkAndAutoLogout | Function | Authentication/authorization handling |
| extractToken | Function | Authentication/authorization handling |
| fetchUserPermissions | Function | Reads/query data |
| getAuthCache | Function | Reads/query data |
| getAuthUser | Function | Reads/query data |
| mapDbUserToAuthUser | Function | Authentication/authorization handling |
| optionalAuthenticate | Function | Authentication/authorization handling |
| shouldBypassAuthCache | Function | Authentication/authorization handling |
| verifyToken | Function | Authentication/authorization handling |

## crm-be-Main/src/middleware/authorization.middleware.ts

**File role:** Express middleware for auth/validation/errors

| Symbol | Kind | Purpose |
|---|---|---|
| checkLeadEditAccess | Function | Domain-specific processing |
| checkResourceAccess | Function | Domain-specific processing |
| excludeDepartment | Function | Domain-specific processing |
| getTeamMemberIds | Function | Reads/query data |
| isTeamMember | Function | Domain-specific processing |
| requireAnyPermission | Function | Domain-specific processing |
| requireHRAccess | Function | Domain-specific processing |
| requireManagerOrHRAccess | Function | Domain-specific processing |
| requirePermission | Function | Domain-specific processing |
| requirePermissions | Function | Domain-specific processing |
| requireRole | Function | Domain-specific processing |

## crm-be-Main/src/middleware/error.middleware.ts

**File role:** Express middleware for auth/validation/errors

| Symbol | Kind | Purpose |
|---|---|---|
| asyncHandler | Function | Domain-specific processing |
| errorMiddleware | Function | Domain-specific processing |
| notFoundMiddleware | Function | Domain-specific processing |

## crm-be-Main/src/middleware/rate-limiter.middleware.ts

**File role:** Express middleware for auth/validation/errors

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/middleware/request-id.middleware.ts

**File role:** Express middleware for auth/validation/errors

| Symbol | Kind | Purpose |
|---|---|---|
| requestIdMiddleware | Function | Domain-specific processing |
| shouldSkipRequestLog | Function | Domain-specific processing |

## crm-be-Main/src/middleware/validation.middleware.ts

**File role:** Express middleware for auth/validation/errors

| Symbol | Kind | Purpose |
|---|---|---|
| formatZodErrors | Function | Transforms data shape/format |
| validate | Function | Validates input payloads |
| validateBody | Function | Validates input payloads |
| validateParams | Function | Validates input payloads |
| validateQuery | Function | Validates input payloads |
| validateRequest | Function | Validates input payloads |

## crm-be-Main/src/routes/activity.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/admin.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/attendance.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/auth.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/cron.routes.ts

**File role:** API route registration and endpoint wiring

| Symbol | Kind | Purpose |
|---|---|---|
| verifyCronAuth | Function | Authentication/authorization handling |

## crm-be-Main/src/routes/csv.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/dashboard.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/departments.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/email.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/finance.routes.ts

**File role:** API route registration and endpoint wiring

| Symbol | Kind | Purpose |
|---|---|---|
| requireHttpCronEnabled | Function | Domain-specific processing |

## crm-be-Main/src/routes/health.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/hr.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/internal.routes.ts

**File role:** API route registration and endpoint wiring

| Symbol | Kind | Purpose |
|---|---|---|
| verifyInternalAuth | Function | Authentication/authorization handling |

## crm-be-Main/src/routes/leads.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/notifications.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/payroll.routes.ts

**File role:** API route registration and endpoint wiring

| Symbol | Kind | Purpose |
|---|---|---|
| requireRunStatus | Function | Domain-specific processing |

## crm-be-Main/src/routes/performance.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/projects.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/roles.routes.ts

**File role:** API route registration and endpoint wiring

| Symbol | Kind | Purpose |
|---|---|---|
| assertValidPermissions | Function | Domain-specific processing |
| slugify | Function | Domain-specific processing |

## crm-be-Main/src/routes/search.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/tasks.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/team-notes.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/teams.routes.ts

**File role:** API route registration and endpoint wiring

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/routes/users.routes.ts

**File role:** API route registration and endpoint wiring

| Symbol | Kind | Purpose |
|---|---|---|
| formatTitle | Function | Transforms data shape/format |

## crm-be-Main/src/scripts/run_migration_placeholder.ts

**File role:** Operational/seed/migration scripts

| Symbol | Kind | Purpose |
|---|---|---|
| runMigration | Function | Domain-specific processing |

## crm-be-Main/src/scripts/seed-admin.ts

**File role:** Operational/seed/migration scripts

| Symbol | Kind | Purpose |
|---|---|---|
| main | Function | Domain-specific processing |
| parseArguments | Function | Domain-specific processing |
| seedAdmin | Function | Domain-specific processing |

## crm-be-Main/src/services/activity-events.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| logActivity | Function | Domain-specific processing |

## crm-be-Main/src/services/activity.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| applyActivityFilters | Function | Domain-specific processing |
| getActivityAnalytics | Function | Reads/query data |
| getActivityEventsFeed | Function | Reads/query data |
| getActivityLogs | Function | Reads/query data |
| getActivityStats | Function | Reads/query data |
| getLeadActivities | Function | Reads/query data |
| getManagedTeamIds | Function | Reads/query data |
| getUserById | Function | Reads/query data |
| getUsersInDepartment | Function | Reads/query data |
| getUsersInTeams | Function | Reads/query data |
| mapActivityRow | Function | Transforms data shape/format |
| normalizeResourceType | Function | Domain-specific processing |
| normalizeScope | Function | Domain-specific processing |
| resolveUserIdsForScope | Function | Domain-specific processing |

## crm-be-Main/src/services/attendance.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| bulkAutoLogoutDueSessions | Function | Authentication/authorization handling |
| calculateAutoLogoutTime | Function | Authentication/authorization handling |
| calculateDayTotalHours | Function | Domain-specific processing |
| calculateScheduledAutoLogoutTime | Function | Authentication/authorization handling |
| calculateWorkedHours | Function | Domain-specific processing |
| clockIn | Function | Domain-specific processing |
| clockOut | Function | Domain-specific processing |
| closeDueOpenSessions | Function | Domain-specific processing |
| closeMalformedOpenSessions | Function | Domain-specific processing |
| createHoliday | Function | Creates new records/resources |
| createManualAttendance | Function | Creates new records/resources |
| deleteHoliday | Function | Deletes records/resources |
| deriveAttendanceDaysForUsers | Function | Domain-specific processing |
| deriveSessionStatusByHours | Function | Domain-specific processing |
| evaluateClockInWindow | Function | Domain-specific processing |
| formatISTDate | Function | Transforms data shape/format |
| getAllUsersAttendance | Function | Reads/query data |
| getAttendanceAnalytics | Function | Reads/query data |
| getAttendanceList | Function | Reads/query data |
| getAttendanceRules | Function | Reads/query data |
| getAttendanceRulesForShift | Function | Reads/query data |
| getAttendanceSummary | Function | Reads/query data |
| getDateRangeStrings | Function | Reads/query data |
| getDayStatusFromSessions | Function | Reads/query data |
| getEffectiveAttendanceDate | Function | Reads/query data |
| getHolidayDateString | Function | Reads/query data |
| getHolidays | Function | Reads/query data |
| getLatestOpenSession | Function | Reads/query data |
| getMyShiftStatus | Function | Reads/query data |
| getMyTodayAttendance | Function | Reads/query data |
| getShiftDateTimes | Function | Reads/query data |
| getShiftDurationMinutes | Function | Reads/query data |
| getTodaySessions | Function | Reads/query data |
| getUserAttendanceHistory | Function | Reads/query data |
| getUserShiftType | Function | Reads/query data |
| getWeeklyHours | Function | Reads/query data |
| isHolidayApplicableToUser | Function | Domain-specific processing |
| mapAttendanceRowToRecord | Function | Transforms data shape/format |
| normalizeAttendanceStatus | Function | Domain-specific processing |
| normalizeWeeklyOffDays | Function | Domain-specific processing |
| parseMinutes | Function | Domain-specific processing |
| parseTimeToHHMM | Function | Domain-specific processing |
| restoreAttendanceByAdmin | Function | Domain-specific processing |
| toCompatAttendanceStatus | Function | Domain-specific processing |
| toISTDate | Function | Domain-specific processing |
| updateAttendance | Function | Updates existing records/resources |
| updateAttendanceRules | Function | Updates existing records/resources |

## crm-be-Main/src/services/auth.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| adminResetPassword | Function | Domain-specific processing |
| changePassword | Function | Domain-specific processing |
| cleanupExpiredTokens | Function | Authentication/authorization handling |
| disable2FA | Function | Domain-specific processing |
| generateAccessToken | Function | Authentication/authorization handling |
| generateRefreshToken | Function | Authentication/authorization handling |
| getAccessTokenExpiresIn | Function | Reads/query data |
| getAuthVerifyClient | Function | Reads/query data |
| getCurrentUser | Function | Reads/query data |
| hasEmployeeProfilesSalaryBandColumn | Function | Domain-specific processing |
| login | Function | Authentication/authorization handling |
| login2FA | Function | Authentication/authorization handling |
| logout | Function | Authentication/authorization handling |
| refreshAccessToken | Function | Authentication/authorization handling |
| register | Function | Domain-specific processing |
| requestPasswordChangeOTP | Function | Domain-specific processing |
| setup2FA | Function | Domain-specific processing |
| verify2FASetup | Function | Domain-specific processing |
| verifyOTPAndChangePassword | Function | Domain-specific processing |

## crm-be-Main/src/services/cache.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| acquireCacheLock | Function | Domain-specific processing |
| buildCacheKey | Function | Domain-specific processing |
| buildLockKey | Function | Domain-specific processing |
| buildSWRKey | Function | Domain-specific processing |
| fetchPromise | Function | Reads/query data |
| fetchWithStampedeProtection | Function | Reads/query data |
| getCached | Function | Reads/query data |
| getCachedStaleWhileRevalidate | Function | Reads/query data |
| getCacheStats | Function | Reads/query data |
| getRedis | Function | Reads/query data |
| invalidateCache | Function | Validates input payloads |
| invalidateCachePattern | Function | Validates input payloads |
| isCacheAvailable | Function | Domain-specific processing |
| releaseCacheLock | Function | Domain-specific processing |
| setStaleEnvelope | Function | Domain-specific processing |
| sleepMs | Function | Domain-specific processing |
| waitForCacheFill | Function | Domain-specific processing |

## crm-be-Main/src/services/csv.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| checkDuplicates | Function | Domain-specific processing |
| exportLeads | Function | Domain-specific processing |
| getDuplicateLeads | Function | Reads/query data |
| getLeadsCsvTemplate | Function | Reads/query data |
| importLeads | Function | Domain-specific processing |
| parseCsv | Function | Domain-specific processing |
| validateLeadRow | Function | Validates input payloads |

## crm-be-Main/src/services/dashboard.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| fetchLeadAnalyticsRows | Function | Reads/query data |
| fetchLeadAnalyticsRowsByIds | Function | Reads/query data |
| fetchLeadIdsWithActivities | Function | Reads/query data |
| first | Function | Domain-specific processing |
| getAdminDashboard | Function | Reads/query data |
| getDepartmentPerformance | Function | Reads/query data |
| getEmployeeDashboard | Function | Reads/query data |
| getEnhancedAdminDashboard | Function | Reads/query data |
| getHighPriorityAlerts | Function | Reads/query data |
| getLeadAnalytics | Function | Reads/query data |
| getLeadAnalyticsScoped | Function | Reads/query data |
| getLeadTrendData | Function | Reads/query data |
| getManagerDashboard | Function | Reads/query data |
| getProjectStatusData | Function | Reads/query data |
| getRevenueTrendData | Function | Reads/query data |
| getScopedUserIds | Function | Reads/query data |
| getTopPerformers | Function | Reads/query data |
| getUserPerformance | Function | Reads/query data |
| getUserWiseAnalytics | Function | Reads/query data |
| tryGetDashboardStatsRPC | Function | Domain-specific processing |
| tryGetLeadAggregationsRPC | Function | Domain-specific processing |

## crm-be-Main/src/services/departments.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| createDepartment | Function | Creates new records/resources |
| getDepartmentById | Function | Reads/query data |
| getDepartmentBySlug | Function | Reads/query data |
| getDepartmentIdBySlug | Function | Reads/query data |
| getDepartments | Function | Reads/query data |
| toCamelCase | Function | Domain-specific processing |
| updateDepartment | Function | Updates existing records/resources |

## crm-be-Main/src/services/document-types.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| assertActiveDocumentTypeSlug | Function | Domain-specific processing |
| createDocumentType | Function | Creates new records/resources |
| listDocumentTypes | Function | Reads/query data |
| mapRow | Function | Transforms data shape/format |
| updateDocumentType | Function | Updates existing records/resources |

## crm-be-Main/src/services/documents.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| createDocument | Function | Creates new records/resources |
| createDocumentWithUploadedFile | Function | Creates new records/resources |
| deleteDocument | Function | Deletes records/resources |
| getDocumentById | Function | Reads/query data |
| getDocuments | Function | Reads/query data |
| getDocumentStats | Function | Reads/query data |
| getUserDocuments | Function | Reads/query data |
| isHttpUrl | Function | Domain-specific processing |
| mapRowToEmployeeDocument | Function | Transforms data shape/format |
| notifyDocumentOwner | Function | Communication/notification handling |
| notifyHrOnDocumentSubmission | Function | Communication/notification handling |
| notifyReviewerAction | Function | Communication/notification handling |
| rejectDocument | Function | Domain-specific processing |
| resolveStoredFileUrl | Function | Domain-specific processing |
| safeFileSegment | Function | Domain-specific processing |
| unverifyDocument | Function | Domain-specific processing |
| updateDocument | Function | Updates existing records/resources |
| verifyDocument | Function | Domain-specific processing |
| withResolvedFileUrl | Function | Domain-specific processing |
| withResolvedFileUrlsBatch | Function | Domain-specific processing |

## crm-be-Main/src/services/email.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| createEmailTemplate | Function | Creates new records/resources |
| getEmailTemplate | Function | Reads/query data |
| getEmailTemplates | Function | Reads/query data |
| getTransporter | Function | Reads/query data |
| renderTemplate | Function | UI rendering and interaction |
| sendEmail | Function | Communication/notification handling |
| sendLeadAssignmentEmail | Function | Communication/notification handling |
| sendNewRegistrationNotification | Function | Communication/notification handling |
| sendOTPEmail | Function | Communication/notification handling |
| sendPasswordResetEmail | Function | Communication/notification handling |
| sendRegistrationApprovedEmail | Function | Communication/notification handling |
| sendRegistrationPendingEmail | Function | Communication/notification handling |
| sendRegistrationRejectedEmail | Function | Communication/notification handling |
| sendTaskAssignmentEmail | Function | Communication/notification handling |
| sendTemplateEmail | Function | Communication/notification handling |
| sendWelcomeEmail | Function | Communication/notification handling |

## crm-be-Main/src/services/files.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| createProjectFile | Function | Creates new records/resources |
| deleteFromStorage | Function | Deletes records/resources |
| deleteProjectFile | Function | Deletes records/resources |
| getFileDownloadUrl | Function | Reads/query data |
| getProjectFiles | Function | Reads/query data |
| mapFileRow | Function | Transforms data shape/format |
| uploadToStorage | Function | Domain-specific processing |

## crm-be-Main/src/services/finance/approval.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| bulkApprove | Function | Domain-specific processing |
| getApprovalHistory | Function | Reads/query data |
| getPendingApprovalCount | Function | Reads/query data |
| getPendingApprovals | Function | Reads/query data |

## crm-be-Main/src/services/finance/email-request.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| approveEmailRequest | Function | Communication/notification handling |
| createEmailRequest | Function | Creates new records/resources |
| getEmailRequestById | Function | Reads/query data |
| getEmailRequests | Function | Reads/query data |
| markEmailFailed | Function | Communication/notification handling |
| markEmailSent | Function | Communication/notification handling |
| rejectEmailRequest | Function | Communication/notification handling |
| scheduleEmail | Function | Communication/notification handling |
| submitEmailRequestForApproval | Function | Communication/notification handling |
| updateEmailRequest | Function | Updates existing records/resources |

## crm-be-Main/src/services/finance/expense.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| approveExpense | Function | Domain-specific processing |
| createExpenseCategory | Function | Creates new records/resources |
| getExpenseById | Function | Reads/query data |
| getExpenseCategories | Function | Reads/query data |
| getExpenses | Function | Reads/query data |
| getExpenseStats | Function | Reads/query data |
| rejectExpense | Function | Domain-specific processing |
| submitExpense | Function | Domain-specific processing |
| updateExpense | Function | Updates existing records/resources |
| updateExpenseCategory | Function | Updates existing records/resources |

## crm-be-Main/src/services/finance/finance-dashboard.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| getFinanceDashboard | Function | Reads/query data |
| getInvoiceStatusDistribution | Function | Reads/query data |
| getMonthlyRevenueTrend | Function | Reads/query data |
| getRecentFinanceActivity | Function | Reads/query data |
| getTopOutstandingClients | Function | Reads/query data |

## crm-be-Main/src/services/finance/invoice.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| approveInvoice | Function | Domain-specific processing |
| cancelInvoice | Function | Domain-specific processing |
| createInvoice | Function | Creates new records/resources |
| getInvoiceById | Function | Reads/query data |
| getInvoices | Function | Reads/query data |
| getInvoiceStats | Function | Reads/query data |
| markInvoiceSent | Function | Domain-specific processing |
| rejectInvoice | Function | Domain-specific processing |
| submitInvoiceForApproval | Function | Domain-specific processing |
| updateInvoice | Function | Updates existing records/resources |
| updateOverdueInvoices | Function | Updates existing records/resources |

## crm-be-Main/src/services/finance/payment.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| deletePayment | Function | Deletes records/resources |
| getPayments | Function | Reads/query data |
| getPaymentsForInvoice | Function | Reads/query data |
| getPaymentStats | Function | Reads/query data |
| recordPayment | Function | Domain-specific processing |
| updatePayment | Function | Updates existing records/resources |

## crm-be-Main/src/services/finance/recurring.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| calculateDueDate | Function | Domain-specific processing |
| calculateNextRunDate | Function | Domain-specific processing |
| createRecurringSchedule | Function | Creates new records/resources |
| deleteRecurringSchedule | Function | Deletes records/resources |
| generateInvoiceEmailBody | Function | Communication/notification handling |
| getRecurringScheduleById | Function | Reads/query data |
| getRecurringSchedules | Function | Reads/query data |
| pauseRecurringSchedule | Function | Domain-specific processing |
| processRecurringInvoices | Function | Domain-specific processing |
| resumeRecurringSchedule | Function | Domain-specific processing |
| updateRecurringSchedule | Function | Updates existing records/resources |

## crm-be-Main/src/services/finance/scheduled-email.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| cancelScheduledEmail | Function | Communication/notification handling |
| getUpcomingScheduledEmails | Function | Reads/query data |
| processScheduledEmails | Function | Communication/notification handling |
| rescheduleEmail | Function | Communication/notification handling |

## crm-be-Main/src/services/hr-analytics.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| getActivityFeed | Function | Reads/query data |
| getComplianceAnalytics | Function | Reads/query data |
| getComprehensiveAnalytics | Function | Reads/query data |
| getHeadcountAnalytics | Function | Reads/query data |
| getLeaveAnalytics | Function | Reads/query data |
| getPayrollAnalytics | Function | Reads/query data |
| getPerformanceAnalytics | Function | Reads/query data |
| getRecruitmentAnalytics | Function | Reads/query data |
| getSystemAlerts | Function | Reads/query data |
| runComplianceChecks | Function | Domain-specific processing |

## crm-be-Main/src/services/hr.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| getEmployeeById | Function | Reads/query data |
| getEmployeeCompensationHistory | Function | Reads/query data |
| getEmployeeDirectory | Function | Reads/query data |
| getEmployeeProfilesMap | Function | Reads/query data |
| getEmployeesOnLeaveToday | Function | Reads/query data |
| getEmployeesOnProbation | Function | Reads/query data |
| getFallbackCurrentCtcMap | Function | Reads/query data |
| getHRAnalytics | Function | Reads/query data |
| updateEmployeeProfile | Function | Updates existing records/resources |

## crm-be-Main/src/services/leads.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| addLeadActivity | Function | Creates new records/resources |
| addLeadComment | Function | Creates new records/resources |
| assignLead | Function | Domain-specific processing |
| bulkAssignLeads | Function | Domain-specific processing |
| bulkDeleteLeads | Function | Domain-specific processing |
| bulkUpdateLeads | Function | Domain-specific processing |
| createLead | Function | Creates new records/resources |
| createLeadReminder | Function | Creates new records/resources |
| deleteLead | Function | Deletes records/resources |
| deleteLeadComment | Function | Deletes records/resources |
| deleteLeadReminder | Function | Deletes records/resources |
| enrichReminders | Function | Domain-specific processing |
| getAllReminders | Function | Reads/query data |
| getLeadActivities | Function | Reads/query data |
| getLeadById | Function | Reads/query data |
| getLeadComments | Function | Reads/query data |
| getLeadCountsByUser | Function | Reads/query data |
| getLeadDetailPageCacheKey | Function | Reads/query data |
| getLeadDetailPageData | Function | Reads/query data |
| getLeadPipeline | Function | Reads/query data |
| getLeadReminders | Function | Reads/query data |
| getLeads | Function | Reads/query data |
| getRemindersCount | Function | Reads/query data |
| getUserPendingReminders | Function | Reads/query data |
| getWonLeads | Function | Reads/query data |
| invalidateLeadDetailPageCache | Function | Validates input payloads |
| mapCommentRowToRecord | Function | Transforms data shape/format |
| mapLeadActivityRowToRecord | Function | Transforms data shape/format |
| mapLeadRowToRecord | Function | Transforms data shape/format |
| mapReminderRowToRecord | Function | Transforms data shape/format |
| markReminderDone | Function | Domain-specific processing |
| updateLead | Function | Updates existing records/resources |
| updateLeadComment | Function | Updates existing records/resources |
| updateLeadStatus | Function | Updates existing records/resources |

## crm-be-Main/src/services/leave.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| approveLeaveRequest | Function | Domain-specific processing |
| cancelLeaveRequest | Function | Domain-specific processing |
| canViewOrgLeaves | Function | Domain-specific processing |
| createLeaveRequest | Function | Creates new records/resources |
| createLeaveType | Function | Creates new records/resources |
| getApprovedLeavesForCalendar | Function | Reads/query data |
| getLeaveRequests | Function | Reads/query data |
| getLeaveStats | Function | Reads/query data |
| getLeaveTypes | Function | Reads/query data |
| getLeaveTypesAdmin | Function | Reads/query data |
| getPendingLeaveRequests | Function | Reads/query data |
| getUserLeaveBalances | Function | Reads/query data |
| rejectLeaveRequest | Function | Domain-specific processing |
| updateLeaveType | Function | Updates existing records/resources |

## crm-be-Main/src/services/notes.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| checkProjectAccess | Function | Domain-specific processing |
| createNote | Function | Creates new records/resources |
| deleteNote | Function | Deletes records/resources |
| extractMentionedUserIds | Function | Domain-specific processing |
| getNoteById | Function | Reads/query data |
| getProjectNotes | Function | Reads/query data |
| notifyMentionedUsers | Function | Communication/notification handling |
| pinNote | Function | Domain-specific processing |
| unpinNote | Function | Domain-specific processing |
| updateNote | Function | Updates existing records/resources |

## crm-be-Main/src/services/notifications.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| cleanupOldNotifications | Function | Domain-specific processing |
| createBulkNotifications | Function | Creates new records/resources |
| createNotification | Function | Creates new records/resources |
| deleteNotification | Function | Deletes records/resources |
| getNotifications | Function | Reads/query data |
| getPreferences | Function | Reads/query data |
| getUnreadCount | Function | Reads/query data |
| mapNotificationRowToRecord | Function | Transforms data shape/format |
| markAllAsRead | Function | Domain-specific processing |
| markAsRead | Function | Domain-specific processing |
| updatePreferences | Function | Updates existing records/resources |

## crm-be-Main/src/services/otp.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| cleanupExpiredOTPs | Function | Domain-specific processing |
| generateOTP | Function | Domain-specific processing |
| generateOTPCode | Function | Domain-specific processing |
| hasRecentOTPRequest | Function | Domain-specific processing |
| verifyOTP | Function | Domain-specific processing |

## crm-be-Main/src/services/payroll.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| approveIncrement | Function | Domain-specific processing |
| approvePayrollRun | Function | Domain-specific processing |
| assertRunNotDisbursed | Function | Domain-specific processing |
| assertRunStatus | Function | Domain-specific processing |
| calculateEmployeePayroll | Function | Domain-specific processing |
| createCorrectionRun | Function | Creates new records/resources |
| createSalaryBand | Function | Creates new records/resources |
| deleteSalaryBand | Function | Deletes records/resources |
| disbursePayroll | Function | Domain-specific processing |
| editPayrollRecord | Function | Updates existing records/resources |
| formatInr | Function | Transforms data shape/format |
| generatePayslipPdfBuffer | Function | Domain-specific processing |
| getEmployeePayslips | Function | Reads/query data |
| getIncrementProposals | Function | Reads/query data |
| getPayrollAnalytics | Function | Reads/query data |
| getPayrollRecordsByRun | Function | Reads/query data |
| getPayrollRunById | Function | Reads/query data |
| getPayrollRuns | Function | Reads/query data |
| getPayslipRecordById | Function | Reads/query data |
| getRunOrThrow | Function | Reads/query data |
| getSalaryBands | Function | Reads/query data |
| initiatePayrollRun | Function | Domain-specific processing |
| proposeIncrement | Function | Domain-specific processing |
| rejectIncrement | Function | Domain-specific processing |
| resolveEmployeeIdsForRun | Function | Domain-specific processing |
| submitForApproval | Function | Domain-specific processing |
| updateSalaryBand | Function | Updates existing records/resources |

## crm-be-Main/src/services/performance.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| acknowledgeReview | Function | Domain-specific processing |
| activateCycle | Function | Domain-specific processing |
| approveCycleResults | Function | Domain-specific processing |
| createReviewCycle | Function | Creates new records/resources |
| deleteReviewCycle | Function | Deletes records/resources |
| getPeerFeedbackSubmissionsForReview | Function | Reads/query data |
| getPeerFeedbackTargetsForUser | Function | Reads/query data |
| getPerformanceAnalytics | Function | Reads/query data |
| getPerformanceReminderCountsForUser | Function | Reads/query data |
| getReviewById | Function | Reads/query data |
| getReviewCycleById | Function | Reads/query data |
| getReviewCycles | Function | Reads/query data |
| getReviewCyclesForRequester | Function | Reads/query data |
| getReviewsByCycleId | Function | Reads/query data |
| getReviewsByCycleIdForRequester | Function | Reads/query data |
| getReviewsForEmployee | Function | Reads/query data |
| hasPeerSubmissionAccess | Function | Domain-specific processing |
| maybeInsertDeadlineNotification | Function | Domain-specific processing |
| processPerformanceDeadlineReminders | Function | Domain-specific processing |
| releaseResults | Function | Domain-specific processing |
| runCalibration | Function | Domain-specific processing |
| setGoals | Function | Domain-specific processing |
| submitManagerReview | Function | Domain-specific processing |
| submitPeerFeedback | Function | Domain-specific processing |
| submitSelfAssessment | Function | Domain-specific processing |
| updateReviewCycle | Function | Updates existing records/resources |

## crm-be-Main/src/services/projects.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| addProjectMember | Function | Creates new records/resources |
| createProject | Function | Creates new records/resources |
| deleteProject | Function | Deletes records/resources |
| getAccessibleProjectIds | Function | Reads/query data |
| getIdleProjects | Function | Reads/query data |
| getMyProjects | Function | Reads/query data |
| getProjectById | Function | Reads/query data |
| getProjectDashboardStats | Function | Reads/query data |
| getProjectResources | Function | Reads/query data |
| getProjects | Function | Reads/query data |
| getProjectsByManagerId | Function | Reads/query data |
| getProjectStats | Function | Reads/query data |
| getResolvedUserPermissions | Function | Reads/query data |
| hasRbacRole | Function | Domain-specific processing |
| mapProjectMemberRow | Function | Transforms data shape/format |
| mapProjectRow | Function | Transforms data shape/format |
| removeProjectMember | Function | Deletes records/resources |
| updateProject | Function | Updates existing records/resources |
| updateProjectMember | Function | Updates existing records/resources |
| upsertManager | Function | Domain-specific processing |

## crm-be-Main/src/services/reminder.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| processLeadReminder30Min | Function | Domain-specific processing |
| processLeadReminder5Min | Function | Domain-specific processing |
| processLeadReminderAtTime | Function | Domain-specific processing |
| processLeadReminderOverdue | Function | Domain-specific processing |
| processLeadReminders | Function | Domain-specific processing |
| processTaskReminder30Min | Function | Domain-specific processing |
| processTaskReminder5Min | Function | Domain-specific processing |
| processTaskReminderAtTime | Function | Domain-specific processing |
| processTaskReminderOverdue | Function | Domain-specific processing |
| processTaskReminders | Function | Domain-specific processing |
| startReminderService | Function | Domain-specific processing |

## crm-be-Main/src/services/search.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| getTeamMemberIds | Function | Reads/query data |
| searchExpenses | Function | Domain-specific processing |
| searchGlobal | Function | Domain-specific processing |
| searchInvoices | Function | Domain-specific processing |
| searchLeads | Function | Domain-specific processing |
| searchTasks | Function | Domain-specific processing |
| searchUsers | Function | Domain-specific processing |
| shouldSearch | Function | Domain-specific processing |
| traditionalSearch | Function | Domain-specific processing |
| tryFullTextSearch | Function | Domain-specific processing |

## crm-be-Main/src/services/tasks.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| addTaskComment | Function | Creates new records/resources |
| checkDueReminders | Function | Domain-specific processing |
| createTask | Function | Creates new records/resources |
| deleteTask | Function | Deletes records/resources |
| getAllowedAssigneeIds | Function | Reads/query data |
| getMyTasksSummary | Function | Reads/query data |
| getTaskById | Function | Reads/query data |
| getTaskComments | Function | Reads/query data |
| getTasks | Function | Reads/query data |
| mapTaskRowToRecord | Function | Transforms data shape/format |
| reassignTask | Function | Domain-specific processing |
| updateTask | Function | Updates existing records/resources |

## crm-be-Main/src/services/team-notes.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| createTeamNote | Function | Creates new records/resources |
| deleteTeamNote | Function | Deletes records/resources |
| getTeamNotes | Function | Reads/query data |
| pinTeamNote | Function | Domain-specific processing |
| unpinTeamNote | Function | Domain-specific processing |
| updateTeamNote | Function | Updates existing records/resources |

## crm-be-Main/src/services/teams.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| addUserToTeam | Function | Creates new records/resources |
| createTeam | Function | Creates new records/resources |
| deleteTeam | Function | Deletes records/resources |
| getTeamById | Function | Reads/query data |
| getTeamMembersWithDetails | Function | Reads/query data |
| getTeams | Function | Reads/query data |
| getTeamsForUser | Function | Reads/query data |
| getUserTeamIds | Function | Reads/query data |
| mapTeamRowToRecord | Function | Transforms data shape/format |
| removeUserFromTeam | Function | Deletes records/resources |
| updateTeam | Function | Updates existing records/resources |

## crm-be-Main/src/services/user-email.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| createUserTransporter | Function | Creates new records/resources |
| decryptPassword | Function | Domain-specific processing |
| deleteUserEmailSettings | Function | Deletes records/resources |
| encryptPassword | Function | Domain-specific processing |
| getEmailSendHistory | Function | Reads/query data |
| getUserEmailSettings | Function | Reads/query data |
| incrementDailySentCount | Function | Domain-specific processing |
| saveUserEmailSettings | Function | Communication/notification handling |
| sendBulkUserEmails | Function | Communication/notification handling |
| sendUserEmail | Function | Communication/notification handling |
| testEmailConfiguration | Function | Communication/notification handling |

## crm-be-Main/src/services/users.service.ts

**File role:** Domain/business logic and data access

| Symbol | Kind | Purpose |
|---|---|---|
| activateUser | Function | Domain-specific processing |
| bulkUpdateUsers | Function | Domain-specific processing |
| deactivateUser | Function | Domain-specific processing |
| getEmployeeProfilesByUserIds | Function | Reads/query data |
| getProjectManagers | Function | Reads/query data |
| getTeamMembers | Function | Reads/query data |
| getTeamMembersForManager | Function | Reads/query data |
| getUserById | Function | Reads/query data |
| getUsers | Function | Reads/query data |
| getUsersByJobTitles | Function | Reads/query data |
| hasEmployeeProfilesSalaryBandColumn | Function | Domain-specific processing |
| mapUserRowToRecord | Function | Transforms data shape/format |
| updateProfile | Function | Updates existing records/resources |
| updateUser | Function | Updates existing records/resources |

## crm-be-Main/src/types/api.types.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/types/database.types.ts

**File role:** Type definitions and contracts

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/utils/2fa.utils.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| createTOTP | Function | Creates new records/resources |
| generateCurrentTOTP | Function | Domain-specific processing |
| generateQRCode | Function | Domain-specific processing |
| generateTOTPSecret | Function | Domain-specific processing |
| getTOTPUri | Function | Reads/query data |
| verifyTOTP | Function | Domain-specific processing |

## crm-be-Main/src/utils/date-utils.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| formatDateIST | Function | Transforms data shape/format |
| getEndOfMonthIST | Function | Reads/query data |
| getEndOfTodayIST | Function | Reads/query data |
| getMonthIST | Function | Reads/query data |
| getStartOfMonthIST | Function | Reads/query data |
| getStartOfTodayIST | Function | Reads/query data |
| getTimestampIST | Function | Reads/query data |
| getTodayIST | Function | Reads/query data |
| getYearIST | Function | Reads/query data |
| nowIST | Function | Domain-specific processing |
| toIST | Function | Domain-specific processing |

## crm-be-Main/src/utils/error-codes.ts

**File role:** Module implementation

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/utils/helpers.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| calculateHoursBetween | Function | Domain-specific processing |
| chunkArray | Function | Domain-specific processing |
| comparePassword | Function | Domain-specific processing |
| delay | Function | Domain-specific processing |
| generateId | Function | Domain-specific processing |
| generateToken | Function | Authentication/authorization handling |
| getCurrentTimestamp | Function | Reads/query data |
| getTodayDate | Function | Reads/query data |
| hashPassword | Function | Domain-specific processing |
| isValidEmail | Function | Communication/notification handling |
| isValidUUID | Function | Domain-specific processing |
| maskEmail | Function | Communication/notification handling |
| omit | Function | Domain-specific processing |
| parseDuration | Function | Domain-specific processing |
| pick | Function | Domain-specific processing |
| sanitizeObject | Function | Domain-specific processing |

## crm-be-Main/src/utils/job-title.utils.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| deriveMostSeniorJobTitle | Function | Domain-specific processing |
| slugSeniority | Function | Domain-specific processing |
| slugToJobTitle | Function | Domain-specific processing |

## crm-be-Main/src/utils/logger.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| createRequestLogger | Function | Creates new records/resources |

## crm-be-Main/src/utils/pagination.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| calculateOffset | Function | Domain-specific processing |
| calculatePaginationMeta | Function | Domain-specific processing |
| parseArrayParam | Function | Domain-specific processing |
| parseBooleanParam | Function | Domain-specific processing |
| parseDateRange | Function | Domain-specific processing |
| parsePaginationParams | Function | Domain-specific processing |
| parseSortParams | Function | Domain-specific processing |

## crm-be-Main/src/utils/responses.ts

**File role:** Module implementation

| Symbol | Kind | Purpose |
|---|---|---|
| ApiError | Component/Class/Type Constructor | Domain-specific processing |
| sendCreated | Function | Communication/notification handling |
| sendError | Function | Communication/notification handling |
| sendNoContent | Function | Communication/notification handling |
| sendPaginated | Function | Communication/notification handling |
| sendSuccess | Function | Communication/notification handling |

## crm-be-Main/src/validators/attendance.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/auth.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/departments.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/documents.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/finance.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/hr.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/leads.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/notes.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/notifications.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/payroll.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/performance.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/projects.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/tasks.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/team-notes.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/teams.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).

## crm-be-Main/src/validators/users.validator.ts

**File role:** Zod schema validation definitions

No top-level named functions/classes detected (likely exports objects, constants, or JSX-only component bodies).
