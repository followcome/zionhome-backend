// Import the Module decorator from NestJS
import { Module } from '@nestjs/common';

// Import ConfigModule to read .env file
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import TypeOrmModule to connect to PostgreSQL
import { TypeOrmModule } from '@nestjs/typeorm';

// Import ThrottlerModule for rate limiting
// This prevents brute force attacks by limiting requests per time window
import { ThrottlerModule } from '@nestjs/throttler';

// Import the User entity we created
import { User } from './entities/user.entity';

// Import existing app components
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import AuthModule for authentication features
import { AuthModule } from './auth/auth.module';

// Import AdminModule for admin routes
import { AdminModule } from './admin/admin.module';

// @Module() defines this class as a NestJS module
@Module({
  imports: [
    // ConfigModule.forRoot() loads environment variables from .env file
    // isGlobal: true means we can use ConfigService anywhere without re-importing
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ThrottlerModule.forRoot() configures rate limiting globally
    // This protects all endpoints from too many requests
    ThrottlerModule.forRoot([
      {
        // name: Identifier for this throttle configuration
        // You can have multiple configurations with different names
        name: 'default',

        // ttl: Time To Live - the time window in milliseconds
        // 60000 = 60 seconds = 1 minute
        // This means the limit resets every minute
        ttl: 60000,

        // limit: Maximum number of requests allowed in the time window
        // 5 requests per minute per IP address
        // This prevents brute force attacks on login
        limit: 5,
      },
    ]),

    // TypeOrmModule.forRootAsync() sets up database connection
    // We use Async version to access ConfigService for environment variables
    TypeOrmModule.forRootAsync({
      // inject: [ConfigService] gives us access to environment variables
      inject: [ConfigService],

      // useFactory is a function that returns the TypeORM configuration
      useFactory: (configService: ConfigService) => ({
        // type: 'postgres' tells TypeORM we're using PostgreSQL
        type: 'postgres',

        // Database connection details from .env file
        // configService.get() reads values from environment variables
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

        // entities: [User] tells TypeORM which classes represent database tables
        entities: [User],

        // synchronize: true automatically creates/updates tables based on entities
        // WARNING: Only use in development! In production, use migrations instead
        synchronize: true,
      }),
    }),

    // AuthModule contains authentication-related features (login, etc.)
    AuthModule,

    // AdminModule contains admin-only routes (protected by AdminGuard)
    AdminModule,
  ],

  // Controllers handle incoming HTTP requests
  controllers: [AppController],

  // Providers are services that contain business logic
  providers: [AppService],
})
export class AppModule {}
