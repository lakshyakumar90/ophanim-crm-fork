# Finance module

Invoices, payments, expenses, approvals, scheduled emails, and recurring billing.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `controllers/` | Per-resource HTTP controllers |
| `services/` | Business logic and PDF generation |

## Key entry files

| File | Role |
|------|------|
| `finance.routes.ts` | All `/api/v1/finance/*` routes |
| `finance.validator.ts` | Shared Zod schemas for finance payloads |
| `finance.controller.ts` | Finance dashboard aggregate handler |
| `controllers/invoice.controller.ts` | Invoice CRUD and PDF |
| `controllers/payment.controller.ts` | Payment recording |
| `controllers/expense.controller.ts` | Expense CRUD and categories |
| `controllers/approval.controller.ts` | Approval workflows |
| `controllers/email-request.controller.ts` | Finance email requests |
| `controllers/recurring.controller.ts` | Recurring schedules |
| `controllers/scheduled-email.controller.ts` | Scheduled send jobs |
| `services/invoice.service.ts` | Invoice persistence |
| `services/invoice-pdf.service.ts` | PDF rendering |

## Related

- Frontend: `crm-fe-main/src/app/(finance)/`, `src/lib/finance/`
- Frontend components: `crm-fe-main/src/components/finance/`
