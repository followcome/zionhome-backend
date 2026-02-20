// Import Module decorator from NestJS
import { Module } from '@nestjs/common';

// Import TypeOrmModule to access repositories
import { TypeOrmModule } from '@nestjs/typeorm';

// Import User entity for repository injection
import { User } from '../entities/user.entity';

// Import AdminController and AdminService
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// Import AdminSalaryController for salary management routes
import { AdminSalaryController } from './admin-salary.controller';

// @Module() groups related code together
// Think of it like a folder that organizes related features
@Module({
  // imports: External modules this module depends on
  // TypeOrmModule.forFeature([User]) makes Repository<User> available for injection
  imports: [TypeOrmModule.forFeature([User])],

  // controllers: Classes that handle incoming HTTP requests
  // AdminController: handles /admin/* routes (employees, settings, attendance, leave)
  // AdminSalaryController: handles /admin/salaries/* routes
  controllers: [AdminController, AdminSalaryController],

  // providers: Classes that contain business logic (services)
  // These can be injected into controllers or other services
  providers: [AdminService],
})
export class AdminModule {}


