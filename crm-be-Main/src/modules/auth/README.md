# Auth module

Authentication, registration, password management, OTP, and two-factor auth.

Parent: [Modules README](../README.md)

## Key entry files

| File | Role |
|------|------|
| `auth.routes.ts` | POST `/login`, `/register`, `/refresh`, `/logout`, 2FA and password routes |
| `auth.controller.ts` | HTTP handlers delegating to services |
| `auth.service.ts` | Facade over specialized auth services |
| `auth-session.service.ts` | Token issue, refresh, logout |
| `auth-registration.service.ts` | User registration |
| `auth-password.service.ts` | Password change and OTP reset |
| `auth-2fa.service.ts` | TOTP setup, verify, disable |
| `otp.service.ts` | OTP generation and verification |
| `auth.validator.ts` | Zod schemas for auth payloads |
| `auth.shared.ts` | Shared types and helpers |

## API prefix

Mounted at `/api/v1/auth` via `register-routes.ts`.

## Related

- [Backend README](../../../README.md#authentication)
- Frontend: `crm-fe-main/src/lib/api/modules/auth.ts`, `src/lib/auth/`
