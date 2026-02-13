// DTO for GET /admin/salaries/reports query parameters
// Documentation Reference: docs/ADMIN.md Section 6
//
// Optional parameters (as documented):
// - month: Filter by month (1-12)
// - year: Filter by year
// - role: Filter by employee role
//
// Description:
// - Generate payroll reports
// - Total salary paid per month or year
// - Breakdown by department or role

export class SalaryReportQueryDto {
  // Filter by month (1-12) (optional)
  month?: number;

  // Filter by year (optional)
  year?: number;

  // Filter by employee role (optional)
  role?: string;
}
