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
import { Repository, Not, IsNull } from 'typeorm';

// Import bcrypt for password hashing
// bcrypt is a secure hashing algorithm designed for passwords
import * as bcrypt from 'bcrypt';

// Import ExcelJS for generating Excel files
import * as ExcelJS from 'exceljs';

// Import User entity - represents the users table in the database
import { User } from '../entities/user.entity';

// Import LeaveAllocation entity - represents the leave_allocations table
import { LeaveAllocation } from '../entities/leave-allocation.entity';

// Import LeaveRequest entity - represents the leave_requests table
import { LeaveRequest } from '../entities/leave-request.entity';

// Import Attendance entity - represents the attendances table
import { Attendance } from '../entities/attendance.entity';

// Import Salary entity - represents the salaries table
import { Salary } from '../entities/salary.entity';

// Import SalaryPayment entity - represents the salary_payments table
import { SalaryPayment } from '../entities/salary-payment.entity';
import { Asset } from '../entities/asset.entity';
import { AssetAssignment } from '../entities/asset-assignment.entity';
import { Document } from '../entities/document.entity';
import { DocumentAssignment } from '../entities/document-assignment.entity';
import { Notification } from '../entities/notification.entity';
import { Procurement } from '../entities/procurement.entity';
import { Bill } from '../entities/bill.entity';
import { S3UploadService } from '../shared/s3-upload.service';

// Import DTOs - define the shape of data for employee operations
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { CreateAssetDto } from './dto';

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

    @InjectRepository(Salary)
    private readonly salaryRepository: Repository<Salary>,

    @InjectRepository(SalaryPayment)
    private readonly salaryPaymentRepository: Repository<SalaryPayment>,

    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,

    @InjectRepository(AssetAssignment)
    private readonly assetAssignmentRepository: Repository<AssetAssignment>,

    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,

    @InjectRepository(DocumentAssignment)
    private readonly documentAssignmentRepository: Repository<DocumentAssignment>,

    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(Procurement)
    private readonly procurementRepository: Repository<Procurement>,

    @InjectRepository(Bill)
    private readonly billRepository: Repository<Bill>,

    private readonly s3UploadService: S3UploadService,
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
    const {
      email,
      password,
      firstName,
      lastName,
      middleName,
      phone,
      gender,
      picture,
    } = createEmployeeDto;

    const genderNormalized =
      gender === undefined || gender === null || String(gender).trim() === ''
        ? null
        : String(gender).trim();

    if (
      genderNormalized !== null &&
      genderNormalized !== 'male' &&
      genderNormalized !== 'female'
    ) {
      throw new BadRequestException("gender must be 'male' or 'female'");
    }

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
      middleName: middleName ?? null,
      phone: phone ?? null,
      gender: genderNormalized,
      picture: picture ?? null,
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

        // Step 8b: Calculate granted leave days in the period
        // We need to count days from granted leave requests that fall within this period
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
   * Helper: Calculate granted leave days for an employee within a date range.
   *
   * @param employeeId - The employee's ID
   * @param startDate - Start of the period
   * @param endDate - End of the period
   * @returns Number of granted leave days in the period
   */
  private async calculateApprovedLeaveDays(
    employeeId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Get all granted leave requests for this employee
    // that overlap with the given period
    const leaveRequests = await this.leaveRequestRepository
      .createQueryBuilder('leave')
      .where('leave.employeeId = :employeeId', { employeeId })
      .andWhere('leave.status = :status', { status: 'granted' })
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

    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: employeeId,
        title: 'Leave Allocated',
        message: `You have been allocated ${totalLeaveDays} leave days for ${year}`,
      }),
    );

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
   *   - status: Filter by 'pending', 'granted', 'rejected', or 'expired'
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
   * @returns Success message with the granted leave request details
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

    // Step 4: Check if request is already reviewed (granted or rejected)
    // Only pending requests can be granted
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
    // - Set status to 'granted'
    // - Set reviewedBy to the admin's ID
    // - Set reviewedAt to current timestamp
    leaveRequest.status = 'granted';
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
      message: `Leave request granted successfully. ${leaveRequest.numberOfDays} days deducted from allocation.`,
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
   * @returns Success message with the rejected leave request details
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

    // Step 4: Check if request is already reviewed (granted or rejected)
    // Only pending requests can be rejected
    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        'This leave request has already been reviewed and cannot be changed',
      );
    }

    // Step 5: Update the leave request
    // - Set status to 'rejected'
    // - Set reviewedBy to the admin's ID
    // - Set reviewedAt to current timestamp
    // Note: We do NOT touch leave_allocations - no days are deducted for rejected requests
    leaveRequest.status = 'rejected';
    leaveRequest.reviewedBy = adminId;
    leaveRequest.reviewedAt = new Date();

    // Step 6: Save the update to the database
    await this.leaveRequestRepository.save(leaveRequest);

    // Step 7: Prepare the response with sanitized employee data
    const { employee, ...requestData } = leaveRequest;

    // Step 8: Return success response
    return {
      message: 'Leave request rejected successfully.',
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
   * Get leave calendar - shows granted leave requests for calendar display.
   *
   * @param query - Optional query parameters:
   *   - year: Filter by year
   *   - month: Filter by month (1-12)
   *   - employee_id: Filter by specific employee ID
   *
   * @returns Array of granted leave requests formatted for calendar display
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
      // Step 3: Only get GRANTED leave requests
      .where('leaveRequest.status = :status', { status: 'granted' })
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

  async createProcurement(
    body: any,
    adminId: number,
    files: {
      image: Express.Multer.File | null;
      receipt: Express.Multer.File | null;
    },
  ): Promise<{
    message: string;
    procurement: Procurement;
  }> {
    const equipmentName = String(body?.equipmentName || '').trim();
    const amount = Number(body?.amount);
    const quantity = Number(body?.quantity);
    const currency = String(body?.currency || '').toUpperCase();
    const purchasedOn = body?.purchasedOn ? new Date(body.purchasedOn) : null;
    const description = body?.description ? String(body.description).trim() : null;
    const assignTo = body?.assignTo !== undefined ? Number(body.assignTo) : null;

    if (!equipmentName) {
      throw new BadRequestException('equipmentName is required');
    }
    if (!amount || amount <= 0) {
      throw new BadRequestException('amount is required and must be greater than 0');
    }
    if (!['GBP', 'USD', 'NGN'].includes(currency)) {
      throw new BadRequestException("currency must be one of: 'GBP', 'USD', 'NGN'");
    }
    if (!purchasedOn || Number.isNaN(purchasedOn.getTime())) {
      throw new BadRequestException('purchasedOn is required and must be a valid date');
    }
    if (!quantity || quantity <= 0) {
      throw new BadRequestException('quantity is required and must be greater than 0');
    }

    const imageUrl = files.image
      ? await this.s3UploadService.uploadFile(files.image, 'procurements')
      : null;
    const receiptUrl = files.receipt
      ? await this.s3UploadService.uploadFile(files.receipt, 'receipts')
      : null;

    const procurement = this.procurementRepository.create({
      equipmentName,
      unitPrice: amount,
      quantity,
      totalPrice: amount * quantity,
      currency,
      purchasedOn,
      description,
      assignTo: Number.isInteger(assignTo) ? assignTo : null,
      imageUrl,
      receiptUrl,
      addedBy: adminId,
    });

    const savedProcurement = await this.procurementRepository.save(procurement);
    return {
      message: 'Procurement created successfully',
      procurement: savedProcurement,
    };
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

  async createBill(
    body: any,
    adminId: number,
    receipt: Express.Multer.File | null,
  ): Promise<{
    message: string;
    bill: Bill;
  }> {
    const description = String(body?.description || '').trim();
    const cost = Number(body?.cost);

    if (!description) {
      throw new BadRequestException('description is required');
    }
    if (!cost || cost <= 0) {
      throw new BadRequestException('cost is required and must be greater than 0');
    }

    const receiptUrl = receipt
      ? await this.s3UploadService.uploadFile(receipt, 'bills')
      : null;

    const bill = this.billRepository.create({
      description,
      cost,
      receiptUrl,
      addedBy: adminId,
    });

    const savedBill = await this.billRepository.save(bill);
    return {
      message: 'Bill created successfully',
      bill: savedBill,
    };
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

  async createDocument(
    body: any,
    adminId: number,
    file: Express.Multer.File | undefined,
  ): Promise<{
    message: string;
    document: {
      id: number;
      title: string;
      fileUrl: string | null;
      uploadedBy: number | null;
      createdAt: Date;
    };
  }> {
    const title = String(body?.title || '').trim();
    if (!title) {
      throw new BadRequestException('title is required');
    }
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const fileUrl = await this.s3UploadService.uploadFile(file, 'documents');
    const document = this.documentRepository.create({
      title,
      fileUrl,
      uploadedBy: adminId,
    });

    const savedDocument = await this.documentRepository.save(document);
    return {
      message: 'Document uploaded successfully',
      document: {
        id: savedDocument.id,
        title: savedDocument.title,
        fileUrl: savedDocument.fileUrl,
        uploadedBy: savedDocument.uploadedBy,
        createdAt: savedDocument.createdAt,
      },
    };
  }

  async assignDocument(id: string, body: any): Promise<{ message: string }> {
    const documentId = parseInt(id, 10);
    const employeeId = Number(body?.employeeId);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      throw new BadRequestException('Invalid document id');
    }

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw new BadRequestException('employeeId is required and must be a valid number');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      withDeleted: true,
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || employee.deletedAt) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (employee.role === 'admin') {
      throw new BadRequestException('Cannot assign document to admin user');
    }

    const existingAssignment = await this.documentAssignmentRepository.findOne({
      where: {
        documentId: document.id,
        employeeId: employee.id,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('Document is already assigned to this employee');
    }

    await this.documentAssignmentRepository.save(
      this.documentAssignmentRepository.create({
        documentId: document.id,
        employeeId: employee.id,
      }),
    );

    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: employee.id,
        title: 'Document Assigned',
        message: `A new document '${document.title}' has been assigned to you`,
      }),
    );

    return { message: 'Document assigned successfully' };
  }

  async getAllDocuments(): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async deleteDocument(id: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async createAsset(body: CreateAssetDto): Promise<{
    message: string;
    asset: Asset;
    assignment?: {
      id: number;
      assetId: number;
      employeeId: number;
      assignedAt: Date;
      returnedAt: Date | null;
    };
  }> {
    const {
      assetName,
      amount,
      currency,
      purchasedOn,
      quantity,
      description,
      assignTo,
      image,
      receipt,
    } = body;

    if (!assetName || String(assetName).trim() === '') {
      throw new BadRequestException('assetName is required');
    }

    if (amount === undefined || amount === null || Number(amount) <= 0) {
      throw new BadRequestException('amount is required and must be greater than 0');
    }

    const normalizedCurrency = String(currency || '').toUpperCase();
    if (!['GBP', 'USD', 'NGN'].includes(normalizedCurrency)) {
      throw new BadRequestException("currency must be one of: 'GBP', 'USD', 'NGN'");
    }

    if (!purchasedOn) {
      throw new BadRequestException('purchasedOn is required (format: YYYY-MM-DD)');
    }

    const parsedPurchasedOn = new Date(purchasedOn);
    if (Number.isNaN(parsedPurchasedOn.getTime())) {
      throw new BadRequestException(
        'Invalid purchasedOn format. Use YYYY-MM-DD (e.g., 2026-04-07)',
      );
    }

    if (quantity === undefined || quantity === null || Number(quantity) <= 0) {
      throw new BadRequestException('quantity is required and must be greater than 0');
    }

    const shouldAssign = assignTo !== undefined && assignTo !== null;

    let employee: User | null = null;
    if (shouldAssign) {
      employee = await this.userRepository.findOne({
        where: { id: Number(assignTo) },
      });

      if (!employee || employee.deletedAt) {
        throw new NotFoundException(`Employee with ID ${assignTo} not found`);
      }

      if (employee.role === 'admin') {
        throw new BadRequestException('Cannot assign asset to admin user');
      }
    }

    const newAsset = this.assetRepository.create({
      assetName: String(assetName).trim(),
      amount: Number(amount),
      currency: normalizedCurrency,
      purchasedOn: parsedPurchasedOn,
      quantity: Number(quantity),
      description: description ?? null,
      image: image ?? null,
      receipt: receipt ?? null,
      status: shouldAssign ? 'assigned' : 'available',
    });

    const savedAsset = await this.assetRepository.save(newAsset);

    if (!shouldAssign || !employee) {
      return {
        message: 'Asset created successfully',
        asset: savedAsset,
      };
    }

    const assignment = this.assetAssignmentRepository.create({
      assetId: savedAsset.id,
      employeeId: employee.id,
    });

    const savedAssignment = await this.assetAssignmentRepository.save(assignment);

    return {
      message: 'Asset created and assigned successfully',
      asset: savedAsset,
      assignment: {
        id: savedAssignment.id,
        assetId: savedAssignment.assetId,
        employeeId: savedAssignment.employeeId,
        assignedAt: savedAssignment.assignedAt,
        returnedAt: savedAssignment.returnedAt,
      },
    };
  }

  async updateAsset(id: string, body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async assignAsset(id: string, body: any): Promise<{ message: string }> {
    const assetId = parseInt(id, 10);
    const employeeId = Number(body?.employeeId);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      throw new BadRequestException('Invalid asset id');
    }

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw new BadRequestException('employeeId is required and must be a valid number');
    }

    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      withDeleted: true,
    });

    if (!asset || asset.deletedAt) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || employee.deletedAt) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (employee.role === 'admin') {
      throw new BadRequestException('Cannot assign asset to admin user');
    }

    const activeAssignment = await this.assetAssignmentRepository.findOne({
      where: {
        assetId: asset.id,
        returnedAt: IsNull(),
      },
    });

    if (activeAssignment && activeAssignment.employeeId === employee.id) {
      throw new BadRequestException('Asset is already assigned to this employee');
    }

    if (activeAssignment) {
      activeAssignment.returnedAt = new Date();
      await this.assetAssignmentRepository.save(activeAssignment);
    }

    await this.assetAssignmentRepository.save(
      this.assetAssignmentRepository.create({
        assetId: asset.id,
        employeeId: employee.id,
      }),
    );

    asset.status = 'assigned';
    await this.assetRepository.save(asset);

    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: employee.id,
        title: 'Asset Assigned',
        message: `A ${asset.assetName} has been assigned to you`,
      }),
    );

    return { message: 'Asset assigned successfully' };
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

  // ============================================
  // SALARY MANAGEMENT METHODS
  // ============================================

  /**
   * Create a salary structure for an employee.
   *
   * @param data - The salary data containing:
   *   - employeeId: The ID of the employee
   *   - amount: The salary amount
   *   - effectiveDate: When this salary takes effect (YYYY-MM-DD)
   *
   * @returns The created salary record with employee details
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if employee is an admin
   * @throws BadRequestException if salary already exists for this employee
   */
  async createSalary(data: {
    employeeId: number;
    amount: number;
    effectiveDate: string;
  }): Promise<{
    message: string;
    salary: Omit<Salary, 'employee'> & {
      employee: { id: number; firstName: string; lastName: string; email: string };
    };
  }> {
    // Step 1: Extract fields from input data
    // Destructuring makes the code cleaner and easier to read
    const { employeeId, amount, effectiveDate } = data;

    // Step 2: Check if the employee exists
    // findOne returns the user if found, or null if not found
    // We also check deletedAt IS NULL to exclude soft-deleted employees
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 3: If employee doesn't exist, throw NotFoundException (404)
    // This tells the client that the requested employee was not found
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 4: Check if employee is soft-deleted
    // deletedAt is set when an employee is deactivated
    if (employee.deletedAt) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 5: Check if the user is an admin
    // Admins should not have salary records - only employees
    // This is a business rule to separate admin users from payroll
    if (employee.role === 'admin') {
      throw new BadRequestException(
        'Cannot create salary for admin users. Only employees can have salary records.',
      );
    }

    // Step 6: Check if a salary record already exists for this employee
    // Each employee should only have ONE salary record initially
    // To change salary, use the update endpoint (which adds a new history record)
    const existingSalary = await this.salaryRepository.findOne({
      where: { employeeId: employeeId },
    });

    // Step 7: If salary exists, throw BadRequestException (400)
    // The message tells the client to use the update endpoint instead
    if (existingSalary) {
      throw new BadRequestException(
        'Salary structure already exists for this employee. Use the update endpoint to modify it',
      );
    }

    // Step 8: Create a new Salary entity
    // create() builds the entity but does NOT save to database yet
    const newSalary = this.salaryRepository.create({
      employeeId: employeeId,
      amount: amount,
      effectiveDate: new Date(effectiveDate), // Convert string to Date object
    });

    // Step 9: Save the salary record to the database
    // save() persists the entity and returns it with generated fields (id, createdAt, etc.)
    const savedSalary = await this.salaryRepository.save(newSalary);

    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: employee.id,
        title: 'Salary Structure Created',
        message: `Your salary structure has been set up at ${Number(savedSalary.amount)}`,
      }),
    );

    // Step 10: Prepare the response with sanitized employee data
    // We only include safe employee fields (no password or refreshToken)
    return {
      message: `Salary structure created successfully for employee`,
      salary: {
        ...savedSalary,
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
  // UPDATE SALARY (Add new row to preserve history)
  // ============================================
  /**
   * Updates an employee's salary by creating a NEW record (preserves history).
   * The existing salary record remains unchanged in the database.
   *
   * @param salaryId - The ID of the existing salary record to reference
   * @param data - Object containing amount and effectiveDate
   * @returns The newly created salary record with employee details
   */
  async updateSalary(
    salaryId: number,
    data: {
      amount: number;
      effectiveDate: string;
    },
  ): Promise<{
    message: string;
    previousSalary: {
      id: number;
      amount: number;
      effectiveDate: Date;
    };
    newSalary: Omit<Salary, 'employee'> & {
      employee: { id: number; firstName: string; lastName: string; email: string };
    };
  }> {
    // Step 1: Extract fields from input data
    // Destructuring makes the code cleaner and easier to read
    const { amount, effectiveDate } = data;

    // Step 1b: Validate required fields
    // If amount or effectiveDate is missing, throw BadRequestException
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount is required and must be greater than 0');
    }

    if (!effectiveDate) {
      throw new BadRequestException('effectiveDate is required (format: YYYY-MM-DD)');
    }

    // Step 1c: Validate date format
    // Check if the date string can be parsed into a valid Date
    const parsedDate = new Date(effectiveDate);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid effectiveDate format. Use YYYY-MM-DD (e.g., 2026-06-01)');
    }

    // Step 2: Find the existing salary record by its ID
    // We use relations to also load the employee data in one query
    const existingSalary = await this.salaryRepository.findOne({
      where: { id: salaryId },
      relations: ['employee'],
    });

    // Step 3: If salary record doesn't exist, throw NotFoundException (404)
    // This tells the client that the requested salary record was not found
    if (!existingSalary) {
      throw new NotFoundException(`Salary record with ID ${salaryId} not found`);
    }

    // Step 4: Get the employee from the existing salary record
    // We need the employeeId to create the new salary record
    const employee = existingSalary.employee;

    // Step 5: Check if the employee is soft-deleted
    // We shouldn't update salary for deactivated employees
    if (employee.deletedAt) {
      throw new NotFoundException(
        `Cannot update salary. Employee has been deactivated.`,
      );
    }

    // Step 6: Create a NEW salary record (do NOT overwrite the existing one)
    // This preserves the salary history - the old record stays in the database
    // The new record has the same employeeId but different amount and effectiveDate
    const newSalary = this.salaryRepository.create({
      employeeId: employee.id, // Same employee as the existing salary
      amount: amount, // New salary amount from request body
      effectiveDate: parsedDate, // Use the validated Date object from Step 1c
    });

    // Step 7: Save the new salary record to the database
    // save() persists the entity and returns it with generated fields (id, createdAt, etc.)
    const savedSalary = await this.salaryRepository.save(newSalary);

    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: employee.id,
        title: 'Salary Updated',
        message: `Your salary has been updated to ${Number(savedSalary.amount)}`,
      }),
    );

    // Step 8: Prepare the response
    // Include both the previous salary (for reference) and the new salary
    // We only include safe employee fields (no password or refreshToken)
    return {
      message: `Salary updated successfully. New salary record created to preserve history.`,
      previousSalary: {
        id: existingSalary.id,
        amount: existingSalary.amount,
        effectiveDate: existingSalary.effectiveDate,
      },
      newSalary: {
        ...savedSalary,
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
  // PAY ALL STAFF
  // ============================================
  /**
   * Process salary payment for ALL employees with a specific role at once.
   *
   * @param data - Object containing role, month, year, and paymentDate
   * @returns Detailed response with paid employees, skipped employees, and summary
   */
  async payAllStaff(data: {
    role: string;
    month: number;
    year: number;
    paymentDate: string;
  }): Promise<{
    message: string;
    summary: {
      totalEmployeesInRole: number;
      totalPaid: number;
      totalSkippedNoSalary: number;
      totalSkippedAlreadyPaid: number;
      totalAmountPaid: number;
    };
    paidEmployees: Array<{
      employeeId: number;
      firstName: string;
      lastName: string;
      email: string;
      amountPaid: number;
    }>;
    skippedNoSalary: Array<{
      employeeId: number;
      firstName: string;
      lastName: string;
      email: string;
      reason: string;
    }>;
    skippedAlreadyPaid: Array<{
      employeeId: number;
      firstName: string;
      lastName: string;
      email: string;
      reason: string;
    }>;
  }> {
    // Step 1: Extract fields from input data
    const { role, month, year, paymentDate } = data;

    // Step 2: Validate required fields
    if (!role || role.trim() === '') {
      throw new BadRequestException('Role is required');
    }

    if (!month || month < 1 || month > 12) {
      throw new BadRequestException('Month is required and must be between 1 and 12');
    }

    if (!year || year < 2000) {
      throw new BadRequestException('Year is required and must be a valid year');
    }

    if (!paymentDate) {
      throw new BadRequestException('paymentDate is required (format: YYYY-MM-DD)');
    }

    // Step 3: Validate paymentDate format
    const parsedPaymentDate = new Date(paymentDate);
    if (isNaN(parsedPaymentDate.getTime())) {
      throw new BadRequestException('Invalid paymentDate format. Use YYYY-MM-DD');
    }

    // Step 4: Find all active employees with the specified role
    // Active means deletedAt is null (not soft deleted)
    const employees = await this.userRepository.find({
      where: {
        role: role,
        deletedAt: null as unknown as Date,
      },
    });

    // Step 5: If no employees found with that role, throw NotFoundException
    if (employees.length === 0) {
      throw new NotFoundException(`No active employees found with role "${role}"`);
    }

    // Step 6: Initialize arrays to track results
    const paidEmployees: Array<{
      employeeId: number;
      firstName: string;
      lastName: string;
      email: string;
      amountPaid: number;
    }> = [];

    const skippedNoSalary: Array<{
      employeeId: number;
      firstName: string;
      lastName: string;
      email: string;
      reason: string;
    }> = [];

    const skippedAlreadyPaid: Array<{
      employeeId: number;
      firstName: string;
      lastName: string;
      email: string;
      reason: string;
    }> = [];

    // Step 7: Process each employee
    for (const employee of employees) {
      // Step 7a: Find the most recent salary for this employee
      // Order by effectiveDate descending to get the current salary
      const currentSalary = await this.salaryRepository.findOne({
        where: { employeeId: employee.id },
        order: { effectiveDate: 'DESC' },
      });

      // Step 7b: If no salary structure exists, skip this employee
      if (!currentSalary) {
        skippedNoSalary.push({
          employeeId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          reason: 'No salary structure set up for this employee',
        });
        continue; // Move to next employee
      }

      // Step 7c: Check if this employee has already been paid for this month/year
      const existingPayment = await this.salaryPaymentRepository.findOne({
        where: {
          employeeId: employee.id,
          month: month,
          year: year,
        },
      });

      // Step 7d: If already paid, skip this employee
      if (existingPayment) {
        skippedAlreadyPaid.push({
          employeeId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          reason: `Already paid for ${month}/${year}`,
        });
        continue; // Move to next employee
      }

      // Step 7e: Create and save the payment record
      const newPayment = this.salaryPaymentRepository.create({
        employeeId: employee.id,
        month: month,
        year: year,
        amountPaid: currentSalary.amount,
        paymentDate: parsedPaymentDate,
      });

      await this.salaryPaymentRepository.save(newPayment);

      // Step 7f: Add to paid employees list
      paidEmployees.push({
        employeeId: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        amountPaid: Number(currentSalary.amount),
      });
    }

    // Step 8: Check if ALL employees were skipped
    if (paidEmployees.length === 0) {
      // Build a helpful error message explaining why all were skipped
      let errorMessage = `Could not pay any employees with role "${role}". `;

      if (skippedNoSalary.length > 0 && skippedAlreadyPaid.length > 0) {
        errorMessage += `${skippedNoSalary.length} employee(s) have no salary structure, and ${skippedAlreadyPaid.length} employee(s) have already been paid for ${month}/${year}.`;
      } else if (skippedNoSalary.length > 0) {
        errorMessage += `All ${skippedNoSalary.length} employee(s) have no salary structure set up.`;
      } else if (skippedAlreadyPaid.length > 0) {
        errorMessage += `All ${skippedAlreadyPaid.length} employee(s) have already been paid for ${month}/${year}.`;
      }

      throw new BadRequestException(errorMessage);
    }

    // Step 9: Calculate total amount paid
    const totalAmountPaid = paidEmployees.reduce(
      (sum, emp) => sum + emp.amountPaid,
      0,
    );

    // Step 10: Return detailed response
    return {
      message: `Successfully paid ${paidEmployees.length} employee(s) with role "${role}" for ${month}/${year}`,
      summary: {
        totalEmployeesInRole: employees.length,
        totalPaid: paidEmployees.length,
        totalSkippedNoSalary: skippedNoSalary.length,
        totalSkippedAlreadyPaid: skippedAlreadyPaid.length,
        totalAmountPaid: totalAmountPaid,
      },
      paidEmployees: paidEmployees,
      skippedNoSalary: skippedNoSalary,
      skippedAlreadyPaid: skippedAlreadyPaid,
    };
  }

  // ============================================
  // GET EMPLOYEE SALARY
  // ============================================
  /**
   * View an employee's salary structure and history.
   *
   * @param employeeId - The ID of the employee
   * @returns Employee details, current salary, and complete salary history
   */
  async getEmployeeSalary(employeeId: number): Promise<{
    employee: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
    currentSalary: {
      id: number;
      amount: number;
      effectiveDate: Date;
      createdAt: Date;
    };
    salaryHistory: Array<{
      id: number;
      amount: number;
      effectiveDate: Date;
      createdAt: Date;
    }>;
  }> {
    // Step 1: Find the employee by ID
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 2: If employee doesn't exist, throw NotFoundException
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 3: If employee is soft deleted, throw NotFoundException
    if (employee.deletedAt) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 4: If the user is an admin, throw NotFoundException
    // Only employees should have salary records
    if (employee.role === 'admin') {
      throw new NotFoundException(
        `No salary structure found for this user. Admin users do not have salary records.`,
      );
    }

    // Step 5: Find ALL salary records for this employee
    // Order by effectiveDate descending so newest is first
    const salaryRecords = await this.salaryRepository.find({
      where: { employeeId: employeeId },
      order: { effectiveDate: 'DESC' },
    });

    // Step 6: If no salary records exist, throw NotFoundException
    if (salaryRecords.length === 0) {
      throw new NotFoundException(
        `No salary structure found for this employee`,
      );
    }

    // Step 7: The first record (index 0) is the current salary
    // because we sorted by effectiveDate descending
    const currentSalary = salaryRecords[0];

    // Step 8: Map salary records to the response format
    // This removes the employee relationship and keeps only needed fields
    const salaryHistory = salaryRecords.map((salary) => ({
      id: salary.id,
      amount: Number(salary.amount), // Convert decimal to number
      effectiveDate: salary.effectiveDate,
      createdAt: salary.createdAt,
    }));

    // Step 9: Return the response
    // Employee data is sanitized (no password or refreshToken)
    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
      },
      currentSalary: {
        id: currentSalary.id,
        amount: Number(currentSalary.amount),
        effectiveDate: currentSalary.effectiveDate,
        createdAt: currentSalary.createdAt,
      },
      salaryHistory: salaryHistory,
    };
  }

  // ============================================
  // PROCESS SALARY PAYMENT (Single Employee)
  // ============================================
  /**
   * Process a salary payment for a single employee.
   *
   * @param data - Object containing employeeId, month, year, amountPaid, paymentDate
   * @returns The created payment record with employee details
   */
  async processSalaryPayment(data: {
    employeeId: number;
    month: number;
    year: number;
    amountPaid: number;
    paymentDate: string;
  }): Promise<{
    message: string;
    payment: {
      id: number;
      month: number;
      year: number;
      amountPaid: number;
      paymentDate: Date;
      createdAt: Date;
      employee: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  }> {
    // Step 1: Extract fields from input data
    const { employeeId, month, year, amountPaid, paymentDate } = data;

    // Step 2: Validate required fields
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }

    if (!month || month < 1 || month > 12) {
      throw new BadRequestException('month is required and must be between 1 and 12');
    }

    if (!year || year < 2000) {
      throw new BadRequestException('year is required and must be a valid year');
    }

    if (!amountPaid || amountPaid <= 0) {
      throw new BadRequestException('amountPaid is required and must be greater than 0');
    }

    if (!paymentDate) {
      throw new BadRequestException('paymentDate is required (format: YYYY-MM-DD)');
    }

    // Step 3: Validate paymentDate format
    const parsedPaymentDate = new Date(paymentDate);
    if (isNaN(parsedPaymentDate.getTime())) {
      throw new BadRequestException('Invalid paymentDate format. Use YYYY-MM-DD');
    }

    // Step 4: Find the employee by ID
    const employee = await this.userRepository.findOne({
      where: { id: employeeId },
    });

    // Step 5: If employee doesn't exist, throw NotFoundException
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 6: If employee is soft deleted, throw NotFoundException
    if (employee.deletedAt) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Step 7: If the user is an admin, throw BadRequestException
    // Only employees should receive salary payments
    if (employee.role === 'admin') {
      throw new BadRequestException(
        'Cannot process salary payment for admin users. Only employees can receive salary payments.',
      );
    }

    // Step 8: Check if employee has already been paid for this month/year
    const existingPayment = await this.salaryPaymentRepository.findOne({
      where: {
        employeeId: employeeId,
        month: month,
        year: year,
      },
    });

    // Step 9: If already paid, throw BadRequestException
    if (existingPayment) {
      throw new BadRequestException(
        'Employee has already been paid for this month',
      );
    }

    // Step 10: Create the payment record
    // Note: amountPaid can be any amount - it doesn't have to match salary structure
    const newPayment = this.salaryPaymentRepository.create({
      employeeId: employeeId,
      month: month,
      year: year,
      amountPaid: amountPaid,
      paymentDate: parsedPaymentDate,
    });

    // Step 11: Save the payment record to the database
    const savedPayment = await this.salaryPaymentRepository.save(newPayment);

    const currency = (data as { currency?: string }).currency ?? 'NGN';
    const amountForMessage = Number(savedPayment.amountPaid);

    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: employee.id,
        title: 'Salary Payment Received',
        message: `Your salary of ${amountForMessage} ${currency} for ${month}/${year} has been recorded`,
      }),
    );

    // Step 12: Return the response with sanitized employee data
    return {
      message: `Salary payment processed successfully for ${employee.firstName} ${employee.lastName}`,
      payment: {
        id: savedPayment.id,
        month: savedPayment.month,
        year: savedPayment.year,
        amountPaid: Number(savedPayment.amountPaid),
        paymentDate: savedPayment.paymentDate,
        createdAt: savedPayment.createdAt,
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
  // GET PAYMENT HISTORY
  // ============================================
  /**
   * View salary payment history with optional filters.
   *
   * @param filters - Optional filters: employeeId, month, year
   * @returns Payment records with employee details, total count, and total amount
   */
  async getPaymentHistory(filters: {
    employeeId?: number;
    month?: number;
    year?: number;
  }): Promise<{
    totalRecords: number;
    totalAmountPaid: number;
    payments: Array<{
      id: number;
      month: number;
      year: number;
      amountPaid: number;
      paymentDate: Date;
      createdAt: Date;
      employee: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
      };
    }>;
  }> {
    // Step 1: Extract filters from input
    const { employeeId, month, year } = filters;

    // Step 2: Build the query using QueryBuilder
    // This allows us to add conditions dynamically based on which filters are provided
    const queryBuilder = this.salaryPaymentRepository
      .createQueryBuilder('payment')
      // Join with users table to get employee details
      .innerJoinAndSelect('payment.employee', 'employee')
      // Exclude soft deleted employees (deletedAt is null)
      .where('employee.deletedAt IS NULL');

    // Step 3: Add employeeId filter if provided
    if (employeeId) {
      // Convert to number in case it comes as string from query params
      queryBuilder.andWhere('payment.employeeId = :employeeId', {
        employeeId: Number(employeeId),
      });
    }

    // Step 4: Add month filter if provided
    if (month) {
      // Validate month is between 1-12
      const monthNum = Number(month);
      if (monthNum >= 1 && monthNum <= 12) {
        queryBuilder.andWhere('payment.month = :month', { month: monthNum });
      }
    }

    // Step 5: Add year filter if provided
    if (year) {
      queryBuilder.andWhere('payment.year = :year', { year: Number(year) });
    }

    // Step 6: Order by paymentDate descending (newest first)
    queryBuilder.orderBy('payment.paymentDate', 'DESC');

    // Step 7: Execute the query and get all matching records
    const payments = await queryBuilder.getMany();

    // Step 8: Map payments to response format
    // This removes sensitive employee data and formats the response
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      month: payment.month,
      year: payment.year,
      amountPaid: Number(payment.amountPaid), // Convert decimal to number
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
      employee: {
        id: payment.employee.id,
        firstName: payment.employee.firstName,
        lastName: payment.employee.lastName,
        email: payment.employee.email,
      },
    }));

    // Step 9: Calculate total amount paid across all returned records
    const totalAmountPaid = formattedPayments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0,
    );

    // Step 10: Return the response
    return {
      totalRecords: formattedPayments.length,
      totalAmountPaid: totalAmountPaid,
      payments: formattedPayments,
    };
  }

  // ============================================
  // GET PAYROLL REPORTS
  // ============================================
  /**
   * Generate payroll reports showing payment status for each employee.
   *
   * @param filters - Optional filters: month, year, role
   * @returns Summary and per-employee breakdown with payment status
   */
  async getPayrollReports(filters: {
    month?: number;
    year?: number;
    role?: string;
  }): Promise<{
    summary: {
      period: { month: number; year: number };
      totalEmployees: number;
      totalPaid: number;
      totalUnpaid: number;
      totalAmountPaid: number;
    };
    employees: Array<{
      employee: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
      currentSalary: number | null;
      amountPaid: number;
      paymentStatus: 'paid' | 'unpaid';
      paymentDate: Date | null;
    }>;
  }> {
    // Step 1: Extract filters and set defaults
    // If no month/year provided, use current month and year
    const now = new Date();
    const month = filters.month ? Number(filters.month) : now.getMonth() + 1; // getMonth() is 0-indexed
    const year = filters.year ? Number(filters.year) : now.getFullYear();
    const roleFilter = filters.role;

    // Step 2: Build query to get employees
    // Only include employees (not admins), exclude soft deleted
    const employeeQueryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.role != :adminRole', { adminRole: 'admin' });

    // Step 3: Add role filter if provided
    // If role is specified, filter by that specific role
    if (roleFilter && roleFilter.trim() !== '') {
      employeeQueryBuilder.andWhere('user.role = :role', { role: roleFilter });
    }

    // Step 4: Execute query to get employees
    const employees = await employeeQueryBuilder.getMany();

    // Step 5: Initialize result arrays and counters
    const employeeReports: Array<{
      employee: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
      currentSalary: number | null;
      amountPaid: number;
      paymentStatus: 'paid' | 'unpaid';
      paymentDate: Date | null;
    }> = [];

    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalAmountPaid = 0;

    // Step 6: Process each employee
    for (const employee of employees) {
      // Step 6a: Get the employee's current salary (most recent)
      const currentSalaryRecord = await this.salaryRepository.findOne({
        where: { employeeId: employee.id },
        order: { effectiveDate: 'DESC' },
      });

      // Step 6b: Get the employee's payment for this month/year
      const payment = await this.salaryPaymentRepository.findOne({
        where: {
          employeeId: employee.id,
          month: month,
          year: year,
        },
      });

      // Step 6c: Determine payment status and amount
      const isPaid = payment !== null;
      const amountPaid = payment ? Number(payment.amountPaid) : 0;
      const paymentDate = payment ? payment.paymentDate : null;

      // Step 6d: Update counters
      if (isPaid) {
        totalPaid++;
        totalAmountPaid += amountPaid;
      } else {
        totalUnpaid++;
      }

      // Step 6e: Add to results array
      employeeReports.push({
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          role: employee.role,
        },
        currentSalary: currentSalaryRecord ? Number(currentSalaryRecord.amount) : null,
        amountPaid: amountPaid,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        paymentDate: paymentDate,
      });
    }

    // Step 7: Return the response with summary and employee breakdown
    return {
      summary: {
        period: { month, year },
        totalEmployees: employees.length,
        totalPaid: totalPaid,
        totalUnpaid: totalUnpaid,
        totalAmountPaid: totalAmountPaid,
      },
      employees: employeeReports,
    };
  }

  // ============================================
  // EXPORT PAYROLL REPORT (Excel)
  // ============================================
  /**
   * Generate and export payroll report as Excel file.
   *
   * @param filters - Optional filters: month, year, role
   * @returns Excel file buffer and filename
   */
  async exportPayrollReport(filters: {
    month?: number;
    year?: number;
    role?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    // Step 1: Get current date for defaults
    const now = new Date();
    const month = filters.month ? Number(filters.month) : now.getMonth() + 1;
    const year = filters.year ? Number(filters.year) : now.getFullYear();
    const roleFilter = filters.role;

    // Step 2: Get month name for display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[month - 1];

    // Step 3: Build query to get employees (same logic as getPayrollReports)
    const employeeQueryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.role != :adminRole', { adminRole: 'admin' });

    if (roleFilter && roleFilter.trim() !== '') {
      employeeQueryBuilder.andWhere('user.role = :role', { role: roleFilter });
    }

    const employees = await employeeQueryBuilder.getMany();

    // Step 4: Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ZionHome Employee Management System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Payroll Report');

    // Step 5: Define columns with headers
    worksheet.columns = [
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Current Salary', key: 'currentSalary', width: 18 },
      { header: 'Amount Paid', key: 'amountPaid', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Payment Date', key: 'paymentDate', width: 15 },
    ];

    // Step 6: Style the header row (bold)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.border = {
        bottom: { style: 'thin' },
      };
    });

    // Step 7: Initialize counters for summary
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalAmountPaid = 0;

    // Step 8: Process each employee and add data rows
    for (const employee of employees) {
      // Get current salary
      const currentSalaryRecord = await this.salaryRepository.findOne({
        where: { employeeId: employee.id },
        order: { effectiveDate: 'DESC' },
      });

      // Get payment for this month/year
      const payment = await this.salaryPaymentRepository.findOne({
        where: {
          employeeId: employee.id,
          month: month,
          year: year,
        },
      });

      const isPaid = payment !== null;
      const amountPaid = payment ? Number(payment.amountPaid) : 0;

      if (isPaid) {
        totalPaid++;
        totalAmountPaid += amountPaid;
      } else {
        totalUnpaid++;
      }

      // Add row to worksheet
      // Format payment date - handle both Date objects and string dates from DB
      let formattedPaymentDate = 'N/A';
      if (payment && payment.paymentDate) {
        // Convert to string first to handle any format from DB
        const dateValue = payment.paymentDate;
        formattedPaymentDate = new Date(dateValue).toISOString().split('T')[0];
      }

      worksheet.addRow({
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: employee.role,
        currentSalary: currentSalaryRecord ? Number(currentSalaryRecord.amount) : 'Not Set',
        amountPaid: amountPaid,
        paymentStatus: isPaid ? 'Paid' : 'Unpaid',
        paymentDate: formattedPaymentDate,
      });
    }

    // Step 9: Add empty row before summary
    worksheet.addRow({});

    // Step 10: Add summary section
    const summaryStartRow = worksheet.rowCount + 1;

    worksheet.addRow({ name: `Total Employees: ${employees.length}` });
    worksheet.addRow({ name: `Total Paid: ${totalPaid}` });
    worksheet.addRow({ name: `Total Unpaid: ${totalUnpaid}` });
    worksheet.addRow({ name: `Total Amount Paid: ${totalAmountPaid.toLocaleString()}` });
    worksheet.addRow({ name: `Period: ${monthName} ${year}` });

    // Step 11: Style summary rows (bold)
    for (let i = summaryStartRow; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.font = { bold: true };
    }

    // Step 12: Generate the Excel file as buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Step 13: Generate filename
    const filename = `Payroll_Report_${monthName}_${year}.xlsx`;

    // Step 14: Return the buffer and filename
    // Convert to Buffer type for NestJS response
    return {
      buffer: Buffer.from(excelBuffer),
      filename: filename,
    };
  }
}


