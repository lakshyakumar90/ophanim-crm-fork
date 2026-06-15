# Multi-Department Users - API Contract & Testing Guide

## API Endpoints Status

### ✅ Backend Ready
All endpoints have been updated to support multi-department users:

- `GET /api/v1/users/:id` - Returns user with `departmentIds` array
- `GET /api/v1/users` - Returns users with `departmentIds` array
- `PUT /api/v1/users/:id` - Accepts and persists `departmentIds` array
- `POST /api/v1/users` - Accepts `departmentIds` array

## Request/Response Schema

### User Response Format
```json
{
  "id": "user-123",
  "email": "john@example.com",
  "fullName": "John Doe",
  "role": "manager",
  "departmentIds": ["dept-sales", "dept-hr"],      // NEW: All departments
  "departmentId": "dept-sales",                     // OLD: Primary department (kept for backward compat)
  "jobTitle": "Sales Manager",
  "shiftType": "day_shift",
  "isActive": true,
  "salaryComponents": { /* ... */ }
}
```

### Update User Request Format
```json
{
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "role": "manager",
  "departmentIds": ["dept-finance", "dept-hr"],    // Provide array of department IDs
  "departmentSpecificData": [                        // Optional: Per-department customizations
    {
      "departmentId": "dept-finance",
      "jobTitle": "Finance Manager",
      "shiftType": "day_shift"
    },
    {
      "departmentId": "dept-hr",
      "jobTitle": "HR Manager",
      "shiftType": "day_shift"
    }
  ],
  "isActive": true,
  "currentCtc": 50000,
  "basicPct": 50,
  "hraPct": 20,
  "allowancePct": 30
}
```

### Create User Request Format
```json
{
  "fullName": "Alice Johnson",
  "email": "alice@example.com",
  "password": "SecurePassword123!",
  "role": "employee",
  "departmentIds": ["dept-projects"],               // Array of department IDs
  "jobTitle": "Developer",
  "shiftType": "day_shift",
  "teamId": "team-123",
  "isActive": true,
  "currentCtc": 40000,
  "basicPct": 50,
  "hraPct": 20,
  "allowancePct": 30
}
```

## Database Structure (Reference)

### `user_departments` Table
```sql
CREATE TABLE user_departments (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  job_title VARCHAR(255),
  shift_type VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, department_id)
);
```

### `users` Table (Backward compat)
```sql
ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id);
-- This stores the PRIMARY department (first in departmentIds array)
```

## Test Cases

### Unit Tests (Frontend Components)

#### MultiSelect Component
```typescript
describe("MultiSelect", () => {
  it("renders selected items as badges", () => {
    const { getByText } = render(
      <MultiSelect
        options={[{ id: "1", name: "Sales" }]}
        selected={["1"]}
        onChange={() => {}}
      />
    );
    expect(getByText("Sales")).toBeInTheDocument();
  });

  it("calls onChange when item is toggled", async () => {
    const onChange = vi.fn();
    const { getByText, getByRole } = render(
      <MultiSelect
        options={[{ id: "1", name: "Sales" }]}
        selected={[]}
        onChange={onChange}
      />
    );
    
    fireEvent.click(getByRole("button"));
    fireEvent.click(getByText("Sales"));
    expect(onChange).toHaveBeenCalledWith(["1"]);
  });
});
```

#### Edit User Form
```typescript
describe("EditUserForm", () => {
  it("loads and displays multiple departments", async () => {
    const mockUser = {
      departmentIds: ["dept-1", "dept-2"],
      departmentId: "dept-1"
    };
    
    // Mock API to return multi-department user
    mockUsersApi.get.resolves(mockUser);
    
    const { getByText } = render(<EditUserPage />);
    await waitFor(() => {
      expect(getByText("2 selected")).toBeInTheDocument();
    });
  });

  it("submits departmentIds array to API", async () => {
    // Setup form with 2 departments selected
    const { getByText, getByRole } = render(<EditUserPage />);
    
    // Select 2 departments
    fireEvent.click(getByRole("button", { name: /departments/i }));
    fireEvent.click(getByText("Sales"));
    fireEvent.click(getByText("HR"));
    
    // Submit form
    fireEvent.click(getByRole("button", { name: /save/i }));
    
    await waitFor(() => {
      expect(mockUsersApi.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          departmentIds: ["dept-sales", "dept-hr"]
        })
      );
    });
  });
});
```

### Integration Tests

#### User Creation with Multiple Departments
```
1. Navigate to /global/new
2. Fill in user form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Role: "manager"
3. Select multiple departments: Sales, HR
4. Submit form
5. Verify:
   - API receives departmentIds: ["dept-sales", "dept-hr"]
   - User created successfully
   - Backend creates records in user_departments table
```

#### User Edit with Multiple Departments
```
1. Navigate to /global/users/[id]/edit
2. Add another department:
   - Current: Sales
   - Add: Finance, HR
   - Result: [Sales, Finance, HR]
3. Submit form
4. Verify:
   - API receives departmentIds array with all 3
   - All departments linked in user_departments table
   - Display updates to show all 3 departments
```

#### Filter Users by Department
```
1. Go to /global/users
2. Filter by "Sales" department
3. Verify results include:
   - Users with departmentId = "Sales" (backward compat)
   - Users with departmentIds containing "Sales" (new)
   - Should show all users who have "Sales" in any departmentId
```

#### Bulk Edit Multiple Departments
```
1. Select 2 users in list
2. Click "Bulk Edit"
3. In multi-select, select: Finance, HR
4. Save
5. Verify:
   - Both users now have departmentIds: ["Finance", "HR"]
   - Previous departmentIds are replaced (not merged)
```

### End-to-End Tests (Cypress Example)

```typescript
// tests/e2e/multi-department-users.cy.ts

describe("Multi-Department Users", () => {
  beforeEach(() => {
    cy.login("admin@example.com");
    cy.visit("/global/users");
  });

  it("should create user with multiple departments", () => {
    cy.visit("/global/new");
    
    // Fill form
    cy.get('[placeholder="Full Name"]').type("Jane Doe");
    cy.get('[placeholder="Email"]').type("jane@test.com");
    cy.get('[placeholder="Password"]').type("SecurePassword123!");
    cy.get('[placeholder="Confirm Password"]').type("SecurePassword123!");
    
    // Select role
    cy.contains("Role").parent().find("[role=button]").click();
    cy.contains("Manager").click();
    
    // Select multiple departments
    cy.contains("Departments").parent().find("[role=button]").click();
    cy.contains("Sales").click();
    cy.contains("HR").click();
    
    // Submit
    cy.contains("Create User").click();
    
    // Verify success
    cy.contains("User created successfully").should("be.visible");
    cy.url().should("include", "/global/users");
  });

  it("should display all departments for multi-department user", () => {
    // Navigate to user with multiple departments
    cy.contains("Jane Doe").click();
    
    // Verify all departments shown
    cy.contains("Sales").should("be.visible");
    cy.contains("HR").should("be.visible");
  });

  it("should filter users by department correctly", () => {
    // Filter by Sales
    cy.get("[data-testid='department-filter']").click();
    cy.contains("Sales").click();
    
    // Verify multi-department users appear
    cy.contains("Jane Doe (multi-dept)").should("be.visible");
    cy.contains("John Smith (single-dept)").should("be.visible");
  });
});
```

## Manual Testing Workflow

### Test 1: Basic Multi-Department Assignment
```
1. Admin user creates new employee "Test User"
2. Assigns to: Sales + HR departments
3. Navigate to user detail page
4. Verify both departments display
5. Verify first department is marked as "primary"
```

### Test 2: Edit Multi-Department Assignment
```
1. Open existing user "Sales Manager"
2. Department selection shows: [Sales]
3. Add HR department → [Sales, HR]
4. Add Finance department → [Sales, HR, Finance]
5. Remove Sales → [HR, Finance]
6. Save
7. Navigate to list view - verify shows HR, Finance
```

### Test 3: Department-Specific Job Titles
```
1. Edit user "Jane Doe"
2. Select 3 departments: Sales, HR, Finance
3. Job title dropdown should show options from:
   - Sales: [Sales Manager]
   - HR: [HR Manager, HR Director]
   - Finance: [Finance Manager]
4. Select "HR Director"
5. Verify saves correctly
```

### Test 4: List View & Bulk Operations
```
1. Go to users list
2. Select 2 multi-department users
3. Bulk edit: Change departments to [Finance, Operations]
4. Verify both users now show [Finance, Operations]
5. Verify primary department is Finance
```

### Test 5: Filter Across Multiple Departments
```
1. List view shows users from various departments
2. Filter by "HR"
3. Results include:
   - Users where departmentId = "HR" (backward compat)
   - Users where departmentIds contains "HR"
4. Count includes ALL users with HR
5. Switch to "Sales" filter - different result set
```

### Test 6: Permission Aggregation
```
1. User "Jane" has departments: [Sales, HR]
2. Verify Jane sees data from both Sales and HR
3. Features restricted to Sales employees: Jane can access
4. Features restricted to HR employees: Jane can access
5. Features restricted to Finance employees: Jane cannot access
```

### Test 7: Backward Compatibility
```
1. In database, old user still has only department_id
2. API returns: 
   - departmentId: "sales"
   - departmentIds: ["sales"]
3. Frontend displays correctly
4. Edit user - system still works
5. During save, users.department_id = first departmentIds item
```

## Debugging Commands

### Check database state
```sql
-- See which users have been migrated
SELECT u.id, u.full_name, u.department_id, ud.department_id as user_dept_id
FROM users u
LEFT JOIN user_departments ud ON u.id = ud.user_id
WHERE u.id = 'USER_ID';

-- Get user's all departments
SELECT u.id, u.full_name, array_agg(ud.department_id) as department_ids
FROM users u
JOIN user_departments ud ON u.id = ud.user_id
GROUP BY u.id;

-- See primary departments
SELECT u.id, u.full_name, ud.department_id, ud.is_primary
FROM users u
JOIN user_departments ud ON u.id = ud.user_id
WHERE ud.is_primary = true;
```

### Check API responses
```bash
# Get user with departments
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/users/USER_ID

# Should include:
# "departmentIds": ["dept-1", "dept-2"],
# "departmentId": "dept-1"
```

### Browser console debugging
```javascript
// Check if departmentIds is being sent
// In your browser's Network tab, watch the PUT request to /api/v1/users/[id]
// Look for payload:
// { departmentIds: [...], ... }

// Check form state
console.log(watch("departmentIds"));  // Should be array
console.log(watch("departmentId"));   // Should be string or undefined
```

## Common Issues & Fixes

### Issue: departmentIds not saving
- **Check**: API returns departmentIds successfully
- **Check**: Backend migration 062 was run
- **Check**: user_departments table exists
- **Fix**: Run migration: `npm run migrate` (backend)

### Issue: Frontend shows wrong departments
- **Check**: API response includes departmentIds
- **Check**: Form initializes with departmentIds array
- **Check**: watch("departmentIds") returns correct value
- **Fix**: Ensure UserRecord interface includes departmentIds

### Issue: MultiSelect not appearing
- **Check**: Component file exists at `components/ui/multi-select.tsx`
- **Check**: Import statement added to form
- **Check**: DropdownMenu component available
- **Fix**: Run `pnpm install` to ensure dependencies

### Issue: Job titles not filtering correctly
- **Check**: DEPARTMENT_JOB_TITLES mapping includes all departments
- **Check**: availableJobTitles useMemo uses currentDepartmentIds
- **Check**: Department slugs match DEPARTMENT_JOB_TITLES keys
- **Fix**: Log availableJobTitles to see what's being generated

## Performance Considerations

### Database Query Optimization
- Backend getUsers() uses batch fetch for user_departments (single query + Map)
- This prevents N+1 queries when displaying user lists

### Frontend Optimization
- useMemo for availableJobTitles prevents unnecessary recalculations
- MultiSelect component can handle large department lists efficiently

### Indexes Created
- `idx_user_departments_user_id` - Fast lookup of user's departments
- `idx_user_departments_department_id` - Fast lookup of department's users
- `idx_user_departments_is_primary` - Fast primary department queries

## Rollback Plan

If issues occur:

1. **Keep users.department_id populated** - Always set to first departmentIds item
2. **user_departments table optional** - System works with just department_id
3. **Frontend compatibility** - Code checks departmentIds || [departmentId]
4. **Gradual rollback** - Can migrate back to single department without data loss

All new data stored in user_departments; old department_id stays as safety net.
