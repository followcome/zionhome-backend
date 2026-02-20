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
|-----------|------------|
| Employees | Manage employee records and roles |
| Attendance | View and generate attendance reports |
| Leave | Manage employee leave and approvals |
| Salary | Manage salary and payroll |
| Procurements | Manage newly acquired equipment |
| Bills | Manage organizational expenses |
| Documents | Manage uploaded documents |
| Assets | Manage company-owned assets |
| Dashboard | View system summary |
| Settings | Manage system configuration |
| Logout | Secure admin logout |

---

## 1. Dashboard

### GET `/admin/dashboard`

Fetch system summary statistics.

**Includes**
- Total employees
- Employees currently on leave
- Attendance summary
- Monthly payroll total
- Total assets
- Recent procurements
- Outstanding bills

---

## 2. Employee Management

### POST `/admin/employees`
Add a new employee.

### PUT `/admin/employees/{employee_id}`
Update employee details.

### DELETE `/admin/employees/{employee_id}`
Deactivate or delete an employee.

### POST `/admin/employees/{employee_id}/roles`
Assign roles and permissions.

---

## 3. Attendance Management

### GET `/admin/attendance`
View attendance records.

### GET `/admin/attendance/reports`
Generate attendance reports.

---

## 4. Leave Management

### POST `/admin/leaves/allocate`
Allocate leave days for a specific year.

```json
{
  "employee_id": 12,
  "total_leave_days": 20,
  "year": 2026
}
```

### GET `/admin/leaves/requests`
View leave requests.

### PUT `/admin/leaves/requests/{request_id}/approve`
Approve leave request.

### PUT `/admin/leaves/requests/{request_id}/deny`
Deny leave request.

### GET `/admin/leaves/calendar`
Fetch leave data for calendar view.

Optional query parameters:
```text
year=2026
month=3
employee_id=12
```

---

## 5. Salary Management

### POST `/admin/salaries`
Create salary structure.

### PUT `/admin/salaries/{salary_id}`
Update salary structure.

### GET `/admin/salaries/{employee_id}`
View employee salary structure.

### POST `/admin/salaries/pay`
Process salary payment.

```json
{
  "employee_id": 12,
  "month": 3,
  "year": 2026,
  "amount_paid": 280000,
  "payment_date": "2026-03-30"
}
```

### GET `/admin/salaries/history`
View payment history.
Optional parameters: employee_id, month, year.

### GET `/admin/salaries/reports`
Generate payroll reports.
Optional parameters:
```text
month=3
year=2026
department_id=2
role=manager
```

### GET `/admin/salaries/reports/export`
Export payroll report (PDF or Excel).

---

## 6. Procurements Management

### POST `/admin/procurements`
Add new equipment procurement.

```json
{
  "equipment_name": "Laptop",
  "unit_price": 350000,
  "quantity": 5,
  "added_by": 1
}
```

### GET `/admin/procurements`
Fetch procurement records.

### GET `/admin/procurements/{procurement_id}`
Fetch single procurement.

### DELETE `/admin/procurements/{procurement_id}`
Delete procurement record.

---

## 7. Bills Management

### POST `/admin/bills`
Create new bill record.

```json
{
  "description": "Office electricity bill - March",
  "cost": 120000,
  "receipt_url": "https://example.com/receipt.pdf",
  "added_by": 1
}
```

### GET `/admin/bills`
Fetch all bills.

### GET `/admin/bills/{bill_id}`
Fetch single bill.

### DELETE `/admin/bills/{bill_id}`
Delete bill record.

---

## 8. Documents Management

### POST `/admin/documents`
Upload document.

```json
{
  "title": "Company Policy 2026",
  "file_url": "https://example.com/docs/policy.pdf",
  "uploaded_by": 1
}
```

### POST `/admin/documents/{document_id}/assign`
Assign document to employee.

### GET `/admin/documents`
Fetch documents.

### DELETE `/admin/documents/{document_id}`
Delete document.

---

## 9. Assets Management

### POST `/admin/assets`
Add new asset.

```json
{
  "asset_name": "Dell Laptop",
  "serial_number": "DL-2026-001"
}
```

### PUT `/admin/assets/{asset_id}`
Update asset details.

### POST `/admin/assets/{asset_id}/assign`
Assign asset to employee.

### GET `/admin/assets`
Fetch assets.

### GET `/admin/assets/{asset_id}`
Fetch single asset.

### DELETE `/admin/assets/{asset_id}`
Delete asset record.

---

## 10. Settings

### GET `/admin/settings`
View system settings.

### PUT `/admin/settings`
Update system settings.

### GET `/admin/settings/roles`
View roles.

### POST `/admin/settings/roles`
Create or update roles.

---

## 11. Logout

### POST `/admin/logout`

```json
{
  "message": "Admin logged out successfully"
}
```

---

## Notes

- All admin routes are role-protected.
- Admin actions should be logged.
- Sensitive endpoints should be rate-limited.

