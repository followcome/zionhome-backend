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
| Salary | Manage Salary and payroll |


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
<!-- This route fetches all the employees on leave in a given month if the employee_id is not supplied.
If it is supplied, it only fetch the information of that particular employee.
The month holds the month of the year. 3 will be March.
The month and employee_id are optional.
If the month and year and employee_id are not supplied, it fetches the information of all employees on leave in the current month of the year.   -->
### GET `admin/leaves/calendar?year=2026&month=3&employee_id=11235`
Fetch employees on leave.

<!-- You can use query string or route parameter. -->


---
## 6. Salary Management

The admin manages employee salary records, payroll processing, and salary history.
All salary-related actions are restricted to admin users.

---

### POST `/admin/salaries`

Create a salary record for an employee.

**Description**
- Assigns a base salary to an employee
- Defines payment frequency and allowances

**Request Body**

```json
{
  "employee_id": 12,
  "base_salary": 250000,
  "payment_frequency": "monthly",
  "allowances": 50000,
  "deductions": 20000
}
```

### PUT `/admin/salaries/{salary_id}`
Update an existing salary record.
This is to 
- Modify salary amount

- Update allowances or deductions

- Used for promotions or salary adjustments

---

### GET `/admin/salaries/{employee_id}`
View the current salary structure of an employee.

### Salary payment section
Salary Payment section

### POST `/admin/salaries/pay`
This is body of the post

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

View salary payment history.
Optional query parameters (employee_id, month and year) can be added.
When no query parameter is added, it fetches the payment history of all emaployees in that year.

The example below will fetch the payment of the employee with employee_id of 12 in Fecruary, 2026.
```json
employee_id=12
month=2
year=2026

```

---

### GET `/admin/salaries/reports`

Generate payroll reports.
Description
- Total salary paid per month or year
- Breakdown by department or role

Optional parameters
```json
month=3
year=2026
role

```


---

### GET `/admin/salaries/reports/export`

Export payroll reports.
Download the payroll data, either in Excel or PDF.

