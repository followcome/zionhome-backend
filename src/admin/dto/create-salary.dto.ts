// DTO for POST /admin/salaries - Create a salary record
//
// Request Body (camelCase):
// {
//   "employeeId": 3,
//   "amount": 200000,
//   "effectiveDate": "2026-01-01"
// }
//
// Description:
// - Creates a salary structure for an employee
// - Stores the amount and when it takes effect

export class CreateSalaryDto {
  // The ID of the employee to create salary record for
  employeeId: number;

  // Salary amount (stored as decimal in database)
  amount: number;

  // The date when this salary takes effect (YYYY-MM-DD format)
  effectiveDate: string;
}
