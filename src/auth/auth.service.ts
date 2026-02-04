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

// Import bcrypt to compare and hash passwords/tokens
// compare() checks if plain text matches hashed value
// hash() creates a secure hash
import * as bcrypt from 'bcrypt';

// Import crypto to generate random strings for refresh tokens
// randomBytes() creates cryptographically secure random data
import * as crypto from 'crypto';

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

  // Helper method to generate a random refresh token
  // Returns a 64-character hexadecimal string
  private generateRefreshToken(): string {
    // crypto.randomBytes(32) creates 32 random bytes
    // .toString('hex') converts to 64-character hex string
    // This is cryptographically secure and unique
    return crypto.randomBytes(32).toString('hex');
  }

  // Helper method to hash the refresh token before storing
  // We hash it so even if database is compromised, tokens are safe
  private async hashRefreshToken(token: string): Promise<string> {
    // bcrypt.hash() with 10 salt rounds
    // Same as password hashing
    return bcrypt.hash(token, 10);
  }

  // login method - handles user authentication
  // Takes email and password, returns BOTH tokens and user info
  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: number; email: string };
  }> {
    // Step 1: Find user by email in the database
    // findOne() returns the user if found, or null if not found
    const user = await this.userRepository.findOne({
      where: { email }, // WHERE email = 'provided email'
    });

    // Step 2: If no user found, still return generic error
    // (We can't increment attempts because no account exists)
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 3: Check if account is already locked
    if (user.isLocked) {
      throw new UnauthorizedException(
        'Account locked. Please reset your password.',
      );
    }

    // Step 4: Compare the provided password with stored hashed password
    // bcrypt.compare() returns true if passwords match, false otherwise
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Step 5: Handle invalid password (increment attempts and possibly lock)
    if (!isPasswordValid) {
      const attempts = (user.failedAttempts ?? 0) + 1;
      const shouldLock = attempts >= 5;

      await this.userRepository.update(
        { id: user.id },
        {
          failedAttempts: attempts,
          isLocked: shouldLock,
        },
      );

      // If limit reached, inform user account is locked
      if (shouldLock) {
        throw new UnauthorizedException(
          'Account locked. Please reset your password.',
        );
      }

      // Otherwise, generic invalid credentials
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 6: Password is correct — reset failed attempts and lock flag
    if (user.failedAttempts !== 0 || user.isLocked) {
      await this.userRepository.update(
        { id: user.id },
        { failedAttempts: 0, isLocked: false },
      );
    }

    // Step 7: Create JWT payload for access token
    // Payload is the data stored inside the token
    const payload = {
      sub: user.id, // 'sub' is standard JWT claim for subject (user ID)
      email: user.email, // Include email for convenience
      role: user.role || 'employee', // Include role (admin or employee) for authorization
    };

    // Step 8: Generate the access token (short-lived, e.g., 15 minutes)
    // This token is used for API authentication
    const accessToken = this.jwtService.sign(payload);

    // Step 9: Generate a random refresh token (long-lived)
    // This token is used to get new access tokens
    const refreshToken = this.generateRefreshToken();

    // Step 10: Hash the refresh token before storing in database
    // We never store plain refresh tokens for security
    const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

    // Step 11: Save the hashed refresh token to the user's record
    // This links the refresh token to this specific user
    await this.userRepository.update(
      { id: user.id }, // WHERE id = user.id
      { refreshToken: hashedRefreshToken }, // SET refreshToken = hashed value
    );

    // Step 12: Return both tokens and user info
    // Client stores these and uses accessToken for API calls
    // When accessToken expires, client uses refreshToken to get new ones
    return {
      accessToken, // Short-lived JWT for API authentication
      refreshToken, // Long-lived token for getting new access tokens
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  // refresh method - exchanges refresh token for new tokens
  // Implements token rotation: old refresh token becomes invalid
  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Step 1: Find all users to check their refresh tokens
    // We need to find which user owns this refresh token
    // Note: We search all users because refresh token is hashed
    // and we can't do a direct database lookup
    const users = await this.userRepository.find();

    // Step 2: Find the user whose stored refresh token matches
    let matchedUser: User | null = null;

    for (const user of users) {
      // Skip users without a refresh token
      if (!user.refreshToken) {
        continue;
      }

      // Compare the provided refresh token with the stored hashed token
      // bcrypt.compare() handles the hash comparison securely
      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

      if (isMatch) {
        matchedUser = user;
        break; // Found the user, stop searching
      }
    }

    // Step 3: If no user found with this refresh token, it's invalid
    // This happens if:
    // - Token was never issued
    // - Token was already used (rotated)
    // - Token was manually invalidated
    if (!matchedUser) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Step 4: Generate new access token for the user
    const payload = {
      sub: matchedUser.id,
      email: matchedUser.email,
      role: matchedUser.role || 'employee', // Include role in new access token
    };
    const newAccessToken = this.jwtService.sign(payload);

    // Step 5: Generate a NEW refresh token (rotation)
    // The old refresh token is now invalid
    const newRefreshToken = this.generateRefreshToken();

    // Step 6: Hash the new refresh token
    const hashedNewRefreshToken = await this.hashRefreshToken(newRefreshToken);

    // Step 7: Replace old refresh token with new one in database
    // This is the "rotation" - old token can never be used again
    await this.userRepository.update(
      { id: matchedUser.id },
      { refreshToken: hashedNewRefreshToken },
    );

    // Step 8: Return the new tokens
    // Client must save these and discard the old refresh token
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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
