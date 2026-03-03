// DTO for POST /admin/employees - Create a new employee
// This DTO defines the shape of data required to create an employee
//
// Note: 'role' is intentionally NOT included in this DTO
// The service layer will force role to 'employee' for security reasons
// This prevents privilege escalation via the API

export class CreateEmployeeDto {
  // Employee's email address (must be unique)
  email: string;

  // Employee's password (will be hashed before storage)
  password: string;

  // Employee's first name
  firstName: string;

  // Employee's last name
  lastName: string;
}
