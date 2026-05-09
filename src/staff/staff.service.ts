import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Attendance } from '../entities/attendance.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveAllocation } from '../entities/leave-allocation.entity';
import { Salary } from '../entities/salary.entity';
import { SalaryPayment } from '../entities/salary-payment.entity';
import { Document } from '../entities/document.entity';
import { DocumentAssignment } from '../entities/document-assignment.entity';
import { Asset } from '../entities/asset.entity';
import { AssetAssignment } from '../entities/asset-assignment.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveAllocation)
    private readonly leaveAllocationRepository: Repository<LeaveAllocation>,
    @InjectRepository(Salary)
    private readonly salaryRepository: Repository<Salary>,
    @InjectRepository(SalaryPayment)
    private readonly salaryPaymentRepository: Repository<SalaryPayment>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentAssignment)
    private readonly documentAssignmentRepository: Repository<DocumentAssignment>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetAssignment)
    private readonly assetAssignmentRepository: Repository<AssetAssignment>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getDashboard(staffId: number): Promise<{
    message: string;
    profile: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      picture: string | null;
    };
    attendanceSummary: {
      presentDays: number;
      totalWorkingDays: number;
      absentDays: number;
      onLeaveDays: number;
    };
    leaveBalance: {
      totalLeaveDays: number;
      usedDays: number;
      remainingDays: number;
      pendingDays: number;
    } | null;
    salarySummary: {
      currentSalary: number;
      lastPayment: {
        amount: number;
        date: Date;
        month: number;
        year: number;
      } | null;
    } | null;
    assets: {
      assignedAssetsCount: number;
      assignedAssets: string[];
    };
    documents: {
      assignedDocumentsCount: number;
    };
    notifications: {
      unreadCount: number;
      recentNotifications: Array<{
        id: number;
        title: string;
        message: string;
        isRead: boolean;
        createdAt: Date;
      }>;
    };
  }> {
    const user = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    const [
      presentDays,
      grantedLeaveRequests,
      leaveAllocation,
      pendingLeaveResult,
      currentSalary,
      lastPaymentRecord,
      activeAssetAssignments,
      assignedDocumentsCount,
      unreadNotificationsCount,
      recentNotificationRecords,
    ] = await Promise.all([
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .where('attendance.employeeId = :staffId', { staffId })
        .andWhere('attendance.date >= :startDate', {
          startDate: this.toISODate(monthStart),
        })
        .andWhere('attendance.date <= :endDate', {
          endDate: this.toISODate(monthEnd),
        })
        .getCount(),
      this.leaveRequestRepository
        .createQueryBuilder('leaveRequest')
        .where('leaveRequest.employeeId = :staffId', { staffId })
        .andWhere('leaveRequest.status = :status', { status: 'granted' })
        .andWhere('leaveRequest.startDate <= :endDate', {
          endDate: this.toISODate(monthEnd),
        })
        .andWhere('leaveRequest.endDate >= :startDate', {
          startDate: this.toISODate(monthStart),
        })
        .getMany(),
      this.leaveAllocationRepository.findOne({
        where: {
          employeeId: staffId,
          year: currentYear,
        },
      }),
      this.leaveRequestRepository
        .createQueryBuilder('leaveRequest')
        .select('COALESCE(SUM(leaveRequest.numberOfDays), 0)', 'pendingDays')
        .where('leaveRequest.employeeId = :staffId', { staffId })
        .andWhere('leaveRequest.status = :status', { status: 'pending' })
        .andWhere('EXTRACT(YEAR FROM leaveRequest.startDate) = :year', {
          year: currentYear,
        })
        .getRawOne<{ pendingDays: string }>(),
      this.salaryRepository.findOne({
        where: { employeeId: staffId },
        order: { effectiveDate: 'DESC' },
      }),
      this.salaryPaymentRepository.findOne({
        where: { employeeId: staffId },
        order: { paymentDate: 'DESC' },
      }),
      this.assetAssignmentRepository.find({
        where: {
          employeeId: staffId,
          returnedAt: IsNull(),
          asset: {
            deletedAt: IsNull(),
          },
        },
        relations: {
          asset: true,
        },
        order: {
          assignedAt: 'DESC',
        },
      }),
      this.documentAssignmentRepository.count({
        where: { employeeId: staffId },
      }),
      this.notificationRepository.count({
        where: {
          userId: staffId,
          isRead: false,
        },
      }),
      this.notificationRepository.find({
        where: { userId: staffId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    let onLeaveDays = 0;
    for (const leaveRequest of grantedLeaveRequests) {
      const overlapStart =
        leaveRequest.startDate > monthStart ? leaveRequest.startDate : monthStart;
      const overlapEnd = leaveRequest.endDate < monthEnd ? leaveRequest.endDate : monthEnd;
      onLeaveDays += this.calculateWorkingDaysBetween(overlapStart, overlapEnd);
    }

    const totalWorkingDays = this.calculateWorkingDaysInMonth(currentYear, currentMonth);
    const absentDays = Math.max(0, totalWorkingDays - presentDays - onLeaveDays);

    const leaveBalance = leaveAllocation
      ? {
          totalLeaveDays: leaveAllocation.totalLeaveDays,
          usedDays: leaveAllocation.usedDays,
          remainingDays: leaveAllocation.remainingDays,
          pendingDays: Number(pendingLeaveResult?.pendingDays ?? 0),
        }
      : null;

    const salarySummary = currentSalary
      ? {
          currentSalary: Number(currentSalary.amount),
          lastPayment: lastPaymentRecord
            ? {
                amount: Number(lastPaymentRecord.amountPaid),
                date: lastPaymentRecord.paymentDate,
                month: lastPaymentRecord.month,
                year: lastPaymentRecord.year,
              }
            : null,
        }
      : null;

    return {
      message: 'Dashboard retrieved successfully',
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
      attendanceSummary: {
        presentDays,
        totalWorkingDays,
        absentDays,
        onLeaveDays,
      },
      leaveBalance,
      salarySummary,
      assets: {
        assignedAssetsCount: activeAssetAssignments.length,
        assignedAssets: activeAssetAssignments.map((assignment) => assignment.asset.assetName),
      },
      documents: {
        assignedDocumentsCount,
      },
      notifications: {
        unreadCount: unreadNotificationsCount,
        recentNotifications: recentNotificationRecords.map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        })),
      },
    };
  }

  async getProfile(
    staffId: number,
  ): Promise<Omit<User, 'password' | 'refreshToken'>> {
    const user = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    // Remove sensitive fields from profile response.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...profile } = user;

    return profile as Omit<User, 'password' | 'refreshToken'>;
  }

  async updateProfile(
    staffId: number,
    body: any,
  ): Promise<Omit<User, 'password' | 'refreshToken'>> {
    const user = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    const allowedFields: Partial<User> = {};

    if (body.firstName !== undefined) {
      allowedFields.firstName = body.firstName;
    }
    if (body.lastName !== undefined) {
      allowedFields.lastName = body.lastName;
    }
    if (body.middleName !== undefined) {
      allowedFields.middleName = body.middleName;
    }
    if (body.phone !== undefined) {
      allowedFields.phone = body.phone;
    }
    if (body.picture !== undefined) {
      allowedFields.picture = body.picture;
    }
    if (body.gender !== undefined) {
      const genderNormalized =
        body.gender === null || String(body.gender).trim() === ''
          ? null
          : String(body.gender).trim().toLowerCase();

      if (
        genderNormalized !== null &&
        genderNormalized !== 'male' &&
        genderNormalized !== 'female'
      ) {
        throw new BadRequestException("gender must be 'male' or 'female'");
      }

      allowedFields.gender = genderNormalized;
    }

    await this.userRepository.update(staffId, allowedFields);

    const updatedUser = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!updatedUser || updatedUser.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    // Remove sensitive fields from profile response.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...profile } = updatedUser;

    return profile as Omit<User, 'password' | 'refreshToken'>;
  }

  async getMyAttendance(
    staffId: number,
    filters?: { month?: number; year?: number },
  ): Promise<{
    message: string;
    count: number;
    attendance: Array<{ date: Date; createdAt: Date }>;
  }> {
    const queryBuilder = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.employeeId = :staffId', { staffId });

    if (filters?.month !== undefined) {
      queryBuilder.andWhere('EXTRACT(MONTH FROM attendance.date) = :month', {
        month: filters.month,
      });
    }

    if (filters?.year !== undefined) {
      queryBuilder.andWhere('EXTRACT(YEAR FROM attendance.date) = :year', {
        year: filters.year,
      });
    }

    queryBuilder.orderBy('attendance.date', 'DESC');

    const attendanceRecords = await queryBuilder.getMany();

    const attendance = attendanceRecords.map((record) => ({
      date: record.date,
      createdAt: record.createdAt,
    }));

    return {
      message: 'Attendance records retrieved successfully',
      count: attendance.length,
      attendance,
    };
  }

  async getAttendance(
    staffId: number,
    filters?: { month?: number; year?: number },
  ): Promise<{
    message: string;
    count: number;
    attendance: Array<{ date: Date; createdAt: Date }>;
  }> {
    return this.getMyAttendance(staffId, filters);
  }

  async markAttendance(staffId: number): Promise<{ message: string }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayISO = this.toISODate(today);

    const user = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    const existingAttendance = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.employeeId = :staffId', { staffId })
      .andWhere('attendance.date = :today', { today: todayISO })
      .getOne();

    if (existingAttendance) {
      throw new BadRequestException('Attendance already marked for today');
    }

    const approvedLeave = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .where('leaveRequest.employeeId = :staffId', { staffId })
      .andWhere('leaveRequest.status = :status', { status: 'granted' })
      .andWhere('leaveRequest.startDate <= :today', { today: todayISO })
      .andWhere('leaveRequest.endDate >= :today', { today: todayISO })
      .getOne();

    if (approvedLeave) {
      throw new BadRequestException(
        'You are on approved leave today and cannot mark attendance',
      );
    }

    const attendance = this.attendanceRepository.create({
      employeeId: staffId,
      date: today,
    });

    await this.attendanceRepository.save(attendance);

    return {
      message: `Attendance marked successfully for ${todayISO}`,
    };
  }

  async requestLeave(
    staffId: number,
    body: { startDate: string; endDate: string; reason: string },
  ): Promise<{
    message: string;
    leaveRequest: {
      id: number;
      employeeId: number;
      startDate: Date;
      endDate: Date;
      numberOfDays: number;
      reason: string;
      status: string;
      createdAt: Date;
    };
  }> {
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason || String(reason).trim() === '') {
      throw new BadRequestException('startDate, endDate and reason are required');
    }

    const parsedStartDate = this.parseISODate(startDate);
    const parsedEndDate = this.parseISODate(endDate);

    if (!parsedStartDate || !parsedEndDate) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDateOnly = new Date(
      parsedStartDate.getFullYear(),
      parsedStartDate.getMonth(),
      parsedStartDate.getDate(),
    );
    const endDateOnly = new Date(
      parsedEndDate.getFullYear(),
      parsedEndDate.getMonth(),
      parsedEndDate.getDate(),
    );

    if (startDateOnly < todayDateOnly) {
      throw new BadRequestException('startDate cannot be in the past');
    }

    if (endDateOnly < startDateOnly) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    const currentYear = new Date().getFullYear();
    const leaveAllocation = await this.leaveAllocationRepository.findOne({
      where: {
        employeeId: staffId,
        year: currentYear,
      },
    });

    if (!leaveAllocation) {
      throw new BadRequestException('No leave allocation found for this year');
    }

    const overlappingRequest = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .where('leaveRequest.employeeId = :staffId', { staffId })
      .andWhere('leaveRequest.status IN (:...statuses)', {
        statuses: ['pending', 'granted'],
      })
      .andWhere('leaveRequest.startDate <= :endDate', {
        endDate: this.toISODate(endDateOnly),
      })
      .andWhere('leaveRequest.endDate >= :startDate', {
        startDate: this.toISODate(startDateOnly),
      })
      .getOne();

    if (overlappingRequest) {
      throw new BadRequestException('You already have a leave request for these dates');
    }

    const numberOfDays = this.calculateWorkingDaysBetween(startDateOnly, endDateOnly);

    if (leaveAllocation.remainingDays < numberOfDays) {
      throw new BadRequestException(
        `Insufficient leave days. You have ${leaveAllocation.remainingDays} remaining days`,
      );
    }

    const leaveRequest = this.leaveRequestRepository.create({
      employeeId: staffId,
      startDate: startDateOnly,
      endDate: endDateOnly,
      numberOfDays,
      reason: String(reason).trim(),
      status: 'pending',
    });

    const savedLeaveRequest = await this.leaveRequestRepository.save(leaveRequest);

    return {
      message: 'Leave request submitted successfully',
      leaveRequest: {
        id: savedLeaveRequest.id,
        employeeId: savedLeaveRequest.employeeId,
        startDate: savedLeaveRequest.startDate,
        endDate: savedLeaveRequest.endDate,
        numberOfDays: savedLeaveRequest.numberOfDays,
        reason: savedLeaveRequest.reason,
        status: savedLeaveRequest.status,
        createdAt: savedLeaveRequest.createdAt,
      },
    };
  }

  private calculateWorkingDaysBetween(startDate: Date, endDate: Date): number {
    let workingDays = 0;

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return workingDays;
  }

  private calculateWorkingDaysInMonth(year: number, zeroBasedMonth: number): number {
    const start = new Date(year, zeroBasedMonth, 1);
    const end = new Date(year, zeroBasedMonth + 1, 0);
    return this.calculateWorkingDaysBetween(start, end);
  }

  private parseISODate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsedDate = new Date(year, month - 1, day);
    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return parsedDate;
  }

  private toISODate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getLeaves(
    staffId: number,
    filters?: { status?: string; month?: number; year?: number },
  ): Promise<{
    message: string;
    count: number;
    leaves: Array<{
      id: number;
      employeeId: number;
      startDate: Date;
      endDate: Date;
      numberOfDays: number;
      reason: string;
      status: string;
      reviewedAt: Date | null;
      createdAt: Date;
    }>;
  }> {
    return this.getMyLeaves(staffId, filters);
  }

  async getMyLeaves(
    staffId: number,
    filters?: { status?: string; month?: number; year?: number },
  ): Promise<{
    message: string;
    count: number;
    leaves: Array<{
      id: number;
      employeeId: number;
      startDate: Date;
      endDate: Date;
      numberOfDays: number;
      reason: string;
      status: string;
      reviewedAt: Date | null;
      createdAt: Date;
    }>;
  }> {
    const allowedStatuses = ['pending', 'granted', 'rejected', 'expired'];
    if (filters?.status !== undefined) {
      const normalizedStatus = String(filters.status).trim().toLowerCase();
      if (!allowedStatuses.includes(normalizedStatus)) {
        throw new BadRequestException(
          "status must be one of: 'pending', 'granted', 'rejected', 'expired'",
        );
      }
      filters.status = normalizedStatus;
    }

    if (
      filters?.month !== undefined &&
      (!Number.isInteger(filters.month) || filters.month < 1 || filters.month > 12)
    ) {
      throw new BadRequestException('month must be an integer between 1 and 12');
    }

    if (filters?.year !== undefined && !Number.isInteger(filters.year)) {
      throw new BadRequestException('year must be an integer');
    }

    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .where('leaveRequest.employeeId = :staffId', { staffId });

    if (filters?.status !== undefined) {
      queryBuilder.andWhere('leaveRequest.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.month !== undefined) {
      queryBuilder.andWhere('EXTRACT(MONTH FROM leaveRequest.startDate) = :month', {
        month: filters.month,
      });
    }

    if (filters?.year !== undefined) {
      queryBuilder.andWhere('EXTRACT(YEAR FROM leaveRequest.startDate) = :year', {
        year: filters.year,
      });
    }

    queryBuilder.orderBy('leaveRequest.createdAt', 'DESC');

    const [records, count] = await queryBuilder.getManyAndCount();

    const leaves = records.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      startDate: record.startDate,
      endDate: record.endDate,
      numberOfDays: record.numberOfDays,
      reason: record.reason,
      status: record.status,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
    }));

    return {
      message: 'Leave requests retrieved successfully',
      count,
      leaves,
    };
  }

  async getLeaveBalance(staffId: number): Promise<{
    message: string;
    totalLeaveDays: number;
    usedDays: number;
    remainingDays: number;
    pendingDays: number;
    year: number;
  }> {
    const currentYear = new Date().getFullYear();

    const leaveAllocation = await this.leaveAllocationRepository.findOne({
      where: {
        employeeId: staffId,
        year: currentYear,
      },
    });

    if (!leaveAllocation) {
      throw new BadRequestException('No leave allocation found for this year');
    }

    const pendingResult = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .select('COALESCE(SUM(leaveRequest.numberOfDays), 0)', 'pendingDays')
      .where('leaveRequest.employeeId = :staffId', { staffId })
      .andWhere('leaveRequest.status = :status', { status: 'pending' })
      .andWhere('EXTRACT(YEAR FROM leaveRequest.startDate) = :year', {
        year: currentYear,
      })
      .getRawOne<{ pendingDays: string }>();

    const pendingDays = Number(pendingResult?.pendingDays ?? 0);

    return {
      message: 'Leave balance retrieved successfully',
      totalLeaveDays: leaveAllocation.totalLeaveDays,
      usedDays: leaveAllocation.usedDays,
      remainingDays: leaveAllocation.remainingDays,
      pendingDays,
      year: currentYear,
    };
  }

  async getLeaveCalendar(
    staffId: number,
    filters?: { year?: number; month?: number },
  ): Promise<{
    message: string;
    count: number;
    calendar: Array<{
      startDate: Date;
      endDate: Date;
      numberOfDays: number;
      reason: string;
      status: string;
      color: string;
    }>;
  }> {
    return this.getMyLeaveCalendar(staffId, filters);
  }

  async getMyLeaveCalendar(
    staffId: number,
    filters?: { year?: number; month?: number },
  ): Promise<{
    message: string;
    count: number;
    calendar: Array<{
      startDate: Date;
      endDate: Date;
      numberOfDays: number;
      reason: string;
      status: string;
      color: string;
    }>;
  }> {
    if (
      filters?.month !== undefined &&
      (!Number.isInteger(filters.month) || filters.month < 1 || filters.month > 12)
    ) {
      throw new BadRequestException('month must be an integer between 1 and 12');
    }

    if (filters?.year !== undefined && !Number.isInteger(filters.year)) {
      throw new BadRequestException('year must be an integer');
    }

    const statusColors: Record<string, string> = {
      pending: 'yellow',
      granted: 'green',
      rejected: 'red',
      expired: 'gray',
    };

    const queryBuilder = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .where('leaveRequest.employeeId = :staffId', { staffId });

    if (filters?.year !== undefined) {
      queryBuilder.andWhere('EXTRACT(YEAR FROM leaveRequest.startDate) = :year', {
        year: filters.year,
      });
    }

    if (filters?.month !== undefined) {
      queryBuilder.andWhere('EXTRACT(MONTH FROM leaveRequest.startDate) = :month', {
        month: filters.month,
      });
    }

    queryBuilder.orderBy('leaveRequest.startDate', 'ASC');

    const records = await queryBuilder.getMany();

    const calendar = records.map((record) => ({
      startDate: record.startDate,
      endDate: record.endDate,
      numberOfDays: record.numberOfDays,
      reason: record.reason,
      status: record.status,
      color: statusColors[record.status] ?? 'gray',
    }));

    return {
      message: 'Leave calendar retrieved successfully',
      count: calendar.length,
      calendar,
    };
  }

  async getSalaries(staffId: number): Promise<{
    message: string;
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
    return this.getMySalary(staffId);
  }

  async getMySalary(staffId: number): Promise<{
    message: string;
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
    const salaryRecords = await this.salaryRepository.find({
      where: { employeeId: staffId },
      order: { effectiveDate: 'DESC' },
    });

    if (salaryRecords.length === 0) {
      throw new NotFoundException('No salary structure found');
    }

    const currentSalary = salaryRecords[0];

    const salaryHistory = salaryRecords.map((salary) => ({
      id: salary.id,
      amount: Number(salary.amount),
      effectiveDate: salary.effectiveDate,
      createdAt: salary.createdAt,
    }));

    return {
      message: 'Salary structure retrieved successfully',
      currentSalary: {
        id: currentSalary.id,
        amount: Number(currentSalary.amount),
        effectiveDate: currentSalary.effectiveDate,
        createdAt: currentSalary.createdAt,
      },
      salaryHistory,
    };
  }

  async getSalaryHistory(
    staffId: number,
    filters?: { month?: number; year?: number },
  ): Promise<{
    message: string;
    count: number;
    totalAmountPaid: number;
    salaryPayments: Array<{
      id: number;
      amountPaid: number;
      month: number;
      year: number;
      paymentDate: Date;
      createdAt: Date;
    }>;
  }> {
    return this.getMySalaryHistory(staffId, filters);
  }

  async getMySalaryHistory(
    staffId: number,
    filters?: { month?: number; year?: number },
  ): Promise<{
    message: string;
    count: number;
    totalAmountPaid: number;
    salaryPayments: Array<{
      id: number;
      amountPaid: number;
      month: number;
      year: number;
      paymentDate: Date;
      createdAt: Date;
    }>;
  }> {
    if (
      filters?.month !== undefined &&
      (!Number.isInteger(filters.month) || filters.month < 1 || filters.month > 12)
    ) {
      throw new BadRequestException('month must be an integer between 1 and 12');
    }

    if (filters?.year !== undefined && !Number.isInteger(filters.year)) {
      throw new BadRequestException('year must be an integer');
    }

    const queryBuilder = this.salaryPaymentRepository
      .createQueryBuilder('salaryPayment')
      .where('salaryPayment.employeeId = :staffId', { staffId });

    if (filters?.month !== undefined) {
      queryBuilder.andWhere('salaryPayment.month = :month', {
        month: filters.month,
      });
    }

    if (filters?.year !== undefined) {
      queryBuilder.andWhere('salaryPayment.year = :year', {
        year: filters.year,
      });
    }

    queryBuilder.orderBy('salaryPayment.paymentDate', 'DESC');

    const [records, count] = await queryBuilder.getManyAndCount();

    const salaryPayments = records.map((record) => ({
      id: record.id,
      amountPaid: Number(record.amountPaid),
      month: record.month,
      year: record.year,
      paymentDate: record.paymentDate,
      createdAt: record.createdAt,
    }));

    const totalAmountPaid = salaryPayments.reduce(
      (total, payment) => total + payment.amountPaid,
      0,
    );

    return {
      message: 'Salary payment history retrieved successfully',
      count,
      totalAmountPaid,
      salaryPayments,
    };
  }

  async getDocuments(staffId: number): Promise<{
    message: string;
    count: number;
    documents: Array<{
      id: number;
      title: string;
      fileUrl: string | null;
      createdAt: Date;
    }>;
  }> {
    return this.getMyDocuments(staffId);
  }

  async getMyDocuments(staffId: number): Promise<{
    message: string;
    count: number;
    documents: Array<{
      id: number;
      title: string;
      fileUrl: string | null;
      createdAt: Date;
    }>;
  }> {
    const assignments = await this.documentAssignmentRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.document', 'document')
      .where('assignment.employeeId = :staffId', { staffId })
      .andWhere('document.deletedAt IS NULL')
      .orderBy('document.createdAt', 'DESC')
      .getMany();

    const documents = assignments.map((assignment) => ({
      id: assignment.document.id,
      title: assignment.document.title,
      fileUrl: assignment.document.fileUrl,
      createdAt: assignment.document.createdAt,
    }));

    return {
      message: 'Documents retrieved successfully',
      count: documents.length,
      documents,
    };
  }

  async getDocumentById(
    staffId: number,
    documentId: string,
  ): Promise<{
    message: string;
    document: {
      id: number;
      title: string;
      fileUrl: string | null;
      createdAt: Date;
    };
  }> {
    return this.getMyDocument(staffId, documentId);
  }

  async getMyDocument(
    staffId: number,
    documentId: string,
  ): Promise<{
    message: string;
    document: {
      id: number;
      title: string;
      fileUrl: string | null;
      createdAt: Date;
    };
  }> {
    const parsedDocumentId = Number(documentId);
    if (!Number.isInteger(parsedDocumentId) || parsedDocumentId <= 0) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.documentRepository.findOne({
      where: { id: parsedDocumentId },
      withDeleted: true,
    });

    if (!document || document.deletedAt) {
      throw new NotFoundException('Document not found');
    }

    const assignment = await this.documentAssignmentRepository.findOne({
      where: {
        documentId: parsedDocumentId,
        employeeId: staffId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Document not found or not assigned to you');
    }

    return {
      message: 'Document retrieved successfully',
      document: {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        createdAt: document.createdAt,
      },
    };
  }

  async getAssets(staffId: number): Promise<{
    message: string;
    count: number;
    assets: Array<{
      id: number;
      assetName: string;
      status: string;
      amount: number;
      currency: string;
      purchasedOn: Date;
      quantity: number;
      description: string | null;
      assignedAt: Date;
    }>;
  }> {
    return this.getMyAssets(staffId);
  }

  async getMyAssets(staffId: number): Promise<{
    message: string;
    count: number;
    assets: Array<{
      id: number;
      assetName: string;
      status: string;
      amount: number;
      currency: string;
      purchasedOn: Date;
      quantity: number;
      description: string | null;
      assignedAt: Date;
    }>;
  }> {
    const assignments = await this.assetAssignmentRepository.find({
      where: {
        employeeId: staffId,
        returnedAt: IsNull(),
        asset: {
          deletedAt: IsNull(),
        },
      },
      relations: {
        asset: true,
      },
      order: {
        assignedAt: 'DESC',
      },
    });

    const assets = assignments.map((assignment) => ({
      id: assignment.asset.id,
      assetName: assignment.asset.assetName,
      status: assignment.asset.status,
      amount: Number(assignment.asset.amount),
      currency: assignment.asset.currency,
      purchasedOn: assignment.asset.purchasedOn,
      quantity: assignment.asset.quantity,
      description: assignment.asset.description,
      assignedAt: assignment.assignedAt,
    }));

    return {
      message: 'Assigned assets retrieved successfully',
      count: assets.length,
      assets,
    };
  }

  async getAssetById(
    staffId: number,
    assetId: string,
  ): Promise<{
    message: string;
    asset: {
      id: number;
      assetName: string;
      status: string;
      amount: number;
      currency: string;
      purchasedOn: Date;
      quantity: number;
      description: string | null;
      assignedAt: Date;
    };
  }> {
    return this.getMyAsset(staffId, assetId);
  }

  async getMyAsset(
    staffId: number,
    assetId: string,
  ): Promise<{
    message: string;
    asset: {
      id: number;
      assetName: string;
      status: string;
      amount: number;
      currency: string;
      purchasedOn: Date;
      quantity: number;
      description: string | null;
      assignedAt: Date;
    };
  }> {
    const parsedAssetId = Number(assetId);
    if (!Number.isInteger(parsedAssetId) || parsedAssetId <= 0) {
      throw new NotFoundException('Asset not found');
    }

    const asset = await this.assetAssignmentRepository.findOne({
      where: {
        assetId: parsedAssetId,
        employeeId: staffId,
        returnedAt: IsNull(),
        asset: {
          deletedAt: IsNull(),
        },
      },
      relations: {
        asset: true,
      },
      order: {
        assignedAt: 'DESC',
      },
    });

    if (!asset) {
      const existingAsset = await this.assetRepository.findOne({
        where: { id: parsedAssetId },
        withDeleted: true,
      });

      if (!existingAsset || existingAsset.deletedAt) {
        throw new NotFoundException('Asset not found');
      }

      throw new NotFoundException('Asset not found or not assigned to you');
    }

    return {
      message: 'Asset retrieved successfully',
      asset: {
        id: asset.asset.id,
        assetName: asset.asset.assetName,
        status: asset.asset.status,
        amount: Number(asset.asset.amount),
        currency: asset.asset.currency,
        purchasedOn: asset.asset.purchasedOn,
        quantity: asset.asset.quantity,
        description: asset.asset.description,
        assignedAt: asset.assignedAt,
      },
    };
  }

  async getNotifications(staffId: number): Promise<{
    message: string;
    count: number;
    unreadCount: number;
    notifications: Array<{
      id: number;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: Date;
    }>;
  }> {
    return this.getMyNotifications(staffId);
  }

  async getMyNotifications(staffId: number): Promise<{
    message: string;
    count: number;
    unreadCount: number;
    notifications: Array<{
      id: number;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: Date;
    }>;
  }> {
    const notifications = await this.notificationRepository.find({
      where: { userId: staffId },
      order: { createdAt: 'DESC' },
    });

    const responseNotifications = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    }));

    const unreadCount = responseNotifications.filter(
      (notification) => notification.isRead === false,
    ).length;

    return {
      message: 'Notifications retrieved successfully',
      count: responseNotifications.length,
      unreadCount,
      notifications: responseNotifications,
    };
  }

  async getActivities(_staffId: number): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async createActivity(_staffId: number, _body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async updatePassword(
    staffId: number,
    body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    },
  ): Promise<{ message: string }> {
    return this.changePassword(staffId, body);
  }

  async changePassword(
    staffId: number,
    body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    },
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = body;

    const user = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    if (String(newPassword).length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(staffId, {
      password: hashedPassword,
      refreshToken: null,
    });

    return {
      message: 'Password changed successfully. Please login again.',
    };
  }

  async logout(staffId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: staffId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    await this.userRepository.update(staffId, {
      refreshToken: null,
    });

    return { message: 'Staff logged out successfully' };
  }
}
