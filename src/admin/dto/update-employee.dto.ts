// DTO for PATCH /admin/employees/:id - Update an employee's details
// All fields are optional to support partial updates
//
// Note: 'password' is intentionally NOT included in this DTO
// Password changes should go through a separate secure flow (e.g., reset password)
// This prevents accidental password exposure or unauthorized password changes

export class UpdateEmployeeDto {
  // Employee's first name (optional)
  firstName?: string;

  // Employee's last name (optional)
  lastName?: string;

  // Employee's email address (optional)
  // If provided, service will check it's not already taken by another user
  email?: string;

  // Employee's role (optional)
  // Typically 'employee' or 'admin'
  role?: string;

  // Lock status (optional)
  // When true, the employee cannot log in
  isLocked?: boolean;
}
