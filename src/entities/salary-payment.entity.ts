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
// The table will be named 'salary_payments'
// This table tracks actual salary payments made to employees
@Entity('salary_payments')
// @Unique() creates a unique constraint on employeeId + month + year
// This prevents paying the same employee twice for the same month
// The constraint name 'UQ_employee_month_year' helps identify the constraint
@Unique('UQ_employee_month_year', ['employeeId', 'month', 'year'])
export class SalaryPayment {
  // @PrimaryGeneratedColumn() creates an auto-incrementing primary key
  // This will be: id SERIAL PRIMARY KEY in PostgreSQL
  @PrimaryGeneratedColumn()
  id: number;

  // Foreign key column that references the users table
  // This stores the user ID of the employee being paid
  @Column()
  employeeId: number;

  // @ManyToOne() defines a many-to-one relationship
  // Many SalaryPayment records can belong to one User (employee)
  // onDelete: 'CASCADE' means if the user is deleted, their payment records are too
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn() specifies which column holds the foreign key
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  // The month this payment is for (1-12)
  // January = 1, December = 12
  @Column({ type: 'int' })
  month: number;

  // The year this payment is for
  // e.g., 2026
  @Column({ type: 'int' })
  year: number;

  // The amount paid to the employee
  // { type: 'decimal', precision: 12, scale: 2 } stores money values accurately
  // precision: 12 = total digits, scale: 2 = digits after decimal
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountPaid: number;

  // The date when the payment was made
  // { type: 'date' } stores only the date, not time
  @Column({ type: 'date' })
  paymentDate: Date;

  // @CreateDateColumn() automatically sets to current timestamp when created
  // This tracks when the payment record was added to the system
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
