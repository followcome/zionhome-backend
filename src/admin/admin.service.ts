// Import Injectable, BadRequestException, and NotFoundException from NestJS
// Injectable marks this class as a provider that can be injected into other classes
// BadRequestException is thrown when request data is invalid (returns 400 status)
// NotFoundException is thrown when a requested resource doesn't exist (returns 404 status)
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

// Import InjectRepository decorator from TypeORM
// This allows us to inject the User repository into this service
import { InjectRepository } from '@nestjs/typeorm';

// Import Repository type and Not operator from TypeORM
// Repository provides methods to interact with the database (find, save, create, etc.)
// Not is used to exclude the current user when checking for duplicate emails
import { Repository, Not } from 'typeorm';

// Import bcrypt for password hashing
// bcrypt is a secure hashing algorithm designed for passwords
import * as bcrypt from 'bcrypt';

// Import User entity - represents the users table in the database
import { User } from '../entities/user.entity';

// Import DTOs - define the shape of data for employee operations
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

// @Injectable() marks this class as a "provider"
// Providers contain business logic and can be shared across the app
@Injectable()
export class AdminService {
  // Constructor with dependency injection
  // @InjectRepository(User) tells NestJS to inject the User repository
  // The repository is stored as a private readonly property
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============================================
  // EMPLOYEE MANAGEMENT METHODS
  // ============================================

  /**
   * Create a new employee.
   *
   * @param createEmployeeDto - The data for creating the employee
   *   - email: Employee's email address (must be unique)
   *   - password: Employee's password (will be hashed)
   *   - first_name: Employee's first name
   *   - last_name: Employee's last name
   *
   * @returns The created employee object (without password)
   * @throws BadRequestException if email already exists
   */
  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
  ): Promise<Omit<User, 'password'>> {
    // Step 1: Extract fields from the DTO
    // Destructuring makes the code cleaner and more readable
    const { email, password, first_name, last_name } = createEmployeeDto;

    // Step 2: Check if a user with this email already exists
    // findOne returns the user if found, or null if not found
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    // Step 3: If user exists, throw BadRequestException
    // This prevents duplicate email addresses in the system
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Step 4: Hash the password using bcrypt
    // The second argument (10) is the salt rounds - higher = more secure but slower
    // 10 is a good balance between security and performance
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 5: Create a new User entity using the repository
    // create() builds an entity instance but does NOT save to database yet
    // This allows us to set all properties before persisting
    const newEmployee = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName: first_name,
      lastName: last_name,
      role: 'employee', // Force role to 'employee' - never trust client input for roles
    });

    // Step 6: Save the new employee to the database
    // save() persists the entity and returns the saved entity with generated fields (like id)
    const savedEmployee = await this.userRepository.save(newEmployee);

    // Step 7: Remove password from the returned object
    // We use destructuring to separate password from the rest of the properties
    // The underscore (_) is a convention indicating we're intentionally ignoring this variable
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...employeeWithoutPassword } = savedEmployee;

    // Step 8: Return the employee object without the password
    // This prevents the hashed password from being exposed in the API response
    return employeeWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Update an employee's details (partial update).
   *
   * @param id - The employee's user ID
   * @param updateEmployeeDto - Fields to update (all optional):
   *   - firstName: Employee's first name
   *   - lastName: Employee's last name
   *   - email: Employee's email (checked for uniqueness)
   *   - role: Employee's role
   *   - isLocked: Lock status
   *
   * @returns The updated employee object (without password)
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if new email is already taken by another user
   */
  async updateEmployee(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<Omit<User, 'password'>> {
    // Step 1: Convert id from string to number
    // URL parameters come as strings, but our database uses numeric IDs
    const employeeId = parseInt(id, 10);

    // Step 2: Check if the employee exists
    // findOne returns the user if found, or null if not found
    const existingEmployee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 3: If employee doesn't exist, throw NotFoundException
    // This returns a 404 status code to the client
    if (!existingEmployee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Step 4: If email is being changed, check it's not already taken
    // We need to exclude the current employee from the check (they can keep their own email)
    if (updateEmployeeDto.email && updateEmployeeDto.email !== existingEmployee.email) {
      const emailTaken = await this.userRepository.findOne({
        where: {
          email: updateEmployeeDto.email,
          id: Not(employeeId), // Exclude current employee from the check
        },
      });

      // If another user has this email, throw BadRequestException
      if (emailTaken) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Step 5: Perform the partial update using TypeORM's update method
    // This only updates the fields that are provided in the DTO
    // Empty/undefined fields are ignored
    await this.userRepository.update(employeeId, { ...updateEmployeeDto });

    // Step 6: Fetch the updated employee from the database
    // We need to fetch again because update() doesn't return the updated entity
    const updatedEmployee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 7: Safety check - should never happen since we verified existence in Step 2
    // But TypeScript requires this check since findOne can return null
    if (!updatedEmployee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Step 8: Remove password from the returned object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...employeeWithoutPassword } = updatedEmployee;

    // Step 9: Return the updated employee without password
    return employeeWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Soft delete an employee (set deletedAt timestamp instead of removing).
   *
   * @param id - The employee's user ID
   * @returns Success message confirming the employee was deactivated
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if trying to delete an admin user
   */
  async softDeleteEmployee(id: string): Promise<{ message: string }> {
    // Step 1: Convert id from string to number
    const employeeId = parseInt(id, 10);

    // Step 2: Check if the employee exists
    // We use findOne to get the user's details (including role)
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 3: If employee doesn't exist, throw NotFoundException
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Step 4: Check if the user is an admin
    // Admins cannot delete other admins - this is a security measure
    if (employee.role === 'admin') {
      throw new BadRequestException('Cannot deactivate an admin user');
    }

    // Step 5: Perform soft delete using TypeORM's softDelete method
    // This sets the deletedAt column to the current timestamp
    // The record remains in the database but is excluded from normal queries
    await this.userRepository.softDelete(employeeId);

    // Step 6: Return success message
    return {
      message: `Employee ${employee.email} has been deactivated successfully`,
    };
  }

  // ============================================
  // ATTENDANCE MANAGEMENT METHODS
  // ============================================

  /**
   * Get employee attendance records.
   *
   * TODO: Implementation pending - requires:
   *   - Attendance entity/repository to be defined
   *   - Query parameters for filtering (documented specification needed)
   *   - Response structure specification
   */
  async getAttendance(): Promise<{ message: string }> {
    // Placeholder response until documentation specifies:
    // - Attendance entity structure
    // - Query parameters (filters, pagination)
    // - Response format
    return {
      message: 'Get attendance endpoint - implementation pending documentation',
    };
  }

  /**
   * Generate attendance reports.
   *
   * TODO: Implementation pending - requires:
   *   - Report format specification (JSON, CSV, PDF)
   *   - Report parameters (date range, grouping, metrics)
   *   - Response structure specification
   */
  async getAttendanceReports(): Promise<{ message: string }> {
    // Placeholder response until documentation specifies:
    // - Report format and structure
    // - Query parameters
    // - Response format
    return {
      message:
        'Get attendance reports endpoint - implementation pending documentation',
    };
  }

  // ============================================
  // LEAVE MANAGEMENT METHODS (ADMIN)
  // ============================================

  /**
   * Allocate leave days to an employee.
   *
   * @param data - The allocation data containing:
   *   - employee_id: The ID of the employee
   *   - total_leave_days: Number of leave days to allocate
   *   - year: The year for which leave is allocated
   *
   * TODO: Implementation pending - requires:
   *   - LeaveAllocation entity/repository to be defined
   *   - Validation rules (max days, valid year range)
   *   - Error handling for employee not found
   *   - Response structure specification
   *   - Clarification: does this create new or update existing allocation?
   */
  async allocateLeave(data: {
    employee_id: number;
    total_leave_days: number;
    year: number;
  }): Promise<{ message: string; data: typeof data }> {
    // Placeholder response - echoes received data for verification
    // Actual implementation will:
    // 1. Validate employee exists
    // 2. Create or update leave allocation record
    // 3. Return appropriate response (structure TBD in docs)
    return {
      message:
        'Allocate leave endpoint - implementation pending documentation',
      data: data, // Echo back received data for verification during development
    };
  }

  /**
   * Get all leave requests submitted by employees.
   *
   * TODO: Implementation pending - requires:
   *   - LeaveRequest entity/repository to be defined
   *   - Query parameters for filtering (status, employee, date range)
   *   - Pagination specification
   *   - Response structure specification
   */
  async getLeaveRequests(): Promise<{ message: string }> {
    // Placeholder response until documentation specifies:
    // - LeaveRequest entity structure
    // - Query parameters (filters, pagination)
    // - Response format
    return {
      message:
        'Get leave requests endpoint - implementation pending documentation',
    };
  }

  /**
   * Approve a leave request.
   *
   * @param requestId - The ID of the leave request to approve
   *
   * TODO: Implementation pending - requires:
   *   - LeaveRequest entity/repository to be defined
   *   - Status update logic
   *   - Leave balance deduction logic (if applicable)
   *   - Notification mechanism (if applicable)
   *   - Response structure specification
   */
  async approveLeaveRequest(
    requestId: string,
  ): Promise<{ message: string; request_id: string }> {
    // Placeholder response
    // Actual implementation will:
    // 1. Validate request exists and is pending
    // 2. Update status to 'approved'
    // 3. Deduct from leave balance (if applicable)
    // 4. Trigger notification (if applicable)
    // 5. Return appropriate response (structure TBD in docs)
    return {
      message:
        'Approve leave request endpoint - implementation pending documentation',
      request_id: requestId,
    };
  }

  /**
   * Deny a leave request.
   *
   * @param requestId - The ID of the leave request to deny
   *
   * TODO: Implementation pending - requires:
   *   - LeaveRequest entity/repository to be defined
   *   - Status update logic
   *   - Denial reason handling (often required for audit)
   *   - Notification mechanism (if applicable)
   *   - Response structure specification
   */
  async denyLeaveRequest(
    requestId: string,
  ): Promise<{ message: string; request_id: string }> {
    // Placeholder response
    // Actual implementation will:
    // 1. Validate request exists and is pending
    // 2. Update status to 'denied'
    // 3. Store denial reason (if provided/required)
    // 4. Trigger notification (if applicable)
    // 5. Return appropriate response (structure TBD in docs)
    return {
      message:
        'Deny leave request endpoint - implementation pending documentation',
      request_id: requestId,
    };
  }
}


