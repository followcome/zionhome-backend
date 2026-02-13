// DTO for POST /admin/salaries - Create a salary record
// Documentation Reference: docs/ADMIN.md Section 6
//
// Request Body (as documented):
// {
//   "employee_id": 12,
//   "base_salary": 250000,
//   "payment_frequency": "monthly",
//   "allowances": 50000,
//   "deductions": 20000
// }
//
// Description:
// - Assigns a base salary to an employee
// - Defines payment frequency and allowances

export class CreateSalaryDto {
  // The ID of the employee to create salary record for
  employee_id: number;

  // Base salary amount
  base_salary: number;

  // Payment frequency (e.g., "monthly", "weekly", "bi-weekly")
  payment_frequency: string;

  // Additional allowances amount
  allowances: number;

  // Deductions amount
  deductions: number;
}
