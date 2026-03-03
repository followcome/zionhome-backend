// Import decorators from TypeORM library
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// Import User entity for the relationship
import { User } from './user.entity';

// @Entity() tells TypeORM this class represents a database table
// The table will be named 'leave_allocations'
@Entity('leave_allocations')
export class LeaveAllocation {
  // @PrimaryGeneratedColumn() creates an auto-incrementing primary key
  // This will be: id SERIAL PRIMARY KEY in PostgreSQL
  @PrimaryGeneratedColumn()
  id: number;

  // Foreign key column that references the users table
  // This stores the user ID of the employee
  @Column()
  employeeId: number;

  // @ManyToOne() defines a many-to-one relationship
  // Many LeaveAllocations can belong to one User
  // onDelete: 'CASCADE' means if the user is deleted, their allocations are too
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn() specifies which column holds the foreign key
  // name: 'employeeId' tells TypeORM to use the employeeId column
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  // Total leave days allocated to the employee for the year
  // This is set by admin when allocating leave
  @Column({ type: 'int' })
  totalLeaveDays: number;

  // Number of leave days already used by the employee
  // Default is 0 - increments when leave is approved
  @Column({ type: 'int', default: 0 })
  usedDays: number;

  // Number of leave days remaining (totalLeaveDays - usedDays)
  // This could be calculated, but storing it makes queries faster
  @Column({ type: 'int' })
  remainingDays: number;

  // The year this allocation is for (e.g., 2026)
  // Allows tracking leave per calendar year
  @Column({ type: 'int' })
  year: number;
}
