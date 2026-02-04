# Admin Routes

This document describes all admin-related endpoints in the Employee Management System.
All routes are protected and can only be accessed by users with admin privileges.

---

## Base URL

```text
/admin
```

---

## Authorization

All admin routes require authentication.

```text
Authorization: Bearer <access_token>
```

Only users with the `admin` role are authorized to access these endpoints.

---

## Admin Capabilities Overview

| Category | Description |
|--------|-------------|
| Employees | Manage employee records and roles |
| Settings | Manage system configuration |
| Logout | Secure admin logout |
| Attendance | View and generate attendance reports |
| Leave | Manage employee leave and approvals |


---


## 1. Employee Management

### POST `/admin/employees`

Add a new employee.

---

### PUT `/admin/employees/{employee_id}`

Update employee details.

---

### DELETE `/admin/employees/{employee_id}`

Deactivate or delete an employee.

---

### POST `/admin/employees/{employee_id}/roles`

Assign roles and permissions to an employee.

---


## 2. Settings

### GET `/admin/settings`

View system settings.

---

### PUT `/admin/settings`

Update system settings.

---

### GET `/admin/settings/roles`

View roles and permissions.

---

### POST `/admin/settings/roles`

Create or update roles and permissions.

---

## 3. Logout

### POST `/admin/logout`

Securely logs out the admin user.

### Success Response — `200 OK`

```json
{
  "message": "Admin logged out successfully"
}
```

---

## Note

- All admin routes are role-protected.
- Admin actions should be logged for auditing.
- Sensitive routes should be rate-limited.

---

## 4. Attendance Management

### GET `/admin/attendance`
View employee attendance records.

### GET `/admin/attendance/reports`
Generate attendance reports.

---

## 5. Leave Management (Admin)

The admin manages employee leave allocation and approvals.

### POST `/admin/leaves/allocate`

Allocate leave days to an employee.

```json
{
  "employee_id": 12,
  "total_leave_days": 20,
  "year": 2026
}
```

---

### GET `/admin/leaves/requests`

View all leave requests submitted by employees.

---

### PUT `/admin/leaves/requests/{request_id}/approve`

Approve a leave request.

---

### PUT `/admin/leaves/requests/{request_id}/deny`

Deny a leave request.

<!-- There is a one more route that should be on leave but I am yet to resolve its structure. -->

---