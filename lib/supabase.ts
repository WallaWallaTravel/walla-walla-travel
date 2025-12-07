/**
 * Supabase Stub Module
 * 
 * This is a stub - the actual project uses PostgreSQL with direct queries,
 * not Supabase. This file exists to prevent TypeScript errors from legacy code.
 * 
 * TODO: Refactor ClientNotesClient.tsx to use API routes instead of Supabase
 */

// Create a chainable stub that returns itself for method chaining
interface StubQueryBuilder {
  select: (columns?: string) => StubQueryBuilder;
  insert: (data: unknown) => StubQueryBuilder;
  update: (data: unknown) => StubQueryBuilder;
  upsert: (data: unknown) => StubQueryBuilder;
  delete: () => StubQueryBuilder;
  eq: (column: string, value: unknown) => StubQueryBuilder;
  neq: (column: string, value: unknown) => StubQueryBuilder;
  gt: (column: string, value: unknown) => StubQueryBuilder;
  lt: (column: string, value: unknown) => StubQueryBuilder;
  single: () => StubQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => StubQueryBuilder;
  then: <T>(onfulfilled?: (value: { data: null; error: Error }) => T) => Promise<T>;
}

// Create a mock supabase client that warns on usage
const createStubClient = () => {
  const createQueryBuilder = (tableName: string): StubQueryBuilder => {
    const result = { data: null, error: new Error('Supabase not configured - use API routes') };
    
    const builder: StubQueryBuilder = {
      select: (columns?: string) => {
        console.warn(`[Supabase Stub] select("${columns}") called on table "${tableName}" - this feature needs refactoring`);
        return builder;
      },
      insert: (data: unknown) => {
        console.warn(`[Supabase Stub] insert() called on table "${tableName}" - this feature needs refactoring`);
        return builder;
      },
      update: (data: unknown) => {
        console.warn(`[Supabase Stub] update() called on table "${tableName}" - this feature needs refactoring`);
        return builder;
      },
      upsert: (data: unknown) => {
        console.warn(`[Supabase Stub] upsert() called on table "${tableName}" - this feature needs refactoring`);
        return builder;
      },
      delete: () => {
        console.warn(`[Supabase Stub] delete() called on table "${tableName}" - this feature needs refactoring`);
        return builder;
      },
      eq: (column: string, value: unknown) => builder,
      neq: (column: string, value: unknown) => builder,
      gt: (column: string, value: unknown) => builder,
      lt: (column: string, value: unknown) => builder,
      single: () => builder,
      order: (column: string, options?: { ascending?: boolean }) => builder,
      then: <T>(onfulfilled?: (value: { data: null; error: Error }) => T) => {
        return Promise.resolve(result).then(onfulfilled);
      },
    };
    
    return builder;
  };

  return {
    from: (tableName: string) => createQueryBuilder(tableName),
  };
};

export const supabase = createStubClient();

