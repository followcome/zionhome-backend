// Import Module decorator from NestJS
import { Module } from '@nestjs/common';

// Import AdminController and AdminService
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// Import AdminSalaryController for salary management routes
import { AdminSalaryController } from './admin-salary.controller';

// @Module() groups related code together
// Think of it like a folder that organizes related features
@Module({
  // controllers: Classes that handle incoming HTTP requests
  // AdminController: handles /admin/* routes (employees, settings, attendance, leave)
  // AdminSalaryController: handles /admin/salaries/* routes
  controllers: [AdminController, AdminSalaryController],

  // providers: Classes that contain business logic (services)
  // These can be injected into controllers or other services
  providers: [AdminService],
})
export class AdminModule {}


