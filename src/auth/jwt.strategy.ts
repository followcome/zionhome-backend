// Import Injectable decorator from NestJS
import { Injectable } from '@nestjs/common';

// Import PassportStrategy to create a custom authentication strategy
import { PassportStrategy } from '@nestjs/passport';

// Import Strategy and ExtractJwt from passport-jwt
// Strategy: The JWT authentication strategy
// ExtractJwt: Helper to extract JWT from the request
import { Strategy, ExtractJwt } from 'passport-jwt';

// Import ConfigService to read environment variables
import { ConfigService } from '@nestjs/config';

// Define the shape of the JWT payload (what's inside the token)
// This must match what we put in the token during login
interface JwtPayload {
  sub: number; // User ID (subject)
  email: string; // User's email
}

// @Injectable() makes this class available for dependency injection
@Injectable()
// PassportStrategy(Strategy) tells Passport to use JWT strategy
// 'jwt' is the default name for this strategy
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Constructor receives ConfigService to read JWT_SECRET from .env
  constructor(configService: ConfigService) {
    // Get the JWT secret from environment variables
    // We store it in a variable first to check if it exists
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // If JWT_SECRET is not set in .env, throw an error
    // This prevents the app from starting with missing configuration
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    // super() calls the parent class constructor with JWT options
    super({
      // jwtFromRequest: Where to find the JWT in the request
      // fromAuthHeaderAsBearerToken() extracts from "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // ignoreExpiration: false means expired tokens will be rejected
      // If true, expired tokens would still be accepted (bad for security!)
      ignoreExpiration: false,

      // secretOrKey: The secret key used to verify the token signature
      // Must be the same secret used to sign the token during login
      // Now TypeScript knows jwtSecret is definitely a string (not undefined)
      secretOrKey: jwtSecret,
    });
  }

  // validate() is called after JWT is verified
  // The payload is the decoded data from the token
  // Whatever we return here is attached to request.user
  async validate(payload: JwtPayload) {
    // Return user info that will be available in request.user
    // In controllers, you can access this via @Request() req → req.user
    return {
      id: payload.sub, // User ID from the token
      email: payload.email, // User email from the token
    };
  }
}

