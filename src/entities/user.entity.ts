// Import decorators from TypeORM library
// DeleteDateColumn is used for soft delete - stores when record was "deleted"
import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

// @Entity() tells TypeORM this class represents a database table
// The table will be named 'users' (lowercase, plural by convention)
@Entity('users')
export class User {
  // @PrimaryGeneratedColumn() creates an auto-incrementing primary key
  // This will be: id SERIAL PRIMARY KEY in PostgreSQL
  @PrimaryGeneratedColumn()
  id: number;

  // @Column() creates a regular database column
  // { unique: true } means no two users can have the same email
  // This will be: email VARCHAR(255) UNIQUE NOT NULL
  @Column({ unique: true })
  email: string;

  // Password column to store the hashed password
  // This will be: password VARCHAR(255) NOT NULL
  @Column()
  password: string;

  // First name of the user
  // { nullable: true } for backward compatibility with existing records
  @Column({ type: 'varchar', nullable: true })
  firstName: string;

  // Last name of the user
  // { nullable: true } for backward compatibility with existing records
  @Column({ type: 'varchar', nullable: true })
  lastName: string;

  // Optional middle name
  @Column({ type: 'varchar', nullable: true })
  middleName: string | null;

  // Optional phone number
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  // Optional gender: only 'male' or 'female' when set (enforced in API layer on create)
  @Column({ type: 'varchar', nullable: true })
  gender: string | null;

  // Optional profile picture URL
  @Column({ type: 'varchar', nullable: true })
  picture: string | null;

  // Failed login attempts (increments on every failed login)
  // Does NOT reset with time; resets only on successful login or password reset
  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  // Lock flag - when true, account cannot log in
  // Set to true after 5 failed attempts; cleared only on password reset/successful login
  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  // Refresh token column to store the hashed refresh token
  // { nullable: true } means this column can be NULL (empty)
  // { type: 'varchar' } explicitly tells TypeORM this is a string column
  // When user logs in, we store their refresh token here
  // When they log out or token is rotated, old token is replaced
  // This will be: refresh_token VARCHAR(255) NULL
  @Column({ type: 'varchar', nullable: true })
  refreshToken: string;

  // Role column to store user's role (admin or employee)
  // { type: 'varchar' } tells TypeORM this is a string column
  // { default: 'employee' } sets default role for new users
  // This will be: role VARCHAR(255) DEFAULT 'employee'
  @Column({ type: 'varchar', default: 'employee' })
  role: string;

  // Soft delete column - stores when the user was "deleted"
  // @DeleteDateColumn() is a special TypeORM decorator for soft deletes
  // - When null: user is active
  // - When has a date: user has been soft deleted (deactivated)
  // TypeORM automatically:
  // - Sets this to current timestamp when softDelete() or softRemove() is called
  // - Excludes soft-deleted records from find() queries by default
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
