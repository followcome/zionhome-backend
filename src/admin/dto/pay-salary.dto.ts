// DTO for POST /admin/salaries/pay - Process salary payment
// Documentation Reference: docs/ADMIN.md Section 6
//
// Request Body (camelCase):
// {
//   "employeeId": 12,
//   "month": 3,
//   "year": 2026,
//   "amountPaid": 280000,
//   "paymentDate": "2026-03-30"
// }

export class PaySalaryDto {
  // The ID of the employee being paid
  employeeId: number;

  // The month for which salary is being paid (1-12)
  month: number;

  // The year for which salary is being paid
  year: number;

  // The actual amount paid (can be any amount, doesn't have to match salary structure)
  amountPaid: number;

  // The date of payment (ISO date string format: YYYY-MM-DD)
  paymentDate: string;
}
