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

// Import LeaveAllocation entity - represents the leave_allocations table
import { LeaveAllocation } from '../entities/leave-allocation.entity';

// Import LeaveRequest entity - represents the leave_requests table
import { LeaveRequest } from '../entities/leave-request.entity';

// Import Attendance entity - represents the attendances table
import { Attendance } from '../entities/attendance.entity';

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

    @InjectRepository(LeaveAllocation)
    private readonly leaveAllocationRepository: Repository<LeaveAllocation>,

    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,

    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
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
    const { email, password,firstName, lastName} = createEmployeeDto;

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
      firstName,
      lastName,
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

  /**
   * Assign a role to an employee.
   *
   * @param id - The employee's user ID
   * @param role - The role string to assign (e.g., "manager", "supervisor")
   * @returns Updated employee object without password and refreshToken
   * @throws NotFoundException if employee doesn't exist or is soft-deleted
   * @throws BadRequestException if trying to assign 'admin' role
   */
  async assignRole(
    id: string,
    role: string,
  ): Promise<Omit<User, 'password' | 'refreshToken'>> {
    // Step 1: Convert id from string to number
    const employeeId = parseInt(id, 10);

    // Step 2: Check if 'admin' role is being assigned
    // This is a security measure - admin role should never be assigned through this endpoint
    if (role.toLowerCase() === 'admin') {
      throw new BadRequestException('Cannot assign admin role through this endpoint');
    }

    // Step 3: Find the employee by ID
    // TypeORM automatically excludes soft-deleted records
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 4: If employee doesn't exist (or is soft-deleted), throw NotFoundException
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Step 5: Update the role
    await this.userRepository.update(employeeId, { role });

    // Step 6: Fetch the updated employee
    const updatedEmployee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 7: Safety check (should never happen)
    if (!updatedEmployee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Step 8: Remove sensitive fields from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...employeeData } = updatedEmployee;

    // Step 9: Return the updated employee without sensitive fields
    return employeeData as Omit<User, 'password' | 'refreshToken'>;
  }

  // ============================================
  // ATTENDANCE MANAGEMENT METHODS
  // ============================================

  /**
   * Get employee attendance records.
   *
   * @param filters - Optional query parameters:
   *   - date: Filter by specific date (YYYY-MM-DD format)
   *   - employeeId: Filter by specific employee ID
   *   - month: Filter by month (1-12)
   *   - year: Filter by year
   *
   * @returns Array of attendance records with employee details
   */
  async getAttendance(filters?: {
    date?: string;
    employeeId?: number;
    month?: number;
    year?: number;
  }): Promise<{
    message: string;
    count: number;
    attendance: Array<{
      id: number;
      employeeId: number;
      employeeName: string;
      employeeEmail: string;
      date: Date;
      createdAt: Date;
    }>;
  }> {
    // Step 1: Create a query builder for complex queries with joins
    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      // Step 2: Join with user table to get employee details
      // 'INNER JOIN' excludes attendance records where employee is soft-deleted
      .innerJoinAndSelect('attendance.employee', 'employee')
      // Step 3: Exclude soft-deleted employees
      .where('employee.deletedAt IS NULL');

    // Step 4: Apply optional date filter (exact date match)
    // Date format expected: YYYY-MM-DD
    if (filters?.date) {
      queryBuilder.andWhere('attendance.date = :date', { date: filters.date });
    }

    // Step 5: Apply optional employeeId filter
    if (filters?.employeeId) {
      queryBuilder.andWhere('attendance.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    // Step 6: Apply optional month filter
    // Extract the month from the date and compare
    if (filters?.month) {
      queryBuilder.andWhere('EXTRACT(MONTH FROM attendance.date) = :month', {
        month: filters.month,
      });
    }

    // Step 7: Apply optional year filter
    // Extract the year from the date and compare
    if (filters?.year) {
      queryBuilder.andWhere('EXTRACT(YEAR FROM attendance.date) = :year', {
        year: filters.year,
      });
    }

    // Step 8: Order by date descending (newest first)
    queryBuilder.orderBy('attendance.date', 'DESC');

    // Step 9: Execute the query
    const attendanceRecords = await queryBuilder.getMany();

    // Step 10: Transform results to include employee details
    // Every record means the employee was present - no status needed
    const formattedAttendance = attendanceRecords.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
      employeeEmail: record.employee.email,
      date: record.date,
      createdAt: record.createdAt,
    }));

    // Step 11: Return the response with count
    return {
      message: 'Attendance records retrieved successfully',
      count: formattedAttendance.length,
      attendance: formattedAttendance,
    };
  }

  /**
   * Generate attendance reports.
   *
   * @param filters - Optional query parameters:
   *   - month: Filter by month (1-12), defaults to current month
   *   - year: Filter by year, defaults to current year
   *   - employeeId: Generate report for specific employee only
   *
   * @returns Attendance report with per-employee summary
   */
  async getAttendanceReports(filters?: {
    month?: number;
    year?: number;
    employeeId?: number;
  }): Promise<{
    message: string;
    report: {
      period: { month: number; year: number; monthName: string };
      totalWorkingDays: number;
      totalEmployees: number;
      employeeReports: Array<{
        employeeId: number;
        employeeName: string;
        employeeEmail: string;
        presentDays: number;
        onLeaveDays: number;
        absentDays: number;
        attendancePercentage: number;
      }>;
    };
  }> {
    // Step 1: Get current date for defaults
    const now = new Date();
    const reportMonth = filters?.month || now.getMonth() + 1; // getMonth() is 0-indexed
    const reportYear = filters?.year || now.getFullYear();

    // Step 2: Get month name for display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[reportMonth - 1];

    // Step 3: Calculate total working days in the month (excluding Sat/Sun)
    const totalWorkingDays = this.calculateWorkingDays(reportYear, reportMonth);

    // Step 4: Build query to get all employees (or specific employee)
    const employeeQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'employee' })
      .andWhere('user.deletedAt IS NULL');

    // Step 5: Apply optional employeeId filter
    if (filters?.employeeId) {
      employeeQuery.andWhere('user.id = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    const employees = await employeeQuery.getMany();

    // Step 6: Calculate start and end dates for the period
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0); // Last day of month

    // Step 7: Format dates for SQL queries (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Step 8: Build employee reports
    const employeeReports = await Promise.all(
      employees.map(async (employee) => {
        // Step 8a: Count attendance records for this employee in the period
        const presentDays = await this.attendanceRepository
          .createQueryBuilder('attendance')
          .where('attendance.employeeId = :employeeId', { employeeId: employee.id })
          .andWhere('attendance.date >= :startDate', { startDate: startDateStr })
          .andWhere('attendance.date <= :endDate', { endDate: endDateStr })
          .getCount();

        // Step 8b: Calculate approved leave days in the period
        // We need to count days from approved leave requests that fall within this period
        const onLeaveDays = await this.calculateApprovedLeaveDays(
          employee.id,
          startDate,
          endDate,
        );

        // Step 8c: Calculate absent days
        // Absent = Working days - Present - On Leave
        const absentDays = Math.max(0, totalWorkingDays - presentDays - onLeaveDays);

        // Step 8d: Calculate attendance percentage
        // Avoid division by zero
        const attendancePercentage =
          totalWorkingDays > 0
            ? Math.round((presentDays / totalWorkingDays) * 100 * 100) / 100
            : 0;

        return {
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeEmail: employee.email,
          presentDays,
          onLeaveDays,
          absentDays,
          attendancePercentage,
        };
      }),
    );

    // Step 9: Sort by attendance percentage descending (best attendance first)
    employeeReports.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    // Step 10: Return the report
    return {
      message: 'Attendance report generated successfully',
      report: {
        period: {
          month: reportMonth,
          year: reportYear,
          monthName: monthName,
        },
        totalWorkingDays,
        totalEmployees: employeeReports.length,
        employeeReports,
      },
    };
  }

  /**
   * Helper: Calculate working days in a month (excluding Saturdays and Sundays).
   *
   * @param year - The year
   * @param month - The month (1-12)
   * @returns Number of working days (Mon-Fri)
   */
  private calculateWorkingDays(year: number, month: number): number {
    let workingDays = 0;

    // Get the number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Loop through each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Count only weekdays (Monday = 1 to Friday = 5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  /**
   * Helper: Calculate approved leave days for an employee within a date range.
   *
   * @param employeeId - The employee's ID
   * @param startDate - Start of the period
   * @param endDate - End of the period
   * @returns Number of approved leave days in the period
   */
  private async calculateApprovedLeaveDays(
    employeeId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Get all approved leave requests for this employee
    // that overlap with the given period
    const leaveRequests = await this.leaveRequestRepository
      .createQueryBuilder('leave')
      .where('leave.employeeId = :employeeId', { employeeId })
      .andWhere('leave.status = :status', { status: 'approved' })
      // Leave request overlaps with period if:
      // startDate <= period end AND endDate >= period start
      .andWhere('leave.startDate <= :endDate', {
        endDate: endDate.toISOString().split('T')[0],
      })
      .andWhere('leave.endDate >= :startDate', {
        startDate: startDate.toISOString().split('T')[0],
      })
      .getMany();

    // Calculate total leave days that fall within the period
    let totalLeaveDays = 0;

    for (const leave of leaveRequests) {
      // Determine the actual overlap with our period
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      // Get the effective start and end within our period
      const effectiveStart = leaveStart < startDate ? startDate : leaveStart;
      const effectiveEnd = leaveEnd > endDate ? endDate : leaveEnd;

      // Count working days in this overlap (exclude weekends)
      const diffTime = effectiveEnd.getTime() - effectiveStart.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end

      // Count only weekdays in the leave period
      for (let i = 0; i < diffDays; i++) {
        const checkDate = new Date(effectiveStart);
        checkDate.setDate(effectiveStart.getDate() + i);
        const dayOfWeek = checkDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          totalLeaveDays++;
        }
      }
    }

    return totalLeaveDays;
  }

  // ============================================
  // LEAVE MANAGEMENT METHODS (ADMIN)
  // ============================================

  /**
   * Allocate leave days to an employee.
   *
   * @param data - The allocation data containing:
   *   - employeeId: The ID of the employee
   *   - totalLeaveDays: Number of leave days to allocate
   *   - year: The year for which leave is allocated
   *
   * @returns The created leave allocation (without sensitive user data)
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if employee is an admin
   * @throws BadRequestException if allocation already exists for this employee and year
   */
  async allocateLeave(data: {
    employeeId: number;
    totalLeaveDays: number;
    year: number;
  }): Promise<{
    message: string;
    allocation: Omit<LeaveAllocation, 'employee'> & {
      employee: Omit<User, 'password' | 'refreshToken'>;
    };
  }> {
    // Step 1: Extract fields from input data
    const { employeeId, totalLeaveDays, year } = data;

    // Step 2: Check if the employee exists
    // findOne returns the user if found, or null if not found
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 3: If employee doesn't exist, throw NotFoundException (404)
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 4: Check if the user is an admin
    // Admins should not have leave allocations - only employees
    if (employee.role === 'admin') {
      throw new BadRequestException(
        'Cannot allocate leave to admin users. Only employees can receive leave allocations.',
      );
    }

    // Step 5: Check if an allocation already exists for this employee and year
    // This prevents duplicate allocations for the same year
    const existingAllocation = await this.leaveAllocationRepository.findOne({
      where: {
        employeeId: employeeId,
        year: year,
      },
    });

    // Step 6: If allocation exists, throw BadRequestException (400)
    if (existingAllocation) {
      throw new BadRequestException(
        `Leave already allocated for this employee for ${year}`,
      );
    }

    // Step 7: Create a new LeaveAllocation entity
    // remainingDays is set equal to totalLeaveDays since no days are used yet
    // usedDays defaults to 0 (as defined in the entity)
    const newAllocation = this.leaveAllocationRepository.create({
      employeeId: employeeId,
      totalLeaveDays: totalLeaveDays,
      usedDays: 0,
      remainingDays: totalLeaveDays,
      year: year,
    });

    // Step 8: Save the allocation to the database
    const savedAllocation =
      await this.leaveAllocationRepository.save(newAllocation);

    // Step 9: Remove sensitive fields from the employee data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...employeeData } = employee;

    // Step 10: Return success message with the created allocation
    return {
      message: `Successfully allocated ${totalLeaveDays} leave days to employee for ${year}`,
      allocation: {
        ...savedAllocation,
        employee: employeeData as Omit<User, 'password' | 'refreshToken'>,
      },
    };
  }

  /**
   * Get all leave requests submitted by employees.
   *
   * @param filters - Optional query parameters for filtering:
   *   - status: Filter by 'pending', 'approved', or 'denied'
   *   - employeeId: Filter by specific employee ID
   *   - year: Filter by year based on the startDate
   *
   * @returns Array of leave requests with employee details (without sensitive data)
   */
  async getLeaveRequests(filters?: {
    status?: string;
    employeeId?: number;
    year?: number;
  }): Promise<{
    message: string;
    count: number;
    leaveRequests: Array<
      Omit<LeaveRequest, 'employee'> & {
        employee: { id: number; firstName: string; lastName: string; email: string };
      }
    >;
  }> {
    // Step 1: Create a query builder for complex queries with joins
    // Query builder gives us more control over the SQL query
    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      // Step 2: Join with user table to get employee details
      // 'INNER JOIN' excludes leave requests where employee is soft-deleted
      .innerJoinAndSelect('leaveRequest.employee', 'employee')
      // Step 3: Exclude soft-deleted employees
      // Users with deletedAt set are considered "soft deleted"
      .where('employee.deletedAt IS NULL');

    // Step 4: Apply optional status filter
    // If status is provided, filter leave requests by that status
    if (filters?.status) {
      queryBuilder.andWhere('leaveRequest.status = :status', {
        status: filters.status,
      });
    }

    // Step 5: Apply optional employeeId filter
    // If employeeId is provided, filter to only that employee's requests
    if (filters?.employeeId) {
      queryBuilder.andWhere('leaveRequest.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    // Step 6: Apply optional year filter
    // Extract the year from startDate and compare
    // EXTRACT(YEAR FROM ...) is a PostgreSQL function
    if (filters?.year) {
      queryBuilder.andWhere('EXTRACT(YEAR FROM leaveRequest.startDate) = :year', {
        year: filters.year,
      });
    }

    // Step 7: Order by createdAt descending (newest first)
    queryBuilder.orderBy('leaveRequest.createdAt', 'DESC');

    // Step 8: Execute the query and get all matching leave requests
    const leaveRequests = await queryBuilder.getMany();

    // Step 9: Transform results to remove sensitive employee fields
    // Map each leave request to exclude password and refreshToken from employee
    const sanitizedLeaveRequests = leaveRequests.map((request) => {
      // Destructure to separate employee from the rest of the request
      const { employee, ...requestData } = request;

      // Return the leave request with only safe employee fields
      return {
        ...requestData,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        },
      };
    });

    // Step 10: Return the response with count and data
    return {
      message: 'Leave requests retrieved successfully',
      count: sanitizedLeaveRequests.length,
      leaveRequests: sanitizedLeaveRequests,
    };
  }

  /**
   * Approve a leave request.
   *
   * @param requestId - The ID of the leave request to approve
   * @param adminId - The ID of the admin approving the request (from JWT)
   *
   * @returns Success message with the approved leave request details
   * @throws NotFoundException if leave request doesn't exist
   * @throws BadRequestException if request is already reviewed
   * @throws BadRequestException if no leave allocation for that year
   * @throws BadRequestException if not enough remaining leave days
   */
  async approveLeaveRequest(
    requestId: string,
    adminId: number,
  ): Promise<{
    message: string;
    leaveRequest: Omit<LeaveRequest, 'employee'> & {
      employee: { id: number; firstName: string; lastName: string; email: string };
    };
  }> {
    // Step 1: Convert requestId from string to number
    const leaveRequestId = parseInt(requestId, 10);

    // Step 2: Find the leave request with employee details
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id: leaveRequestId },
      relations: ['employee'],
    });

    // Step 3: If leave request doesn't exist, throw NotFoundException (404)
    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${requestId} not found`);
    }

    // Step 4: Check if request is already reviewed (approved or denied)
    // Only pending requests can be approved
    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        'This leave request has already been reviewed and cannot be changed',
      );
    }

    // Step 5: Get the year from the leave request's startDate
    // We need this to find the correct leave allocation
    const leaveYear = new Date(leaveRequest.startDate).getFullYear();

    // Step 6: Find the employee's leave allocation for that year
    const leaveAllocation = await this.leaveAllocationRepository.findOne({
      where: {
        employeeId: leaveRequest.employeeId,
        year: leaveYear,
      },
    });

    // Step 7: If no allocation exists for that year, throw BadRequestException
    if (!leaveAllocation) {
      throw new BadRequestException(
        'No leave allocation found for this employee for this year',
      );
    }

    // Step 8: Check if employee has enough remaining days
    if (leaveAllocation.remainingDays < leaveRequest.numberOfDays) {
      throw new BadRequestException(
        'Employee does not have enough remaining leave days',
      );
    }

    // Step 9: Update the leave request
    // - Set status to 'approved'
    // - Set reviewedBy to the admin's ID
    // - Set reviewedAt to current timestamp
    leaveRequest.status = 'approved';
    leaveRequest.reviewedBy = adminId;
    leaveRequest.reviewedAt = new Date();

    // Step 10: Update the leave allocation
    // - Increase usedDays by numberOfDays
    // - Decrease remainingDays by numberOfDays
    leaveAllocation.usedDays += leaveRequest.numberOfDays;
    leaveAllocation.remainingDays -= leaveRequest.numberOfDays;

    // Step 11: Save both updates to the database
    // Both saves happen - if one fails, you may want to use a transaction
    // For now, we save sequentially
    await this.leaveRequestRepository.save(leaveRequest);
    await this.leaveAllocationRepository.save(leaveAllocation);

    // Step 12: Prepare the response with sanitized employee data
    const { employee, ...requestData } = leaveRequest;

    // Step 13: Return success response
    return {
      message: `Leave request approved successfully. ${leaveRequest.numberOfDays} days deducted from allocation.`,
      leaveRequest: {
        ...requestData,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        },
      },
    };
  }

  /**
   * Deny a leave request.
   *
   * @param requestId - The ID of the leave request to deny
   * @param adminId - The ID of the admin denying the request (from JWT)
   *
   * @returns Success message with the denied leave request details
   * @throws NotFoundException if leave request doesn't exist
   * @throws BadRequestException if request is already reviewed
   */
  async denyLeaveRequest(
    requestId: string,
    adminId: number,
  ): Promise<{
    message: string;
    leaveRequest: Omit<LeaveRequest, 'employee'> & {
      employee: { id: number; firstName: string; lastName: string; email: string };
    };
  }> {
    // Step 1: Convert requestId from string to number
    const leaveRequestId = parseInt(requestId, 10);

    // Step 2: Find the leave request with employee details
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id: leaveRequestId },
      relations: ['employee'],
    });

    // Step 3: If leave request doesn't exist, throw NotFoundException (404)
    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${requestId} not found`);
    }

    // Step 4: Check if request is already reviewed (approved or denied)
    // Only pending requests can be denied
    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        'This leave request has already been reviewed and cannot be changed',
      );
    }

    // Step 5: Update the leave request
    // - Set status to 'denied'
    // - Set reviewedBy to the admin's ID
    // - Set reviewedAt to current timestamp
    // Note: We do NOT touch leave_allocations - no days are deducted for denied requests
    leaveRequest.status = 'denied';
    leaveRequest.reviewedBy = adminId;
    leaveRequest.reviewedAt = new Date();

    // Step 6: Save the update to the database
    await this.leaveRequestRepository.save(leaveRequest);

    // Step 7: Prepare the response with sanitized employee data
    const { employee, ...requestData } = leaveRequest;

    // Step 8: Return success response
    return {
      message: 'Leave request denied successfully.',
      leaveRequest: {
        ...requestData,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        },
      },
    };
  }

  // ============================================
  // PLACEHOLDER METHODS (TO BE IMPLEMENTED)
  // ============================================

  async getDashboard(): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  /**
   * Get all employees (excludes admins and soft-deleted users).
   *
   * @returns Array of employee objects without password and refreshToken
   */
  async getAllEmployees(): Promise<Omit<User, 'password' | 'refreshToken'>[]> {
    // Step 1: Find all users with role 'employee'
    // TypeORM automatically excludes soft-deleted records (where deletedAt is not null)
    // because we're using @DeleteDateColumn in the User entity
    const employees = await this.userRepository.find({
      where: { role: 'employee' },
    });

    // Step 2: Remove password and refreshToken from each employee
    // These sensitive fields should never be exposed in API responses
    const employeesWithoutSensitiveData = employees.map((employee) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, refreshToken, ...employeeData } = employee;
      return employeeData;
    });

    // Step 3: Return the sanitized employee list
    return employeesWithoutSensitiveData as Omit<User, 'password' | 'refreshToken'>[];
  }

  /**
   * Get a single employee by ID.
   *
   * @param id - The employee's user ID
   * @returns Employee object without password and refreshToken
   * @throws NotFoundException if employee doesn't exist or is an admin
   */
  async getEmployeeById(id: string): Promise<Omit<User, 'password' | 'refreshToken'>> {
    // Step 1: Convert id from string to number
    const employeeId = parseInt(id, 10);

    // Step 2: Find the employee by ID and role
    // - where: { id, role: 'employee' } ensures we only return employees, not admins
    // - TypeORM automatically excludes soft-deleted records (deletedAt is not null)
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, role: 'employee' },
    });

    // Step 3: If no employee found, throw NotFoundException
    // This covers three cases:
    // - User with this ID doesn't exist
    // - User exists but is an admin (role !== 'employee')
    // - User was soft-deleted (deletedAt is not null)
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Step 4: Remove password and refreshToken from the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...employeeData } = employee;

    // Step 5: Return the sanitized employee data
    return employeeData as Omit<User, 'password' | 'refreshToken'>;
  }

  /**
   * Get leave calendar - shows approved leave requests for calendar display.
   *
   * @param query - Optional query parameters:
   *   - year: Filter by year
   *   - month: Filter by month (1-12)
   *   - employee_id: Filter by specific employee ID
   *
   * @returns Array of approved leave requests formatted for calendar display
   */
  async getLeaveCalendar(query: {
    year?: number;
    month?: number;
    employee_id?: number;
  }): Promise<{
    message: string;
    count: number;
    calendar: Array<{
      leaveRequestId: number;
      employeeId: number;
      employeeName: string;
      employeeEmail: string;
      startDate: Date;
      endDate: Date;
      numberOfDays: number;
      reason: string;
    }>;
  }> {
    // Step 1: Create a query builder for complex queries with joins
    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      // Step 2: Join with user table to get employee details
      // 'INNER JOIN' excludes leave requests where employee is soft-deleted
      .innerJoinAndSelect('leaveRequest.employee', 'employee')
      // Step 3: Only get APPROVED leave requests
      .where('leaveRequest.status = :status', { status: 'approved' })
      // Step 4: Exclude soft-deleted employees
      .andWhere('employee.deletedAt IS NULL');

    // Step 5: Apply optional year filter
    // Extract the year from startDate and compare
    if (query.year) {
      queryBuilder.andWhere(
        'EXTRACT(YEAR FROM leaveRequest.startDate) = :year',
        { year: query.year },
      );
    }

    // Step 6: Apply optional month filter
    // Extract the month from startDate and compare
    if (query.month) {
      queryBuilder.andWhere(
        'EXTRACT(MONTH FROM leaveRequest.startDate) = :month',
        { month: query.month },
      );
    }

    // Step 7: Apply optional employee_id filter
    if (query.employee_id) {
      queryBuilder.andWhere('leaveRequest.employeeId = :employeeId', {
        employeeId: query.employee_id,
      });
    }

    // Step 8: Order by startDate ascending (earliest first)
    // This makes it easy to display in chronological order on a calendar
    queryBuilder.orderBy('leaveRequest.startDate', 'ASC');

    // Step 9: Execute the query
    const leaveRequests = await queryBuilder.getMany();

    // Step 10: Transform results into a clean calendar format
    // Include only the fields needed for calendar display
    const calendar = leaveRequests.map((request) => ({
      leaveRequestId: request.id,
      employeeId: request.employeeId,
      employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
      employeeEmail: request.employee.email,
      startDate: request.startDate,
      endDate: request.endDate,
      numberOfDays: request.numberOfDays,
      reason: request.reason,
    }));

    // Step 11: Return the response
    return {
      message: 'Leave calendar retrieved successfully',
      count: calendar.length,
      calendar: calendar,
    };
  }

  async createProcurement(body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getAllProcurements(): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getProcurementById(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async deleteProcurement(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async createBill(body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getAllBills(): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getBillById(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async deleteBill(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async createDocument(body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async assignDocument(id: string, body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getAllDocuments(): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async deleteDocument(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async createAsset(body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async updateAsset(id: string, body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async assignAsset(id: string, body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getAllAssets(): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getAssetById(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async deleteAsset(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }
}


