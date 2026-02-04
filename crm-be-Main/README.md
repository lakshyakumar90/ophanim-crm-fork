# CRM Backend

A full-featured CRM backend built with Node.js, Express, and Supabase.  

## Features
 
- 🔐 **JWT Authentication** - Access + refresh token strategy  
- 👥 **Role-Based Access Control** - Admin, Manager, Employee roles 
- 📊 **Lead Management** - Full CRUD, bulk operations, pipeline tracking  
- ✅ **Task Management** - Assignments, comments, status tracking 
- ⏰ **Attendance System** - Clock in/out, rules, holidays
- 🔔 **Notifications** - In-app + email notifications   
- 📈 **Dashboard Analytics** - Role-based dashboards 
- 📤 **CSV Import/Export** - Bulk data operations 
 
## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod
- **Logging**: Pino

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create a `.env` file:

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## API Endpoints

### Authentication

| Method | Endpoint                | Description          |
| ------ | ----------------------- | -------------------- |
| POST   | `/auth/login`           | User login           |
| POST   | `/auth/register`        | User registration    |
| POST   | `/auth/logout`          | User logout          |
| POST   | `/auth/refresh`         | Refresh access token |
| GET    | `/auth/me`              | Get current user     |
| POST   | `/auth/change-password` | Change password      |

### Users

| Method | Endpoint                | Description     |
| ------ | ----------------------- | --------------- |
| GET    | `/users`                | List all users  |
| GET    | `/users/:id`            | Get user by ID  |
| PUT    | `/users/:id`            | Update user     |
| PATCH  | `/users/:id/activate`   | Activate user   |
| PATCH  | `/users/:id/deactivate` | Deactivate user |

### Leads

| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| GET    | `/leads`              | List leads (paginated) |
| GET    | `/leads/:id`          | Get lead details       |
| POST   | `/leads`              | Create lead            |
| PUT    | `/leads/:id`          | Update lead            |
| DELETE | `/leads/:id`          | Delete lead            |
| POST   | `/leads/:id/assign`   | Assign lead            |
| PATCH  | `/leads/:id/status`   | Update lead status     |
| GET    | `/leads/:id/comments` | Get lead comments      |
| POST   | `/leads/:id/comments` | Add comment            |
| POST   | `/leads/bulk-assign`  | Bulk assign leads      |
| POST   | `/leads/bulk-update`  | Bulk update leads      |
| POST   | `/leads/bulk-delete`  | Bulk delete leads      |

### Tasks

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| GET    | `/tasks`              | List tasks       |
| GET    | `/tasks/:id`          | Get task details |
| POST   | `/tasks`              | Create task      |
| PUT    | `/tasks/:id`          | Update task      |
| DELETE | `/tasks/:id`          | Delete task      |
| POST   | `/tasks/:id/reassign` | Reassign task    |

### Attendance

| Method | Endpoint                              | Description                  |
| ------ | ------------------------------------- | ---------------------------- |
| POST   | `/attendance/clock-in`                | Clock in                     |
| POST   | `/attendance/clock-out`               | Clock out                    |
| GET    | `/attendance/today`                   | Get today's attendance       |
| GET    | `/attendance/summary`                 | Get monthly summary          |
| GET    | `/attendance/analytics`               | Get analytics (admin)        |
| GET    | `/attendance/users-today`             | All users attendance (admin) |
| GET    | `/attendance/user/:userId/history`    | User history                 |
| POST   | `/attendance/manual`                  | Create manual record (admin) |
| PUT    | `/attendance/:id`                     | Update record (admin)        |
| POST   | `/attendance/admin/clock-in/:userId`  | Admin clock in user          |
| POST   | `/attendance/admin/clock-out/:userId` | Admin clock out user         |
| GET    | `/attendance/rules`                   | Get attendance rules         |
| PUT    | `/attendance/rules`                   | Update rules (admin)         |
| GET    | `/attendance/holidays`                | Get holidays                 |
| POST   | `/attendance/holidays`                | Create holiday (admin)       |

### Teams

| Method | Endpoint                     | Description   |
| ------ | ---------------------------- | ------------- |
| GET    | `/teams`                     | List teams    |
| POST   | `/teams`                     | Create team   |
| GET    | `/teams/:id`                 | Get team      |
| PUT    | `/teams/:id`                 | Update team   |
| DELETE | `/teams/:id`                 | Delete team   |
| POST   | `/teams/:id/members`         | Add member    |
| DELETE | `/teams/:id/members/:userId` | Remove member |

### Activities

| Method | Endpoint            | Description                |
| ------ | ------------------- | -------------------------- |
| GET    | `/activities`       | List activity logs (admin) |
| GET    | `/activities/leads` | Lead activities            |
| GET    | `/activities/stats` | Activity stats             |

### Notifications

| Method | Endpoint                     | Description        |
| ------ | ---------------------------- | ------------------ |
| GET    | `/notifications`             | List notifications |
| POST   | `/notifications/:id/read`    | Mark as read       |
| POST   | `/notifications/read-all`    | Mark all as read   |
| GET    | `/notifications/preferences` | Get preferences    |
| PUT    | `/notifications/preferences` | Update preferences |

### CSV Import/Export

| Method | Endpoint              | Description           |
| ------ | --------------------- | --------------------- |
| GET    | `/csv/leads/template` | Download CSV template |
| POST   | `/csv/leads/import`   | Import leads from CSV |
| GET    | `/csv/leads/export`   | Export leads to CSV   |

### Email

| Method | Endpoint           | Description         |
| ------ | ------------------ | ------------------- |
| GET    | `/email/settings`  | Get email settings  |
| POST   | `/email/settings`  | Save email settings |
| POST   | `/email/send`      | Send email          |
| POST   | `/email/send-bulk` | Send bulk emails    |
| GET    | `/email/history`   | Get email history   |

## User Roles

- **Admin**: Full access to all features
- **Manager**: Access to team data and limited admin features
- **Employee**: Access to own data only

## Project Structure

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utility functions
├── validators/      # Zod validation schemas
└── index.ts         # Entry point
```
