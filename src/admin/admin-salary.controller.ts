// Import decorators from NestJS
import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';

// Import Response type from express for file downloads
import type { Response } from 'express';

// Import AdminGuard to protect all salary routes
// AdminGuard ensures:
// 1. Valid JWT token (authentication via JwtAuthGuard)
// 2. User has role === 'admin' (authorization)
import { AdminGuard } from './admin.guard';

// Import AdminService for business logic
import { AdminService } from './admin.service';

// Import DTOs for type safety and documentation
import {
  CreateSalaryDto,
  UpdateSalaryDto,
  PaySalaryDto,
  SalaryHistoryQueryDto,
  SalaryReportQueryDto,
} from './dto';

// @Controller('admin/salaries') means all routes start with /admin/salaries
// Documentation Reference: docs/ADMIN.md Section 6
// "The admin manages employee salary records, payroll processing, and salary history."
@Controller('admin/salaries')
// @UseGuards(AdminGuard) protects ALL routes in this controller
// Requires: valid JWT token + admin role
@UseGuards(AdminGuard)
export class AdminSalaryController {
  // Constructor injection - NestJS automatically provides AdminService
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // SALARY HISTORY & REPORTS (must be defined BEFORE :employee_id route)
  // ============================================
  // IMPORTANT: These routes must come BEFORE the /:employee_id route
  // Otherwise NestJS will match "history" and "reports" as employee IDs

  /**
   * GET /admin/salaries/history
   * View salary payment history.
   *
   * Optional query parameters (SalaryHistoryQueryDto):
   * - employeeId: Filter by specific employee
   * - month: Filter by month (1-12)
   * - year: Filter by year
   *
   * Returns:
   *   - Payment records with employee details
   *   - Total count and total amount paid
   *
   * All parameters are optional - if none provided returns all payment records.
   */
  @Get('history')
  async getSalaryHistory(@Query() query: SalaryHistoryQueryDto) {
    return this.adminService.getPaymentHistory(query);
  }

  /**
   * GET /admin/salaries/reports
   * Generate payroll reports.
   *
   * Optional query parameters (SalaryReportQueryDto):
   * - month: Filter by month (1-12)
   * - year: Filter by year
   * - role: Filter by specific employee role
   *
   * Returns:
   *   - Summary with totals (employees, paid, unpaid, amount)
   *   - Per-employee breakdown with salary and payment status
   *
   * If no month/year provided, defaults to current month and year.
   */
  @Get('reports')
  async getSalaryReports(@Query() query: SalaryReportQueryDto) {
    return this.adminService.getPayrollReports(query);
  }

  /**
   * GET /admin/salaries/reports/export
   * Export payroll reports as Excel file.
   *
   * Optional query parameters:
   * - month: Filter by month (1-12), defaults to current month
   * - year: Filter by year, defaults to current year
   * - role: Filter by specific employee role
   *
   * Returns: Excel file download
   */
  @Get('reports/export')
  async exportSalaryReports(
    @Query() query: SalaryReportQueryDto,
    @Res() res: Response,
  ) {
    // Get the Excel buffer from the service
    const { buffer, filename } = await this.adminService.exportPayrollReport(query);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the file
    res.send(buffer);
  }

  // ============================================
  // SALARY RECORD MANAGEMENT
  // ============================================

  /**
   * POST /admin/salaries
   * Create a salary structure for an employee.
   *
   * Request Body (CreateSalaryDto):
   * {
   *   "employeeId": 3,
   *   "amount": 200000,
   *   "effectiveDate": "2026-01-01"
   * }
   *
   * Returns: Created salary record with employee details
   * Throws:
   *   - NotFoundException (404) if employee doesn't exist
   *   - BadRequestException (400) if employeeId belongs to an admin
   *   - BadRequestException (400) if salary already exists for this employee
   */
  @Post()
  async createSalary(@Body() createSalaryDto: CreateSalaryDto) {
    // Delegates to service layer for business logic
    return this.adminService.createSalary(createSalaryDto);
  }

  /**
   * POST /admin/salaries/pay
   * Process salary payment for a single employee.
   *
   * Request Body (PaySalaryDto):
   * {
   *   "employeeId": 12,
   *   "month": 3,
   *   "year": 2026,
   *   "amountPaid": 280000,
   *   "paymentDate": "2026-03-30"
   * }
   *
   * Returns: The created payment record with employee details
   * Throws:
   *   - NotFoundException (404) if employee doesn't exist or is soft deleted
   *   - BadRequestException (400) if employeeId belongs to an admin
   *   - BadRequestException (400) if employee already paid for that month
   */
  @Post('pay')
  async paySalary(@Body() paySalaryDto: PaySalaryDto) {
    return this.adminService.processSalaryPayment(paySalaryDto);
  }

  /**
   * POST /admin/salaries/pay-all
   * Process salary payment for ALL employees with a specific role at once.
   *
   * Request Body:
   * {
   *   "role": "video editor",
   *   "month": 3,
   *   "year": 2026,
   *   "paymentDate": "2026-03-30"
   * }
   *
   * Returns: Detailed response with paid employees, skipped employees, and summary
   * Throws:
   *   - NotFoundException (404) if no employees found with that role
   *   - BadRequestException (400) if all employees were skipped
   */
  @Post('pay-all')
  async payAllStaff(
    @Body() payAllDto: { role: string; month: number; year: number; paymentDate: string },
  ) {
    return this.adminService.payAllStaff(payAllDto);
  }

  /**
   * PATCH /admin/salaries/:id
   * Update an existing salary record by adding a NEW row (preserves history).
   *
   * Request Body (UpdateSalaryDto):
   * {
   *   "amount": 300000,
   *   "effectiveDate": "2026-06-01"
   * }
   *
   * Note: The :id here is the salary record ID, not the employee ID.
   * This does NOT overwrite the existing salary record.
   * Instead, it creates a NEW row with the same employeeId to preserve history.
   *
   * Returns: The newly created salary record with employee details
   * Throws:
   *   - NotFoundException (404) if salary record doesn't exist
   */
  @Patch(':id')
  async updateSalary(
    @Param('id') salaryId: string,
    @Body() updateSalaryDto: UpdateSalaryDto,
  ) {
    return this.adminService.updateSalary(
      parseInt(salaryId, 10),
      updateSalaryDto,
    );
  }

  /**
   * GET /admin/salaries/:employee_id
   * View the salary structure and history of an employee.
   *
   * Returns:
   *   - Employee's basic details (firstName, lastName, email)
   *   - Complete salary history (ordered by effectiveDate descending)
   *   - Current salary (most recent record)
   *
   * Throws:
   *   - NotFoundException (404) if employee doesn't exist
   *   - NotFoundException (404) if employee is soft deleted
   *   - NotFoundException (404) if employee has no salary structure
   *   - NotFoundException (404) if employeeId belongs to an admin
   *
   * IMPORTANT: This route must be defined LAST among GET routes
   * because :employee_id is a wildcard that matches any string
   */
  @Get(':employee_id')
  async getEmployeeSalary(@Param('employee_id') employeeId: string) {
    return this.adminService.getEmployeeSalary(parseInt(employeeId, 10));
  }
}
