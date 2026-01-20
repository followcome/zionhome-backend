// Import Injectable and UnauthorizedException from NestJS
// Injectable: Marks this class as injectable (can be used in other classes)
// UnauthorizedException: Error thrown when login fails (returns 401 status)
import { Injectable, UnauthorizedException } from '@nestjs/common';

// Import JwtService to create JWT tokens
import { JwtService } from '@nestjs/jwt';

// Import InjectRepository to inject the User repository
import { InjectRepository } from '@nestjs/typeorm';

// Import Repository from TypeORM to query the database
import { Repository } from 'typeorm';

// Import bcrypt to compare passwords
// compare() checks if plain password matches hashed password
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
}
