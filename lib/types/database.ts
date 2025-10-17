/**
 * Database Type Definitions
 *
 * Database-specific types and utility interfaces for the Walla Walla Travel system.
 * Includes table names, query helpers, and database operation types.
 */

import type {
  User,
  Vehicle,
  TimeCard,
  Inspection,
  ClientService,
} from './index';

/**
 * Database table names
 * All table names in the database as string literal union
 */
export type TableName =
  | 'users'
  | 'vehicles'
  | 'time_cards'
  | 'inspections'
  | 'client_services'
  | 'vehicle_assignments'
  | 'vehicle_documents'
  | 'emergency_contacts';

/**
 * Database schema map
 * Maps table names to their corresponding types
 */
export interface Database {
  users: User;
  vehicles: Vehicle;
  time_cards: TimeCard;
  inspections: Inspection;
  client_services: ClientService;
}

/**
 * Database error
 * Structured database error information
 */
export interface DatabaseError {
  /** Error code (e.g., '23505' for unique violation) */
  code: string;
  /** Error message */
  message: string;
  /** Table where error occurred */
  table?: TableName;
  /** Constraint that was violated */
  constraint?: string;
  /** Additional error details */
  details?: unknown;
}

/**
 * Query filter operators
 * SQL comparison operators for query building
 */
export type QueryOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'IN'
  | 'NOT IN'
  | 'LIKE'
  | 'ILIKE'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'BETWEEN';

/**
 * Query filter
 * Generic filter for database queries
 */
export interface QueryFilter<T = unknown> {
  /** Field to filter on */
  field: keyof T | string;
  /** Comparison operator */
  operator: QueryOperator;
  /** Value to compare against */
  value?: unknown;
  /** Second value (for BETWEEN operator) */
  value2?: unknown;
}

/**
 * Sort options
 * Sorting configuration for queries
 */
export interface SortOptions<T = unknown> {
  /** Field to sort by */
  field: keyof T | string;
  /** Sort order */
  order: 'asc' | 'desc';
}

/**
 * Query options
 * Configuration for database queries
 */
export interface QueryOptions<T = unknown> {
  /** Filters to apply */
  filters?: QueryFilter<T>[];
  /** Sort configuration */
  sort?: SortOptions<T> | SortOptions<T>[];
  /** Number of results to return */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
  /** Fields to select */
  select?: (keyof T | string)[];
}

/**
 * Database transaction
 * Represents a database transaction
 */
export interface DatabaseTransaction {
  /** Transaction identifier */
  id: string;
  /** Transaction start time */
  startedAt: string;
  /** Operations in this transaction */
  operations: DatabaseOperation[];
  /** Transaction status */
  status: 'pending' | 'committed' | 'rolled_back';
}

/**
 * Database operation
 * Single operation within a transaction
 */
export interface DatabaseOperation {
  /** Operation type */
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  /** Table being operated on */
  table: TableName;
  /** Data for INSERT/UPDATE */
  data?: unknown;
  /** Filters for UPDATE/DELETE/SELECT */
  filters?: QueryFilter[];
  /** Timestamp of operation */
  timestamp: string;
}

/**
 * Connection pool statistics
 * Database connection pool metrics
 */
export interface ConnectionPoolStats {
  /** Total connections in pool */
  total: number;
  /** Active connections */
  active: number;
  /** Idle connections */
  idle: number;
  /** Waiting requests */
  waiting: number;
}

/**
 * Query result metadata
 * Metadata about query execution
 */
export interface QueryMetadata {
  /** Number of rows affected */
  rowCount: number;
  /** Query execution time (milliseconds) */
  executionTime?: number;
  /** Command that was executed */
  command: string;
}

/**
 * Database migration
 * Represents a database migration
 */
export interface DatabaseMigration {
  /** Migration identifier */
  id: string;
  /** Migration name */
  name: string;
  /** Migration version */
  version: number;
  /** When migration was applied */
  appliedAt?: string;
  /** Migration status */
  status: 'pending' | 'applied' | 'failed';
}

/**
 * Aggregate function type
 * SQL aggregate functions
 */
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

/**
 * Aggregate query
 * Configuration for aggregate queries
 */
export interface AggregateQuery<T = unknown> {
  /** Function to apply */
  function: AggregateFunction;
  /** Field to aggregate */
  field: keyof T | string;
  /** Alias for result */
  alias?: string;
  /** Group by fields */
  groupBy?: (keyof T | string)[];
  /** Filters to apply before aggregation */
  filters?: QueryFilter<T>[];
}

/**
 * Join configuration
 * Configuration for table joins
 */
export interface JoinConfig<T = unknown, U = unknown> {
  /** Table to join */
  table: TableName;
  /** Alias for joined table */
  alias?: string;
  /** Join type */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  /** Field from primary table */
  on: keyof T | string;
  /** Field from joined table */
  references: keyof U | string;
}

/**
 * Index information
 * Database index metadata
 */
export interface IndexInfo {
  /** Index name */
  name: string;
  /** Table name */
  table: TableName;
  /** Columns in index */
  columns: string[];
  /** Whether index is unique */
  isUnique: boolean;
  /** Whether index is primary key */
  isPrimary: boolean;
}

/**
 * Table statistics
 * Statistics about a database table
 */
export interface TableStatistics {
  /** Table name */
  table: TableName;
  /** Total number of rows */
  rowCount: number;
  /** Table size in bytes */
  size: number;
  /** Last vacuum time */
  lastVacuum?: string;
  /** Last analyze time */
  lastAnalyze?: string;
}
