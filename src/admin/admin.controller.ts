// Import decorators from NestJS
// Controller - marks this class as a controller (handles HTTP requests)
// Get, Post, Put, Delete - HTTP method decorators
// UseGuards - applies a guard to protect routes
// Request - gives access to the full request object
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  UseGuards,
  Request,
  Param,
  Body,
  Query,
} from '@nestjs/common';

// Import AdminGuard to protect all admin routes
// This ensures only users with role='admin' can access these endpoints
import { AdminGuard } from './admin.guard';

// Import AdminService for business logic (currently empty)
import { AdminService } from './admin.service';

// Import DTOs for type safety
import { CreateEmployeeDto, UpdateEmployeeDto, LeaveCalendarQueryDto } from './dto';

// @Controller('admin') means all routes in this controller start with /admin
// So the full URL will be: http://localhost:PORT/admin/...
@Controller('admin')
// @UseGuards(AdminGuard) applies AdminGuard to ALL routes in this controller
// This means every route here requires:
// 1. Valid JWT token (authentication)
// 2. role === 'admin' (authorization)
@UseGuards(AdminGuard)
export class AdminController {
  // Constructor injection - NestJS automatically provides AdminService
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // EMPLOYEE MANAGEMENT ROUTES
  // ============================================

  /**
   * POST /admin/employees
   * Add a new employee to the system.
   *
   * Request Body (CreateEmployeeDto):
   * {
   *   "email": "employee@example.com",
   *   "password": "securePassword123",
   *   "first_name": "John",
   *   "last_name": "Doe"
   * }
   *
   * Returns: Created employee object (without password)
   * Throws: BadRequestException if email already exists
   */
  @Post('employees')
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    // Delegates to service layer which handles:
    // 1. Email uniqueness validation
    // 2. Password hashing with bcrypt
    // 3. Creating user with role forced to 'employee'
    // 4. Returning employee without password field
    return this.adminService.createEmployee(createEmployeeDto);
  }

  /**
   * PATCH /admin/employees/:id
   * Update an employee's details (partial update).
   *
   * @param id - The employee's user ID
   * @param updateEmployeeDto - Fields to update (all optional):
   *   - firstName: Employee's first name
   *   - lastName: Employee's last name
   *   - email: Employee's email (checked for uniqueness)
   *   - role: Employee's role ('employee' or 'admin')
   *   - isLocked: Lock status (true = cannot login)
   *
   * Note: Password cannot be updated through this endpoint
   *
   * @returns Updated employee object (without password)
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if new email is already taken
   */
  @Patch('employees/:id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    // Delegates to service layer which handles:
    // 1. Checking employee exists
    // 2. Email uniqueness validation (if email is being changed)
    // 3. Partial update using TypeORM
    // 4. Returning updated employee without password
    return this.adminService.updateEmployee(id, updateEmployeeDto);
  }

  /**
   * DELETE /admin/employees/:id
   * Soft delete (deactivate) an employee.
   *
   * This sets the deletedAt timestamp instead of permanently removing the record.
   * Deactivated employees cannot login and are excluded from employee lists.
   *
   * Rules:
   * - Employee must exist
   * - Cannot deactivate admin users (only employees)
   *
   * @param id - The employee's user ID
   * @returns Success message confirming deactivation
   * @throws NotFoundException if employee doesn't exist
   * @throws BadRequestException if trying to delete an admin user
   */
  @Delete('employees/:id')
  async deleteEmployee(@Param('id') id: string) {
    return this.adminService.softDeleteEmployee(id);
  }

  // POST /admin/employees/:id/roles - Assign roles to employee
  // Placeholder - no implementation yet
  @Post('employees/:id/roles')
  async assignRoles(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement role assignment logic
    return { message: 'Role assignment endpoint - not implemented yet' };
  }

  // ============================================
  // SETTINGS ROUTES
  // ============================================

  // GET /admin/settings - View system settings
  // Placeholder - no implementation yet
  @Get('settings')
  async getSettings() {
    // TODO: Implement settings retrieval logic
    return { message: 'Get settings endpoint - not implemented yet' };
  }

  // PUT /admin/settings - Update system settings
  // Placeholder - no implementation yet
  @Put('settings')
  async updateSettings(@Body() body: any) {
    // TODO: Implement settings update logic
    return { message: 'Update settings endpoint - not implemented yet' };
  }

  // GET /admin/settings/roles - View roles and permissions
  // Placeholder - no implementation yet
  @Get('settings/roles')
  async getRoles() {
    // TODO: Implement roles retrieval logic
    return { message: 'Get roles endpoint - not implemented yet' };
  }

  // POST /admin/settings/roles - Create or update roles
  // Placeholder - no implementation yet
  @Post('settings/roles')
  async createOrUpdateRole(@Body() body: any) {
    // TODO: Implement role creation/update logic
    return { message: 'Create/update role endpoint - not implemented yet' };
  }

  // ============================================
  // LOGOUT ROUTE
  // ============================================

  // POST /admin/logout - Admin logout
  // Placeholder - no implementation yet
  @Post('logout')
  async logout(@Request() req: { user: { id: number; email: string; role: string } }) {
    // TODO: Implement admin logout logic
    // req.user contains admin user info from JWT token
    return { message: 'Admin logged out successfully' };
  }

  // ============================================
  // ATTENDANCE MANAGEMENT ROUTES
  // ============================================
  // Documentation Reference: docs/ADMIN.md Section 4

  /**
   * GET /admin/attendance
   * View employee attendance records.
   *
   * Documentation states: "View employee attendance records."
   * TODO: Documentation does not specify:
   *   - Query parameters (e.g., filters by employee_id, date range, pagination)
   *   - Response body structure
   *   - Attendance record entity/model structure
   */
  @Get('attendance')
  async getAttendance() {
    // Delegates to service layer for business logic
    return this.adminService.getAttendance();
  }

  /**
   * GET /admin/attendance/reports
   * Generate attendance reports.
   *
   * Documentation states: "Generate attendance reports."
   * TODO: Documentation does not specify:
   *   - Query parameters (e.g., report type, date range, department)
   *   - Response body structure (e.g., summary stats, detailed records, file download)
   *   - Report format (JSON, CSV, PDF, etc.)
   */
  @Get('attendance/reports')
  async getAttendanceReports() {
    // Delegates to service layer for business logic
    return this.adminService.getAttendanceReports();
  }

  // ============================================
  // LEAVE MANAGEMENT ROUTES (ADMIN)
  // ============================================
  // Documentation Reference: docs/ADMIN.md Section 5
  // "The admin manages employee leave allocation and approvals."

  /**
   * POST /admin/leaves/allocate
   * Allocate leave days to an employee.
   *
   * Request Body (as documented):
   * {
   *   "employee_id": 12,
   *   "total_leave_days": 20,
   *   "year": 2026
   * }
   *
   * TODO: Documentation does not specify:
   *   - Response body structure on success
   *   - Error responses (e.g., employee not found, invalid year)
   *   - Whether this creates new allocation or updates existing
   *   - Leave type differentiation (if any)
   */
  @Post('leaves/allocate')
  async allocateLeave(
    @Body() body: { employee_id: number; total_leave_days: number; year: number },
  ) {
    // Delegates to service layer for business logic
    return this.adminService.allocateLeave(body);
  }

  /**
   * GET /admin/leaves/requests
   * View all leave requests submitted by employees.
   *
   * Documentation states: "View all leave requests submitted by employees."
   * TODO: Documentation does not specify:
   *   - Query parameters (e.g., status filter, employee_id, date range, pagination)
   *   - Response body structure
   *   - Leave request entity/model structure
   */
  @Get('leaves/requests')
  async getLeaveRequests() {
    // Delegates to service layer for business logic
    return this.adminService.getLeaveRequests();
  }

  /**
   * PUT /admin/leaves/requests/:request_id/approve
   * Approve a leave request.
   *
   * Documentation states: "Approve a leave request."
   * TODO: Documentation does not specify:
   *   - Request body (e.g., approval notes, partial approval)
   *   - Response body structure
   *   - Side effects (e.g., notification to employee, leave balance deduction)
   */
  @Put('leaves/requests/:request_id/approve')
  async approveLeaveRequest(@Param('request_id') requestId: string) {
    // Delegates to service layer for business logic
    return this.adminService.approveLeaveRequest(requestId);
  }

  /**
   * PUT /admin/leaves/requests/:request_id/deny
   * Deny a leave request.
   *
   * Documentation states: "Deny a leave request."
   * TODO: Documentation does not specify:
   *   - Request body (e.g., denial reason - often required for audit)
   *   - Response body structure
   *   - Side effects (e.g., notification to employee)
   */
  @Put('leaves/requests/:request_id/deny')
  async denyLeaveRequest(@Param('request_id') requestId: string) {
    // Delegates to service layer for business logic
    return this.adminService.denyLeaveRequest(requestId);
  }

  /**
   * GET /admin/leaves/calendar
   * Fetch employees on leave.
   *
   * Documentation Reference: docs/ADMIN.md Section 5
   *
   * Query Parameters (LeaveCalendarQueryDto):
   * - year (optional): The year to fetch leave calendar for (e.g., 2026)
   * - month (optional): The month of the year, 1-12 (e.g., 3 for March)
   * - employee_id (optional): Filter by specific employee
   *
   * Behavior (as documented):
   * - If employee_id is not supplied, fetches all employees on leave in given month
   * - If employee_id is supplied, fetches only that employee's leave information
   * - If month, year, and employee_id are not supplied, defaults to current month/year
   *   (default logic to be implemented later)
   */
  @Get('leaves/calendar')
  async getLeaveCalendar(@Query() query: LeaveCalendarQueryDto) {
    // TODO: Implement leave calendar logic in service layer
    // Default to current month/year when no parameters provided (logic TBD)
    return { message: 'Leave calendar route created successfully' };
  }
}


