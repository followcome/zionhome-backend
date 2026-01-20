// Import decorators from TypeORM library
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}

