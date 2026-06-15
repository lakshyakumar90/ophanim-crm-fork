# Auth module

Authentication, registration, password management, OTP, and two-factor auth.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `auth/` | Routes, controller, validators, and auth services |

## Key entry files

| File | Role |
|------|------|
| `auth/auth.routes.ts` | POST `/login`, `/register`, `/refresh`, `/logout`, 2FA and password routes |
| `auth/auth.controller.ts` | HTTP handlers delegating to services |
| `auth/auth.service.ts` | Facade over specialized auth services |
| `auth/auth-session.service.ts` | Token issue, refresh, logout |
| `auth/auth-registration.service.ts` | User registration |
| `auth/auth-password.service.ts` | Password change and OTP reset |
| `auth/auth-2fa.service.ts` | TOTP setup, verify, disable |
| `auth/otp.service.ts` | OTP generation and verification |
| `auth/auth.validator.ts` | Zod schemas for auth payloads |
| `auth/auth.shared.ts` | Shared types and helpers |

## API prefix

Mounted at `/api/v1/auth` via `register-routes.ts`.

## Related

- [Backend README](../../../README.md#authentication)
- Frontend: `crm-fe-main/src/lib/api/modules/auth.ts`, `src/lib/auth/`
