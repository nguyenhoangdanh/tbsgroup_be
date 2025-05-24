# API Endpoints Design

## Authentication

```
POST /api/auth/login - User login
POST /api/auth/reset-password - Request password reset
POST /api/auth/change-password - Change password
POST /api/auth/verify-employee - Verify employee by ID and CCCD
GET  /api/auth/me - Get current user profile
```

## User Management

```
GET    /api/users - Get all users (with filtering and pagination)
POST   /api/users - Create new user
GET    /api/users/:id - Get user by ID
PATCH  /api/users/:id - Update user
DELETE /api/users/:id - Delete user
POST   /api/users/:id/roles - Assign role to user
DELETE /api/users/:id/roles/:roleId - Remove role from user
```

## Organization Structure

### Factory Management

```
GET    /api/factories - Get all factories
POST   /api/factories - Create new factory
GET    /api/factories/:id - Get factory by ID
PATCH  /api/factories/:id - Update factory
DELETE /api/factories/:id - Delete factory
GET    /api/factories/:id/lines - Get lines for a factory
```

### Line Management

```
GET    /api/lines - Get all lines
POST   /api/lines - Create new line
GET    /api/lines/:id - Get line by ID
PATCH  /api/lines/:id - Update line
DELETE /api/lines/:id - Delete line
GET    /api/lines/:id/teams - Get teams for a line
```

### Team Management

```
GET    /api/teams - Get all teams
POST   /api/teams - Create new team
GET    /api/teams/:id - Get team by ID
PATCH  /api/teams/:id - Update team
DELETE /api/teams/:id - Delete team
GET    /api/teams/:id/groups - Get groups for a team
```

### Group Management

```
GET    /api/groups - Get all groups
POST   /api/groups - Create new group
GET    /api/groups/:id - Get group by ID
PATCH  /api/groups/:id - Update group
DELETE /api/groups/:id - Delete group
GET    /api/groups/:id/users - Get users for a group
```

### Department Management

```
GET    /api/departments - Get all departments
POST   /api/departments - Create new department
GET    /api/departments/:id - Get department by ID
PATCH  /api/departments/:id - Update department
DELETE /api/departments/:id - Delete department
GET    /api/departments/:id/users - Get users for a department
```

## Handbag & Production Management

### Handbag Management

```
GET    /api/handbags - Get all handbags
POST   /api/handbags - Create new handbag
GET    /api/handbags/:id - Get handbag by ID
PATCH  /api/handbags/:id - Update handbag
DELETE /api/handbags/:id - Delete handbag
```

### Handbag Colors

```
GET    /api/handbags/:id/colors - Get colors for a handbag
POST   /api/handbags/:id/colors - Add color to handbag
GET    /api/colors/:id - Get color by ID
PATCH  /api/colors/:id - Update color
DELETE /api/colors/:id - Delete color
```

### Bag Processes

```
GET    /api/processes - Get all production processes
POST   /api/processes - Create new process
GET    /api/processes/:id - Get process by ID
PATCH  /api/processes/:id - Update process
DELETE /api/processes/:id - Delete process
```

### Color-Process Relationships (Production Rates)

```
GET    /api/colors/:id/processes - Get processes for a color
POST   /api/colors/:id/processes - Add process to color with production rate
GET    /api/colors/:colorId/processes/:processId - Get specific color-process relationship
PATCH  /api/colors/:colorId/processes/:processId - Update production rate
DELETE /api/colors/:colorId/processes/:processId - Remove process from color
```

## Digital Form Management

### Form Management

```
GET    /api/digital-forms - Get all forms (with filtering)
POST   /api/digital-forms - Create new digital form
GET    /api/digital-forms/:id - Get form by ID
PATCH  /api/digital-forms/:id - Update form
DELETE /api/digital-forms/:id - Delete form 
POST   /api/digital-forms/:id/submit - Submit form for approval
GET    /api/digital-forms/:id/entries - Get entries for a form
```

### Form Entries

```
GET    /api/form-entries - Get all form entries (with filtering)
POST   /api/form-entries - Create new form entry
GET    /api/form-entries/:id - Get form entry by ID
PATCH  /api/form-entries/:id - Update form entry
DELETE /api/form-entries/:id - Delete form entry
PATCH  /api/form-entries/:id/hourly-data - Update hourly production data
```

### Hourly Production Data

```
GET    /api/form-entries/:id/hourly-data - Get hourly data for a form entry
POST   /api/form-entries/:id/hourly-data - Add hourly data to form entry
PATCH  /api/form-entries/:id/hourly-data/:hour - Update specific hour's data
DELETE /api/form-entries/:id/hourly-data/:hour - Delete specific hour's data
```

### Production Issues

```
GET    /api/form-entries/:id/issues - Get issues for a form entry
POST   /api/form-entries/:id/issues - Add issue to form entry
PATCH  /api/form-entries/:id/issues/:issueId - Update issue
DELETE /api/form-entries/:id/issues/:issueId - Delete issue
```

## Attendance & Leave Management

### Attendance Tracking

```
GET    /api/attendances - Get all attendances (with filtering)
POST   /api/attendances - Create new attendance record
GET    /api/attendances/:id - Get attendance by ID
PATCH  /api/attendances/:id - Update attendance
DELETE /api/attendances/:id - Delete attendance
GET    /api/attendances/by-user/:userId - Get attendances for a user
GET    /api/attendances/by-date/:date - Get attendances for a date
```

### Leave Management

```
GET    /api/leaves - Get all leave requests (with filtering)
POST   /api/leaves - Create new leave request
GET    /api/leaves/:id - Get leave request by ID
PATCH  /api/leaves/:id - Update leave request
DELETE /api/leaves/:id - Delete leave request
POST   /api/leaves/:id/approve - Approve leave request
POST   /api/leaves/:id/reject - Reject leave request
```

## Approval Workflows

```
GET    /api/approvals - Get all approval requests (with filtering)
POST   /api/approvals - Create new approval request
GET    /api/approvals/:id - Get approval request by ID
PATCH  /api/approvals/:id - Update approval request
POST   /api/approvals/:id/approve - Approve request
POST   /api/approvals/:id/reject - Reject request
GET    /api/approvals/pending - Get pending approval requests
```

## Reporting & Statistics

```
GET    /api/reports/production - Get production statistics
GET    /api/reports/attendance - Get attendance statistics
GET    /api/reports/line-performance - Get line performance data
GET    /api/reports/group-performance - Get group performance data
GET    /api/reports/user-performance - Get user performance data
POST   /api/exports/generate - Generate data export
GET    /api/exports/:id - Download generated export
```

## WebSocket Endpoints

```
ws://your-server/ws/production - Real-time production updates
ws://your-server/ws/dashboard - Dashboard live data
ws://your-server/ws/notifications - User notifications
```