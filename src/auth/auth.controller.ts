// Import decorators from NestJS
// Controller - marks this class as a controller (handles HTTP requests)
// Post - marks a method to handle POST requests
// Body - extracts data from the request body
// UseGuards - applies a guard to protect a route
// Request - gives access to the full request object (includes user info)
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';

// Import our AuthService to use its methods
import { AuthService } from './auth.service';

// Import our JwtAuthGuard to protect routes
import { JwtAuthGuard } from './jwt-auth.guard';

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
    // - Generating BOTH access token and refresh token
    // - Storing hashed refresh token in database
    // - Throwing errors if login fails
    return this.authService.login(body.email, body.password);
  }

  // @Post('refresh') creates a POST endpoint at /auth/refresh
  // This endpoint exchanges a refresh token for new tokens
  // NO guard needed - we validate the refresh token manually
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    // Call the AuthService refresh method
    // The service handles:
    // - Finding the user by their refresh token
    // - Validating the refresh token
    // - Generating NEW access token
    // - Generating NEW refresh token (rotation)
    // - Invalidating the old refresh token
    // - Returning the new tokens
    return this.authService.refresh(body.refresh_token);
  }

  // @UseGuards(JwtAuthGuard) protects this route
  // Only users with a valid JWT token can access this endpoint
  // If no token or invalid token → 401 Unauthorized
  @UseGuards(JwtAuthGuard)
  // @Post('change-password') creates a POST endpoint at /auth/change-password
  @Post('change-password')
  async changePassword(
    // @Request() gives us access to the request object
    // After JwtAuthGuard runs, request.user contains { id, email }
    // This comes from JwtStrategy.validate() method
    @Request() req: { user: { id: number; email: string } },

    // @Body() extracts the JSON data from the request body
    // We expect current_password and new_password (matching the spec)
    @Body() body: { current_password: string; new_password: string },
  ) {
    // Call the AuthService changePassword method
    // req.user.id: The logged-in user's ID (extracted from JWT token)
    // body.current_password: The user's current password to verify
    // body.new_password: The new password to set
    return this.authService.changePassword(
      req.user.id,
      body.current_password,
      body.new_password,
    );
  }
}
