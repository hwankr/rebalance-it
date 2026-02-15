/* eslint-disable @typescript-eslint/no-explicit-any */

export interface StorageError {
  message: string;
  code?: string;
  details?: string;
}

export interface StorageQueryBuilder<T = any> {
  select(columns?: string): StorageQueryBuilder<T>;
  insert(data: Partial<T> | Partial<T>[]): StorageQueryBuilder<T>;
  update(data: Partial<T>): StorageQueryBuilder<T>;
  delete(): StorageQueryBuilder<T>;
  upsert(
    data: Partial<T> | Partial<T>[],
    options?: { onConflict?: string },
  ): StorageQueryBuilder<T>;
  eq(column: string, value: unknown): StorageQueryBuilder<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): StorageQueryBuilder<T>;
  limit(count: number): StorageQueryBuilder<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: StorageError | null }>;
  single(): PromiseLike<{ data: T; error: StorageError | null }>;
  then<TResult1 = { data: T[] | null; error: StorageError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: StorageError | null }) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2>;
}

export interface StorageClient {
  from(table: string): StorageQueryBuilder<Record<string, any>>;
  rpc(
    fn: string,
    params: Record<string, unknown>,
  ): PromiseLike<{ data: any; error: StorageError | null }>;
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null } }>;
  };
}
