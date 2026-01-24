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

