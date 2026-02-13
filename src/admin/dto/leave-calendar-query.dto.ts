// DTO for GET /admin/leaves/calendar query parameters
// Documentation Reference: docs/ADMIN.md Section 5
//
// Query parameters:
// - year (optional): The year to fetch leave calendar for
// - month (optional): The month of the year (1-12)
// - employee_id (optional): Filter by specific employee
//
// Behavior (as documented):
// - If no parameters provided, defaults to current month of current year (logic TBD)
// - If employee_id is not supplied, fetches all employees on leave
// - If employee_id is supplied, fetches only that employee's leave information

export class LeaveCalendarQueryDto {
  // The year to fetch leave calendar for
  // Example: 2026
  year?: number;

  // The month of the year (1-12)
  // Example: 3 for March
  month?: number;

  // Filter by specific employee ID
  // Example: 11235
  employee_id?: number;
}
