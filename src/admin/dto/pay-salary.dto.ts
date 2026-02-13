// DTO for POST /admin/salaries/pay - Process salary payment
// Documentation Reference: docs/ADMIN.md Section 6
//
// Request Body (as documented):
// {
//   "employee_id": 12,
//   "month": 3,
//   "year": 2026,
//   "amount_paid": 280000,
//   "payment_date": "2026-03-30"
// }

export class PaySalaryDto {
  // The ID of the employee being paid
  employee_id: number;

  // The month for which salary is being paid (1-12)
  month: number;

  // The year for which salary is being paid
  year: number;

  // The actual amount paid
  amount_paid: number;

  // The date of payment (ISO date string format: YYYY-MM-DD)
  payment_date: string;
}
