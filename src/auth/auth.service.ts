// Import Injectable, UnauthorizedException, and BadRequestException from NestJS
// Injectable: Marks this class as injectable (can be used in other classes)
// UnauthorizedException: Error thrown when login fails (returns 401 status)
// BadRequestException: Error thrown when request is invalid (returns 400 status)
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

// Import JwtService to create JWT tokens
import { JwtService } from '@nestjs/jwt';

// Import InjectRepository to inject the User repository
import { InjectRepository } from '@nestjs/typeorm';

// Import Repository from TypeORM to query the database
import { Repository } from 'typeorm';

// Import bcrypt to compare and hash passwords
// compare() checks if plain password matches hashed password
// hash() creates a new hashed password
import * as bcrypt from 'bcrypt';

// Import the User entity to work with user data
import { User } from '../entities/user.entity';

// @Injectable() marks this class as a "provider"
// Providers contain business logic and can be shared across the app
@Injectable()
export class AuthService {
  // Constructor - NestJS automatically injects these dependencies
  constructor(
    // @InjectRepository(User) gives us access to the users table
    // We can use userRepository to find, create, update, delete users
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    // JwtService is used to create (sign) JWT tokens
    private readonly jwtService: JwtService,
  ) {}

  // login method - handles user authentication
  // Takes email and password, returns token and user info
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }> {
    // Step 1: Find user by email in the database
    // findOne() returns the user if found, or null if not found
    const user = await this.userRepository.findOne({
      where: { email }, // WHERE email = 'provided email'
    });

    // Step 2: Check if user exists
    // If no user found with this email, throw an error
    if (!user) {
      // UnauthorizedException returns HTTP 401 status
      // Message tells the client what went wrong
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 3: Compare the provided password with stored hashed password
    // bcrypt.compare() returns true if passwords match, false otherwise
    // First argument: plain text password (from login request)
    // Second argument: hashed password (from database)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Step 4: Check if password is correct
    // If passwords don't match, throw an error
    if (!isPasswordValid) {
      // Same error message as "user not found" for security
      // This prevents attackers from knowing if an email exists
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 5: Create JWT payload
    // Payload is the data stored inside the token
    // Keep it minimal - just enough to identify the user
    const payload = {
      sub: user.id, // 'sub' is standard JWT claim for subject (user ID)
      email: user.email, // Include email for convenience
    };

    // Step 6: Generate the JWT token
    // jwtService.sign() creates a token with the payload
    // The token is signed with JWT_SECRET from .env
    const token = this.jwtService.sign(payload);

    // Step 7: Return the token and basic user info
    // We don't return the password for security reasons
    return {
      token, // The JWT token for authentication
      user: {
        id: user.id, // User's ID
        email: user.email, // User's email
      },
    };
  }

  // changePassword method - allows authenticated user to change their password
  // userId: The ID of the logged-in user (from JWT token)
  // currentPassword: The user's current password (plain text)
  // newPassword: The new password the user wants to set (plain text)
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Step 1: Find the user by ID in the database
    // We need to get the user's current hashed password to verify
    const user = await this.userRepository.findOne({
      where: { id: userId }, // WHERE id = userId (from JWT)
    });

    // Step 2: Check if user exists (should always exist if JWT is valid)
    // This is a safety check in case the user was deleted
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Step 3: Verify the current password is correct
    // bcrypt.compare() checks if the provided current password
    // matches the hashed password stored in the database
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword, // Plain text password from request
      user.password, // Hashed password from database
    );

    // Step 4: If current password is wrong, throw BadRequestException
    // We use 400 Bad Request (not 401) because the user IS authenticated
    // but they provided an incorrect current password
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Step 5: Hash the new password before storing
    // bcrypt.hash() creates a secure hash of the new password
    // 10 is the "salt rounds" - higher = more secure but slower
    // 10 is a good balance between security and performance
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Step 6: Update the user's password in the database
    // userRepository.update() updates the record with the given ID
    // First argument: the condition (which user to update)
    // Second argument: the new values to set
    await this.userRepository.update(
      { id: userId }, // WHERE id = userId
      { password: hashedNewPassword }, // SET password = hashedNewPassword
    );

    // Step 7: Return success message
    // Password has been changed successfully
    return {
      message: 'Password changed successfully',
    };
  }
}
