// Import decorators from TypeORM library
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Import User entity for the relationship
import { User } from './user.entity';

// @Entity() tells TypeORM this class represents a database table
// The table will be named 'salaries'
// This table stores salary history - each row represents a salary record
// When salary changes, a NEW row is added (not updated) to preserve history
@Entity('salaries')
export class Salary {
  // @PrimaryGeneratedColumn() creates an auto-incrementing primary key
  // This will be: id SERIAL PRIMARY KEY in PostgreSQL
  @PrimaryGeneratedColumn()
  id: number;

  // Foreign key column that references the users table
  // This stores the user ID of the employee
  @Column()
  employeeId: number;

  // @ManyToOne() defines a many-to-one relationship
  // Many Salary records can belong to one User (employee)
  // This allows tracking salary history over time
  // onDelete: 'CASCADE' means if the user is deleted, their salary records are too
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn() specifies which column holds the foreign key
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  // The salary amount
  // { type: 'decimal', precision: 12, scale: 2 } stores money values accurately
  // precision: 12 = total digits, scale: 2 = digits after decimal
  // This allows amounts up to 9,999,999,999.99
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  amount: number;

  // The date when this salary took effect
  // { type: 'date' } stores only the date, not time
  // This tracks when a salary change became effective
  @Column({ type: 'date' })
  effectiveDate: Date;

  // @CreateDateColumn() automatically sets to current timestamp when created
  // This tracks when the salary record was added to the system
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // @UpdateDateColumn() automatically updates to current timestamp on any update
  // Useful for audit purposes
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
