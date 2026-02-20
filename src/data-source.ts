// TypeORM Data Source configuration for CLI migrations
// This file is used by TypeORM CLI to generate and run migrations
// It mirrors the configuration in app.module.ts but in a standalone format

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Create and export the data source
// This is used by TypeORM CLI commands (generate, run, revert migrations)
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'zionhome',

  // Entities - path to compiled entity files
  entities: ['dist/entities/*.js'],

  // Migrations - path to compiled migration files
  migrations: ['dist/migrations/*.js'],

  // Don't auto-sync - we use migrations
  synchronize: false,

  // Enable logging for debugging migration issues
  logging: true,
});
