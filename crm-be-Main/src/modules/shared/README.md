# Shared module

Cross-domain services imported by other modules. Not mounted as HTTP routes.

Parent: [Modules README](../README.md)

## Files

| File | Purpose |
|------|---------|
| `activity-events.service.ts` | Publishes and records activity events used across sales, projects, HR |
| `cache.service.ts` | Redis/in-memory caching helpers for auth and hot reads |

## Usage

Import directly from sibling modules:

```typescript
import { logActivity } from "../shared/activity-events.service.js";
import { getCached, invalidateCache } from "../shared/cache.service.js";
```

## Related

- Consumers: `sales/leads/`, `projects/projects/`, `operations/activity/`
- [Modules README](../README.md)
