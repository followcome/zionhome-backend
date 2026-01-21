// Import Injectable decorator from NestJS
import { Injectable } from '@nestjs/common';

// Import AuthGuard from @nestjs/passport
// AuthGuard is a pre-built guard that uses Passport strategies
import { AuthGuard } from '@nestjs/passport';

// @Injectable() makes this class available for dependency injection
@Injectable()
// AuthGuard('jwt') tells NestJS to use the JWT strategy we created
// 'jwt' is the default name for JwtStrategy
// This guard will:
// 1. Extract the token from Authorization header
// 2. Verify the token using JWT_SECRET
// 3. Call JwtStrategy.validate() to get user info
// 4. Attach user info to request.user
// 5. Allow or deny access to the route
export class JwtAuthGuard extends AuthGuard('jwt') {}

