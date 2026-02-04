// Import Injectable decorator from NestJS
// Injectable marks this class as a provider that can be injected into other classes
import { Injectable } from '@nestjs/common';

// @Injectable() marks this class as a "provider"
// Providers contain business logic and can be shared across the app
@Injectable()
export class AdminService {
  // This service will contain admin-related business logic
  // Currently empty as per requirements - no CRUD logic yet
  // Future methods will be added here for:
  // - Employee management
  // - Settings management
  // - Other admin operations
}


