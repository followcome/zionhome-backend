// Import CanActivate, ExecutionContext, and ForbiddenException from NestJS
// CanActivate: Interface that guards must implement to control route access
// ExecutionContext: Provides access to request/response objects
// ForbiddenException: Error thrown when user doesn't have permission (403 status)
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

// Import JwtAuthGuard to extend it
// We want admin routes to be authenticated (JWT) AND authorized (admin role)
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// AdminGuard extends JwtAuthGuard
// This means it first checks if user is authenticated (has valid JWT)
// Then it checks if user has admin role
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  // canActivate() is called by NestJS to determine if route can be accessed
  // Returns true if allowed, false or throws exception if denied
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: First check authentication (JWT token valid)
    // This calls the parent JwtAuthGuard's canActivate method
    // If JWT is invalid, it will throw 401 Unauthorized
    const isAuthenticated = await super.canActivate(context);

    // If not authenticated, super.canActivate() throws an error
    // So if we reach here, user IS authenticated

    // Step 2: Get the request object from the execution context
    // ExecutionContext wraps the request/response for different protocols (HTTP, WebSocket, etc.)
    const request = context.switchToHttp().getRequest();

    // Step 3: Extract user info from request
    // After JwtAuthGuard runs, request.user contains { id, email, role }
    // This comes from JwtStrategy.validate() method
    const user = request.user;

    // Step 4: Check if user has admin role
    // Only users with role === 'admin' can access admin routes
    if (user?.role !== 'admin') {
      // Throw ForbiddenException (403 status code)
      // This means: "You're authenticated, but you don't have permission"
      throw new ForbiddenException(
        'Access denied. Admin privileges required.',
      );
    }

    // Step 5: User is authenticated AND has admin role
    // Allow access to the route
    return true;
  }
}


