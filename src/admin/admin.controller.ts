// Import decorators from NestJS
// Controller - marks this class as a controller (handles HTTP requests)
// Get, Post, Put, Delete - HTTP method decorators
// UseGuards - applies a guard to protect routes
// Request - gives access to the full request object
import {
  Controller,
  Get,
  Post,
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
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  LeaveCalendarQueryDto,
  CreateAssetDto,
} from './dto';

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
  // DASHBOARD ROUTE
  // ============================================

  /**
   * GET /admin/dashboard
   * Fetch system summary statistics.
   *
   * Includes: Total employees, employees on leave, attendance summary,
   * monthly payroll total, total assets, recent procurements, outstanding bills.
   */
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ============================================
  // EMPLOYEE MANAGEMENT ROUTES
  // ============================================

  /**
   * GET /admin/employees
   * Get all employees.
   */
  @Get('employees')
  async getAllEmployees() {
    return this.adminService.getAllEmployees();
  }

  /**
   * GET /admin/employees/:id
   * Get a single employee by ID.
   *
   * @param id - The employee's user ID
   */
  @Get('employees/:id')
  async getEmployeeById(@Param('id') id: string) {
    return this.adminService.getEmployeeById(id);
  }

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

  /**
   * POST /admin/employees/:id/roles
   * Assign a role to an employee.
   *
   * @param id - The employee's user ID
   * @param body - Request body containing: { role: string }
   * @returns Updated employee object (without password and refreshToken)
   * @throws NotFoundException if employee doesn't exist or is soft-deleted
   * @throws BadRequestException if trying to assign 'admin' role
   */
  @Post('employees/:id/roles')
  async assignRoles(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.assignRole(id, body.role);
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

  // PATCH /admin/settings - Update system settings
  // Placeholder - no implementation yet
  @Patch('settings')
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
   * Query Parameters (all optional):
   * - date: Filter by specific date (YYYY-MM-DD format)
   * - employeeId: Filter by specific employee ID
   * - month: Filter by month (1-12)
   * - year: Filter by year
   *
   * Returns: Array of attendance records with employee details
   * Results are ordered by date descending (newest first)
   * Every record means the employee was present that day
   */
  @Get('attendance')
  async getAttendance(
    @Query('date') date?: string,
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    // Build filters object, converting string params to numbers where needed
    const filters = {
      date: date,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    };

    // Delegates to service layer for business logic
    return this.adminService.getAttendance(filters);
  }

  /**
   * GET /admin/attendance/reports
   * Generate attendance reports.
   *
   * Query Parameters (all optional):
   * - month: Month number (1-12), defaults to current month
   * - year: Year number, defaults to current year
   * - employeeId: Generate report for specific employee only
   *
   * Returns: Attendance report with per-employee summary including:
   * - presentDays: days marked attendance
   * - onLeaveDays: days on approved leave
   * - absentDays: working days not present and not on leave
   * - attendancePercentage: (presentDays / workingDays) * 100
   *
   * Working days exclude Saturdays and Sundays
   * Results sorted by attendancePercentage descending (best first)
   */
  @Get('attendance/reports')
  async getAttendanceReports(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    // Build filters object, converting string params to numbers where needed
    const filters = {
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
    };

    // Delegates to service layer for business logic
    return this.adminService.getAttendanceReports(filters);
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
   * Request Body (camelCase):
   * {
   *   "employeeId": 12,
   *   "totalLeaveDays": 20,
   *   "year": 2026
   * }
   *
   * Returns: Created allocation with employee details (without password/refreshToken)
   * Throws:
   *   - NotFoundException (404) if employee doesn't exist
   *   - BadRequestException (400) if employeeId belongs to an admin
   *   - BadRequestException (400) if allocation already exists for this employee and year
   */
  @Post('leaves/allocate')
  async allocateLeave(
    @Body() body: { employeeId: number; totalLeaveDays: number; year: number },
  ) {
    // Delegates to service layer for business logic
    return this.adminService.allocateLeave(body);
  }

  /**
   * GET /admin/leaves/requests
   * View all leave requests submitted by employees.
   *
   * Query Parameters (all optional):
   * - status: Filter by 'pending', 'approved', or 'denied'
   * - employeeId: Filter by specific employee ID
   * - year: Filter by year based on the startDate
   *
   * Returns: Array of leave requests with employee details (without password/refreshToken)
   * Results are ordered by createdAt descending (newest first)
   * Soft-deleted employees are excluded from results
   */
  @Get('leaves/requests')
  async getLeaveRequests(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
  ) {
    // Build filters object, converting string params to numbers where needed
    // Query parameters come as strings from the URL, so we parse them
    const filters = {
      status: status,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    };

    // Delegates to service layer for business logic
    return this.adminService.getLeaveRequests(filters);
  }

  /**
   * PATCH /admin/leaves/requests/:request_id/approve
   * Approve a leave request.
   *
   * Performs all of the following in one operation:
   * - Updates leave request status to 'approved'
   * - Sets reviewedBy to the current admin's user ID
   * - Sets reviewedAt to current timestamp
   * - Deducts numberOfDays from employee's leave allocation (remainingDays)
   * - Increases usedDays in employee's leave allocation
   *
   * Throws:
   *   - NotFoundException (404) if leave request doesn't exist
   *   - BadRequestException (400) if request is already approved/denied
   *   - BadRequestException (400) if employee has no allocation for that year
   *   - BadRequestException (400) if employee doesn't have enough remaining days
   */
  @Patch('leaves/requests/:request_id/approve')
  async approveLeaveRequest(
    @Param('request_id') requestId: string,
    @Request() req: { user: { id: number; email: string; role: string } },
  ) {
    // Pass the admin's user ID from JWT token to the service
    // req.user is populated by the JwtStrategy after token validation
    return this.adminService.approveLeaveRequest(requestId, req.user.id);
  }

  /**
   * PATCH /admin/leaves/requests/:request_id/deny
   * Deny a leave request.
   *
   * Performs all of the following in one operation:
   * - Updates leave request status to 'denied'
   * - Sets reviewedBy to the current admin's user ID
   * - Sets reviewedAt to current timestamp
   * - Does NOT touch leave_allocations (no days deducted)
   *
   * Throws:
   *   - NotFoundException (404) if leave request doesn't exist
   *   - BadRequestException (400) if request is already approved/denied
   */
  @Patch('leaves/requests/:request_id/deny')
  async denyLeaveRequest(
    @Param('request_id') requestId: string,
    @Request() req: { user: { id: number; email: string; role: string } },
  ) {
    // Pass the admin's user ID from JWT token to the service
    return this.adminService.denyLeaveRequest(requestId, req.user.id);
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
    return this.adminService.getLeaveCalendar(query);
  }

  // ============================================
  // PROCUREMENTS MANAGEMENT ROUTES
  // ============================================

  /**
   * POST /admin/procurements
   * Add new equipment procurement.
   */
  @Post('procurements')
  async createProcurement(@Body() body: any) {
    return this.adminService.createProcurement(body);
  }

  /**
   * GET /admin/procurements
   * Fetch all procurement records.
   */
  @Get('procurements')
  async getAllProcurements() {
    return this.adminService.getAllProcurements();
  }

  /**
   * GET /admin/procurements/:procurement_id
   * Fetch single procurement.
   */
  @Get('procurements/:procurement_id')
  async getProcurementById(@Param('procurement_id') procurementId: string) {
    return this.adminService.getProcurementById(procurementId);
  }

  /**
   * DELETE /admin/procurements/:procurement_id
   * Delete procurement record.
   */
  @Delete('procurements/:procurement_id')
  async deleteProcurement(@Param('procurement_id') procurementId: string) {
    return this.adminService.deleteProcurement(procurementId);
  }

  // ============================================
  // BILLS MANAGEMENT ROUTES
  // ============================================

  /**
   * POST /admin/bills
   * Create new bill record.
   */
  @Post('bills')
  async createBill(@Body() body: any) {
    return this.adminService.createBill(body);
  }

  /**
   * GET /admin/bills
   * Fetch all bills.
   */
  @Get('bills')
  async getAllBills() {
    return this.adminService.getAllBills();
  }

  /**
   * GET /admin/bills/:bill_id
   * Fetch single bill.
   */
  @Get('bills/:bill_id')
  async getBillById(@Param('bill_id') billId: string) {
    return this.adminService.getBillById(billId);
  }

  /**
   * DELETE /admin/bills/:bill_id
   * Delete bill record.
   */
  @Delete('bills/:bill_id')
  async deleteBill(@Param('bill_id') billId: string) {
    return this.adminService.deleteBill(billId);
  }

  // ============================================
  // DOCUMENTS MANAGEMENT ROUTES
  // ============================================

  /**
   * POST /admin/documents
   * Upload document.
   */
  @Post('documents')
  async createDocument(@Body() body: any) {
    return this.adminService.createDocument(body);
  }

  /**
   * POST /admin/documents/:document_id/assign
   * Assign document to employee.
   */
  @Post('documents/:document_id/assign')
  async assignDocument(
    @Param('document_id') documentId: string,
    @Body() body: any,
  ) {
    return this.adminService.assignDocument(documentId, body);
  }

  /**
   * GET /admin/documents
   * Fetch all documents.
   */
  @Get('documents')
  async getAllDocuments() {
    return this.adminService.getAllDocuments();
  }

  /**
   * DELETE /admin/documents/:document_id
   * Delete document.
   */
  @Delete('documents/:document_id')
  async deleteDocument(@Param('document_id') documentId: string) {
    return this.adminService.deleteDocument(documentId);
  }

  // ============================================
  // ASSETS MANAGEMENT ROUTES
  // ============================================

  /**
   * POST /admin/assets
   * Add new asset.
   */
  @Post('assets')
  async createAsset(@Body() body: CreateAssetDto) {
    return this.adminService.createAsset(body);
  }

  /**
   * PATCH /admin/assets/:asset_id
   * Update asset details.
   */
  @Patch('assets/:asset_id')
  async updateAsset(@Param('asset_id') assetId: string, @Body() body: any) {
    return this.adminService.updateAsset(assetId, body);
  }

  /**
   * POST /admin/assets/:asset_id/assign
   * Assign asset to employee.
   */
  @Post('assets/:asset_id/assign')
  async assignAsset(@Param('asset_id') assetId: string, @Body() body: any) {
    return this.adminService.assignAsset(assetId, body);
  }

  /**
   * GET /admin/assets
   * Fetch all assets.
   */
  @Get('assets')
  async getAllAssets() {
    return this.adminService.getAllAssets();
  }

  /**
   * GET /admin/assets/:asset_id
   * Fetch single asset.
   */
  @Get('assets/:asset_id')
  async getAssetById(@Param('asset_id') assetId: string) {
    return this.adminService.getAssetById(assetId);
  }

  /**
   * DELETE /admin/assets/:asset_id
   * Delete asset record.
   */
  @Delete('assets/:asset_id')
  async deleteAsset(@Param('asset_id') assetId: string) {
    return this.adminService.deleteAsset(assetId);
  }
}


