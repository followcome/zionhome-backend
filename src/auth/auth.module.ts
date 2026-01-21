// Import Module decorator from NestJS
import { Module } from '@nestjs/common';

// Import PassportModule for authentication strategies
import { PassportModule } from '@nestjs/passport';

// Import JwtModule to create and verify JWT tokens
import { JwtModule } from '@nestjs/jwt';

// Import ConfigService to read environment variables
import { ConfigService } from '@nestjs/config';

// Import TypeOrmModule to access the User entity in the database
import { TypeOrmModule } from '@nestjs/typeorm';

// Import User entity so we can query the users table
import { User } from '../entities/user.entity';

// Import the controller and service we created
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Import JwtStrategy for validating JWT tokens
import { JwtStrategy } from './jwt.strategy';

// @Module() groups related code together
// Think of it like a folder that organizes related features
@Module({
  imports: [
    // TypeOrmModule.forFeature() makes the User entity available in this module
    // This allows AuthService to query the users table
    TypeOrmModule.forFeature([User]),

    // PassportModule registers Passport for authentication
    // This is required for using authentication strategies like JWT
    PassportModule,

    // JwtModule.registerAsync() sets up JWT with environment variables
    // We use Async to access ConfigService for the secret key
    JwtModule.registerAsync({
      // inject ConfigService so we can read from .env
      inject: [ConfigService],

      // useFactory returns the JWT configuration
      useFactory: (configService: ConfigService) => ({
        // secret: The key used to sign tokens (keep this safe!)
        // Read from JWT_SECRET in .env file
        secret: configService.get<string>('JWT_SECRET'),

        // signOptions: Settings for the token
        signOptions: {
          // expiresIn: How long until the token expires
          // '1d' means 1 day (you can use '1h', '7d', etc.)
          expiresIn: '1d',
        },
      }),
    }),
  ],

  // controllers: Classes that handle incoming HTTP requests
  controllers: [AuthController],

  // providers: Classes that contain business logic (services)
  // JwtStrategy is also a provider - it handles JWT validation
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
