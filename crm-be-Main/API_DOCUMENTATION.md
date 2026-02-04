# API Documentation

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST `/auth/login`

Login with email and password.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "id", "email", "fullName", "role", "teamId" },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": 900
    }
  }
}
```

### POST `/auth/register`

Register new user (Admin only).

**Body:**

```json
{
  "email": "new@example.com",
  "password": "StrongPass123!",
  "fullName": "John Doe",
  "role": "employee",
  "teamId": "uuid" // optional
}
```

### POST `/auth/refresh`

Refresh access token.

**Body:**

```json
{
  "refreshToken": "..."
}
```

### POST `/auth/logout`

Logout and revoke tokens.

### POST `/auth/change-password`

Change password.

**Body:**

```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```

### GET `/auth/me`

Get current user info.

---

## Users Endpoints

### GET `/users`

List users (paginated). Requires Manager+.

**Query Params:** `page`, `limit`, `role`, `isActive`, `search`

### GET `/users/me`

Get current user profile.

### PUT `/users/me`

Update own profile.

### GET `/users/:id`

Get user by ID.

### PUT `/users/:id`

Update user (Admin only).

### PATCH `/users/:id/activate`

Activate user (Admin only).

### PATCH `/users/:id/deactivate`

Deactivate user (Admin only).

---

## Teams Endpoints

### GET `/teams`

List all teams.

### POST `/teams`

Create team (Admin only).

**Body:**

```json
{
  "name": "Sales Team",
  "managerId": "uuid",
  "description": "Sales department"
}
```

### GET `/teams/:id`

Get team by ID.

### PUT `/teams/:id`

Update team (Admin only).

### DELETE `/teams/:id`

Delete team (Admin only).

### GET `/teams/:id/members`

Get team members.

### POST `/teams/:id/members`

Add user to team.

### DELETE `/teams/:id/members/:userId`

Remove user from team.

---

## Leads Endpoints

### GET `/leads`

List leads (paginated with filters).

**Query Params:**

- `page`, `limit`, `sortBy`, `order`
- `status`, `source`, `assignedTo`
- `search`, `startDate`, `endDate`

### POST `/leads`

Create lead (Manager+).

**Body:**

```json
{
  "leadName": "John Doe",
  "companyName": "Acme Inc",
  "email": "john@acme.com",
  "phone": "1234567890",
  "status": "new",
  "source": "website",
  "leadValue": 5000
}
```

### GET `/leads/pipeline`

Get lead pipeline summary.

### GET `/leads/:id`

Get lead by ID.

### PUT `/leads/:id`

Update lead.

### DELETE `/leads/:id`

Soft delete lead.

### POST `/leads/:id/assign`

Assign lead to user.

**Body:**

```json
{
  "assignTo": "user-uuid",
  "reason": "Better fit"
}
```

### POST `/leads/bulk-assign`

Bulk assign leads.

**Body:**

```json
{
  "leadIds": ["uuid1", "uuid2"],
  "assignTo": "user-uuid"
}
```

### POST `/leads/bulk-update`

Bulk update leads.

### POST `/leads/bulk-delete`

Bulk delete leads.

### GET `/leads/:id/activities`

Get lead activities.

### POST `/leads/:id/activities`

Add activity to lead.

**Body:**

```json
{
  "activityType": "call",
  "title": "Initial call",
  "description": "Discussed requirements",
  "duration": 30,
  "outcome": "Interested"
}
```

---

## Tasks Endpoints

### GET `/tasks`

List tasks.

**Query Params:**

- `page`, `limit`, `status`, `priority`
- `assignedTo`, `overdue`, `dueToday`

### GET `/tasks/summary`

Get task summary for current user.

### POST `/tasks`

Create task (Manager+).

**Body:**

```json
{
  "title": "Follow up with client",
  "description": "Discuss proposal",
  "assignedTo": "user-uuid",
  "priority": "high",
  "dueDate": "2026-01-15T10:00:00Z"
}
```

### GET `/tasks/:id`

Get task by ID.

### PUT `/tasks/:id`

Update task.

### DELETE `/tasks/:id`

Delete task.

### POST `/tasks/:id/reassign`

Reassign task.

### GET `/tasks/:id/comments`

Get task comments.

### POST `/tasks/:id/comments`

Add comment.

---

## Attendance Endpoints

### POST `/attendance/clock-in`

Clock in for the day.

**Body:**

```json
{
  "location": "Office",
  "notes": "Starting work"
}
```

### POST `/attendance/clock-out`

Clock out.

**Body:**

```json
{
  "breakDuration": 60,
  "notes": "Done for today"
}
```

### GET `/attendance/today`

Get today's attendance.

### GET `/attendance/summary`

Get monthly summary.

**Query Params:** `month`, `year`

### GET `/attendance`

List attendance records (Manager+).

### POST `/attendance/manual`

Create manual attendance (Admin).

### PUT `/attendance/:id`

Update attendance (Admin).

### GET `/attendance/rules`

Get attendance rules.

### PUT `/attendance/rules`

Update rules (Admin).

### GET `/attendance/holidays`

List holidays.

### POST `/attendance/holidays`

Create holiday (Admin).

### DELETE `/attendance/holidays/:id`

Delete holiday.

---

## Notifications Endpoints

### GET `/notifications`

Get notifications.

**Query Params:** `page`, `limit`, `unreadOnly`

### GET `/notifications/unread-count`

Get unread count.

### GET `/notifications/preferences`

Get notification preferences.

### PUT `/notifications/preferences`

Update preferences.

### POST `/notifications/:id/read`

Mark as read.

### POST `/notifications/read-all`

Mark all as read.

### DELETE `/notifications/:id`

Delete notification.

---

## Dashboard Endpoints

### GET `/dashboard`

Get role-based dashboard data.

### GET `/dashboard/admin`

Admin dashboard (Admin only).

### GET `/dashboard/lead-analytics`

Lead analytics (Manager+).

**Query Params:** `startDate`, `endDate`

### GET `/dashboard/user-performance/:userId`

User performance stats.

### GET `/dashboard/my-performance`

Current user's performance.

---

## CSV Endpoints

### GET `/csv/leads/template`

Download CSV import template.

### POST `/csv/leads/import`

Import leads from CSV.

**Body:**

```json
{
  "csvData": "lead_name,email,...\nJohn,john@example.com,...",
  "assignTo": "user-uuid"
}
```

### GET `/csv/leads/export`

Export leads to CSV.

**Query Params:** `status`, `source`, `assignedTo`, `startDate`, `endDate`

---

## Health Endpoints

### GET `/health`

Health check.

**Response:**

```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2026-01-09T..."
}
```

### GET `/health/ready`

Readiness check.

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "Invalid or expired token",
    "status": 401
  },
  "requestId": "abc-123"
}
```

## Rate Limits

| Endpoint Type   | Limit         |
| --------------- | ------------- |
| Default         | 100 req/15min |
| Auth            | 10 req/15min  |
| Bulk Operations | 10 req/hour   |
| Export          | 5 req/hour    |
