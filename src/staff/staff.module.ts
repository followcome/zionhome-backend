import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Attendance,
      LeaveRequest,
      LeaveAllocation,
      Salary,
      SalaryPayment,
      Document,
      DocumentAssignment,
      Asset,
      AssetAssignment,
      Notification,
    ]),
  ],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
