// Import Module decorator from NestJS
import { Module } from '@nestjs/common';

// Import AdminController and AdminService
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// @Module() groups related code together
// Think of it like a folder that organizes related features
@Module({
  // controllers: Classes that handle incoming HTTP requests
  controllers: [AdminController],

  // providers: Classes that contain business logic (services)
  // These can be injected into controllers or other services
  providers: [AdminService],
})
export class AdminModule {}


