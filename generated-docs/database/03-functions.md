# Database Functions Reference

Source: `database.types.ts`

Total functions documented: **25**

## Functions

### add_holiday

**Arguments**

| Name | Type |
|---|---|
| p_holiday_date | string |
| p_name | string |

**Returns:** object (structured row/result)

### assign_role_to_user

**Arguments**

No arguments.

**Returns:** undefined

### backfill_attendance

**Arguments**

No arguments.

**Returns:** number

### edit_holiday

**Arguments**

| Name | Type |
|---|---|
| p_holiday_date | string |
| p_holiday_id | string |
| p_name | string |

**Returns:** object (structured row/result)

### generate_attendance_for_date

**Arguments**

No arguments.

**Returns:** number

### generate_daily_attendance

**Arguments**

No arguments.

**Returns:** number

### get_activity_events_feed

**Arguments**

| Name | Type |
|---|---|
| p_limit | number |

**Returns:** object (structured row/result)

### get_admin_dashboard_stats

**Arguments**

No arguments.

**Returns:** Json

### get_all_department_performance

**Arguments**

No arguments.

**Returns:** object (structured row/result)

### get_dashboard_counts

**Arguments**

No arguments.

**Returns:** Json

### get_lead_aggregations

**Arguments**

No arguments.

**Returns:** Json

### get_lead_pipeline_stats

**Arguments**

No arguments.

**Returns:** object (structured row/result)

### get_lead_source_stats

**Arguments**

No arguments.

**Returns:** object (structured row/result)

### get_my_role

**Arguments**

No arguments.

**Returns:** Database["public"]["Enums"]["user_role"]

### get_team_member_counts

**Arguments**

No arguments.

**Returns:** object (structured row/result)

### get_top_performers

**Arguments**

No arguments.

**Returns:** object (structured row/result)

### get_user_department_ids

**Arguments**

No arguments.

**Returns:** string[]

### get_user_primary_department

**Arguments**

No arguments.

**Returns:** string

### global_search

**Arguments**

| Name | Type |
|---|---|
| p_query | string |

**Returns:** object (structured row/result)

### initialize_leave_balances

**Arguments**

No arguments.

**Returns:** undefined

### is_project_manager_of

**Arguments**

No arguments.

**Returns:** boolean

### login_activate_attendance_session

**Arguments**

No arguments.

**Returns:** object (structured row/result)

### remove_role_from_user

**Arguments**

No arguments.

**Returns:** undefined

### update_attendance_for_holiday

**Arguments**

No arguments.

**Returns:** number

### upsert_company_settings

**Arguments**

No arguments.

**Returns:** object (structured row/result)

