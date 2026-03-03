// Import decorators from TypeORM library
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

// Import User entity for the relationship
import { User } from './user.entity';

// @Entity() tells TypeORM this class represents a database table
// The table will be named 'attendances'
@Entity('attendances')
// @Unique() creates a unique constraint on the combination of employeeId and date
// This prevents an employee from marking attendance twice on the same day
// The constraint name 'UQ_employee_date' is optional but useful for debugging
@Unique('UQ_employee_date', ['employeeId', 'date'])
export class Attendance {
  // @PrimaryGeneratedColumn() creates an auto-incrementing primary key
  // This will be: id SERIAL PRIMARY KEY in PostgreSQL
  @PrimaryGeneratedColumn()
  id: number;

  // Foreign key column that references the users table
  // This stores the user ID of the employee marking attendance
  @Column()
  employeeId: number;

  // @ManyToOne() defines a many-to-one relationship
  // Many Attendance records can belong to one User (employee)
  // onDelete: 'CASCADE' means if the user is deleted, their attendance records are too
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn() specifies which column holds the foreign key
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  // The date the employee marked attendance
  // { type: 'date' } stores only the date, not time
  // Every record in this table means the employee was present on this day
  @Column({ type: 'date' })
  date: Date;

  // @CreateDateColumn() automatically sets to current timestamp when created
  // This tracks when the attendance was actually marked in the system
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
