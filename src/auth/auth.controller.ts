// Import decorators from NestJS
// Controller - marks this class as a controller (handles HTTP requests)
// Post - marks a method to handle POST requests
// Body - extracts data from the request body
import { Controller, Post, Body } from '@nestjs/common';

// Import our AuthService to use its methods
import { AuthService } from './auth.service';

// @Controller('auth') means all routes in this controller start with /auth
// So the full URL will be: http://localhost:PORT/auth/...
@Controller('auth')
export class AuthController {
  // Constructor injection - NestJS automatically provides AuthService
  // This is called "Dependency Injection"
  constructor(private readonly authService: AuthService) {}

  // @Post('login') creates a POST endpoint at /auth/login
  // POST is used because we're sending sensitive data (password)
  // @Body() extracts the JSON data sent in the request
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    // Call the AuthService login method with email and password
    // The service handles:
    // - Finding the user
    // - Checking the password
    // - Generating the JWT token
    // - Throwing errors if login fails
    return this.authService.login(body.email, body.password);
  }
}
