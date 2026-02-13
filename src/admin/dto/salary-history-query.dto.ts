// DTO for GET /admin/salaries/history query parameters
// Documentation Reference: docs/ADMIN.md Section 6
//
// Optional query parameters:
// - employee_id: Filter by specific employee
// - month: Filter by month (1-12)
// - year: Filter by year
//
// Behavior (as documented):
// - When no query parameter is added, fetches payment history of all employees in that year
// - Example: employee_id=12&month=2&year=2026 fetches payment of employee 12 in February 2026

export class SalaryHistoryQueryDto {
  // Filter by specific employee ID (optional)
  employee_id?: number;

  // Filter by month (1-12) (optional)
  month?: number;

  // Filter by year (optional)
  year?: number;
}
