// DTO for PUT /admin/salaries/:salary_id - Update an existing salary record
// Documentation Reference: docs/ADMIN.md Section 6
//
// Used for:
// - Modify salary amount
// - Update allowances or deductions
// - Promotions or salary adjustments
//
// All fields are optional since this is an update operation

export class UpdateSalaryDto {
  // Base salary amount (optional)
  base_salary?: number;

  // Payment frequency (optional)
  payment_frequency?: string;

  // Additional allowances amount (optional)
  allowances?: number;

  // Deductions amount (optional)
  deductions?: number;
}
