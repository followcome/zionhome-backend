# Staff Routes

This document describes all staff-related endpoints in the Employee Management System.
All routes are protected and can only be accessed by authenticated staff users.

---

## Base URL

```text
/staff
```

---

## Authorization

All staff routes require authentication.

```text
Authorization: Bearer <access_token>
```

Only authenticated staff users can access these endpoints.

---

## Staff Capabilities Overview

| Category | Description |
|--------|-------------|
| Profile | View and update personal information |
| Attendance | View attendance records |
| Leave | Request and track leave |
| Salary | View salary and payment history |
| Documents | Access assigned documents |
| Assets | View assigned assets |
| Dashboard | View personal summary |
| Logout | Secure logout |

---

## 1. Dashboard

### GET `/staff/dashboard`

Fetch staff-specific summary.

**Includes**
- Attendance summary
- Leave balance (taken and remaining)
- Salary summary
- Assigned assets
- Recent notifications

---

## 2. Profile Management

### GET `/staff/profile`

View staff profile details.

---

### PUT `/staff/profile`

Update personal information.

```json
{
  "phone": "08012345678",
  "address": "Ibadan, Nigeria"
}
```

---

## 3. Attendance

### GET `/staff/attendance`

View personal attendance records.

Optional query parameters:
```text
month=3
year=2026
```

---

## 4. Leave Management

Staff can request leave and track approval status.

---

### POST `/staff/leaves/request`

Request for leave.

```json
{
  "start_date": "2026-03-10",
  "end_date": "2026-03-14",
  "reason": "Annual leave"
}
```

---

### GET `/staff/leaves`

View all leave requests made by the staff.

---

### GET `/staff/leaves/balance`

View leave summary.

**Response includes**
- Total leave days allocated
- Leave days taken
- Remaining leave days

---

### GET `/staff/leaves/calendar`

View leave data in calendar format.

Optional query parameters:
```text
year=2026
month=3
```

**Color Coding**
- Yellow → Pending
- Green → Approved
- Red → Denied

---

## 5. Salary Management

### GET `/staff/salaries`

View current salary structure.

---

### GET `/staff/salaries/history`

View salary payment history.

Optional query parameters:
```text
year=2026
month=3
```

---

## 6. Documents

### GET `/staff/documents`

View documents assigned to the staff.

---

### GET `/staff/documents/{document_id}`

Download or view a specific document.

---

## 7. Assets

### GET `/staff/assets`

View assets assigned to the staff.

---

### GET `/staff/assets/{asset_id}`

View details of a specific asset.

---

## 8. Notifications 

### GET `/staff/notifications`

View system notifications.

---

## 9. Logout

### POST `/staff/logout`

Logs out the staff user.

### Success Response — `200 OK`

```json
{
  "message": "Staff logged out successfully"
}
```

---

## Notes

- Staff can only access their own data.
- All routes are protected.
- Sensitive operations require authentication.
- Leave requests are subject to admin approval.

---
