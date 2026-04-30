// Import decorators from TypeORM library
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

// Import User entity for the relationships
import { User } from './user.entity';

// @Entity() tells TypeORM this class represents a database table
// The table will be named 'leave_requests'
@Entity('leave_requests')
export class LeaveRequest {
  // @PrimaryGeneratedColumn() creates an auto-incrementing primary key
  // This will be: id SERIAL PRIMARY KEY in PostgreSQL
  @PrimaryGeneratedColumn()
  id: number;

  // Foreign key column that references the users table
  // This stores the user ID of the employee requesting leave
  @Column()
  employeeId: number;

  // @ManyToOne() defines a many-to-one relationship
  // Many LeaveRequests can belong to one User (employee)
  // onDelete: 'CASCADE' means if the user is deleted, their requests are too
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn() specifies which column holds the foreign key
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  // Start date of the leave period
  // { type: 'date' } stores only the date, not time
  @Column({ type: 'date' })
  startDate: Date;

  // End date of the leave period
  // { type: 'date' } stores only the date, not time
  @Column({ type: 'date' })
  endDate: Date;

  // Number of days requested
  // Calculated from startDate to endDate (inclusive)
  @Column({ type: 'int' })
  numberOfDays: number;

  // Reason for taking leave
  // { type: 'text' } allows longer text than varchar(255)
  @Column({ type: 'text' })
  reason: string;

  // Status of the leave request
  // Can be: 'pending', 'granted', 'rejected', or 'expired'
  // Default is 'pending' when employee submits a new request
  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  // ID of the admin who reviewed (granted/rejected) the request
  // { nullable: true } because it's null until reviewed
  @Column({ type: 'int', nullable: true })
  reviewedBy: number | null;

  // @ManyToOne() relationship to User (the admin who reviewed)
  // This is optional (nullable) because not all requests are reviewed yet
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  // onDelete: 'SET NULL' means if the admin is deleted, this becomes null
  // (we still keep the request, just lose the reviewer reference)
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User | null;

  // Timestamp when the request was reviewed
  // { nullable: true } because it's null until reviewed
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  // @CreateDateColumn() automatically sets to current timestamp when created
  // This tracks when the employee submitted the request
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
