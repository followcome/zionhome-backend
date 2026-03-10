// DTO for PATCH /admin/salaries/:id - Update an existing salary record
// Documentation Reference: docs/ADMIN.md Section 6
//
// Used for:
// - Modify salary amount
// - Promotions or salary adjustments
//
// Note: This does NOT overwrite the existing salary record.
// Instead, it creates a NEW row to preserve salary history.

export class UpdateSalaryDto {
  // New salary amount (required)
  amount: number;

  // When this new salary takes effect (required, format: YYYY-MM-DD)
  effectiveDate: string;
}
