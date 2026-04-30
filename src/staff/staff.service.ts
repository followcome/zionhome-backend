import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Attendance } from '../entities/attendance.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveAllocation } from '../entities/leave-allocation.entity';
import { Salary } from '../entities/salary.entity';
import { SalaryPayment } from '../entities/salary-payment.entity';
import { Document } from '../entities/document.entity';
import { DocumentAssignment } from '../entities/document-assignment.entity';

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
  ) {}

  async getDashboard(_staffId: number): Promise<{ message: string }> {
    return { message: 'coming soon' };
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

  async getAssets(_staffId: number): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getAssetById(_staffId: number, _assetId: string): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getNotifications(_staffId: number): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async getActivities(_staffId: number): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async createActivity(_staffId: number, _body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async updatePassword(_staffId: number, _body: any): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }

  async logout(_staffId: number): Promise<{ message: string }> {
    return { message: 'coming soon' };
  }
}
