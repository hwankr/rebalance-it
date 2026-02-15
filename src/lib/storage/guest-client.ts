/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Guest StorageClient — localStorage-backed implementation of StorageClient.
 *
 * Supported Supabase chain patterns (10 patterns, verified against hooks):
 *  1. .from(t).select("*").eq(c,v).maybeSingle()
 *  2. .from(t).select("*").eq(c,v).order(c,opts)
 *  3. .from(t).select("*").eq(c,v).limit(n).maybeSingle()
 *  4. .from(t).insert(data)
 *  5. .from(t).insert(data).select().single()
 *  6. .from(t).update(data).eq(c,v)
 *  7. .from(t).delete().eq(c,v)
 *  8. .from(t).delete().eq(c1,v1).eq(c2,v2)
 *  9. .from(t).upsert(data, { onConflict })
 * 10. .rpc(name, params)
 */

import type { StorageClient, StorageQueryBuilder, StorageError } from "./types";

const GUEST_PREFIX = "guest:";
const GUEST_USER_ID = "guest";

// --- localStorage helpers ---

function readTable(table: string): any[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${GUEST_PREFIX}${table}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTable(table: string, rows: any[]): void {
  try {
    localStorage.setItem(`${GUEST_PREFIX}${table}`, JSON.stringify(rows));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("브라우저 저장 공간이 부족합니다. 일부 데이터를 삭제해주세요.");
    }
    throw e;
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// --- Query Builder ---

type Operation =
  | { type: "select" }
  | { type: "insert"; data: any | any[]; returnData?: boolean; returnSingle?: boolean }
  | { type: "update"; data: any }
  | { type: "delete" }
  | { type: "upsert"; data: any | any[]; onConflict?: string };

interface Filter {
  column: string;
  value: unknown;
}

interface Ordering {
  column: string;
  ascending: boolean;
}

class GuestQueryBuilder<T = any> implements StorageQueryBuilder<T> {
  private table: string;
  private operation: Operation = { type: "select" };
  private filters: Filter[] = [];
  private ordering: Ordering | null = null;
  private limitCount: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string): StorageQueryBuilder<T> {
    if (this.operation.type === "insert") {
      (this.operation as any).returnData = true;
    } else {
      this.operation = { type: "select" };
    }
    return this;
  }

  insert(data: Partial<T> | Partial<T>[]): StorageQueryBuilder<T> {
    this.operation = { type: "insert", data };
    return this;
  }

  update(data: Partial<T>): StorageQueryBuilder<T> {
    this.operation = { type: "update", data };
    return this;
  }

  delete(): StorageQueryBuilder<T> {
    this.operation = { type: "delete" };
    return this;
  }

  upsert(
    data: Partial<T> | Partial<T>[],
    options?: { onConflict?: string },
  ): StorageQueryBuilder<T> {
    this.operation = { type: "upsert", data, onConflict: options?.onConflict };
    return this;
  }

  eq(column: string, value: unknown): StorageQueryBuilder<T> {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): StorageQueryBuilder<T> {
    this.ordering = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number): StorageQueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  maybeSingle(): PromiseLike<{ data: T | null; error: StorageError | null }> {
    const result = this.execute();
    const rows = result.data as any[] | null;
    return Promise.resolve({ data: rows && rows.length > 0 ? rows[0] : null, error: null });
  }

  single(): PromiseLike<{ data: T; error: StorageError | null }> {
    const result = this.execute();
    const rows = result.data as any[] | null;
    if (!rows || rows.length === 0) {
      return Promise.resolve({
        data: null as any,
        error: { message: "No rows found" },
      });
    }
    return Promise.resolve({ data: rows[0], error: null });
  }

  then<TResult1 = { data: T[] | null; error: StorageError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: StorageError | null }) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      const result = this.execute();
      if (onfulfilled) return Promise.resolve(onfulfilled(result as any));
      return Promise.resolve(result as any);
    } catch (e) {
      if (onrejected) return Promise.resolve(onrejected(e));
      return Promise.reject(e);
    }
  }

  // --- Core execution ---

  private execute(): { data: any[] | null; error: StorageError | null } {
    switch (this.operation.type) {
      case "select":
        return this.executeSelect();
      case "insert":
        return this.executeInsert();
      case "update":
        return this.executeUpdate();
      case "delete":
        return this.executeDelete();
      case "upsert":
        return this.executeUpsert();
      default:
        return { data: null, error: { message: "Unknown operation" } };
    }
  }

  private applyFilters(rows: any[]): any[] {
    return rows.filter((row) =>
      this.filters.every((f) => String(row[f.column]) === String(f.value)),
    );
  }

  private applyOrdering(rows: any[]): any[] {
    if (!this.ordering) return rows;
    const { column, ascending } = this.ordering;
    return [...rows].sort((a, b) => {
      const aVal = a[column] ?? "";
      const bVal = b[column] ?? "";
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  }

  private applyLimit(rows: any[]): any[] {
    if (this.limitCount === null) return rows;
    return rows.slice(0, this.limitCount);
  }

  private executeSelect(): { data: any[]; error: null } {
    let rows = readTable(this.table);
    rows = this.applyFilters(rows);
    rows = this.applyOrdering(rows);
    rows = this.applyLimit(rows);
    return { data: rows, error: null };
  }

  private executeInsert(): { data: any[]; error: null } {
    const allRows = readTable(this.table);
    const op = this.operation as Extract<Operation, { type: "insert" }>;
    const items = Array.isArray(op.data) ? op.data : [op.data];

    const now = nowISO();
    const inserted = items.map((item) => ({
      id: generateId(),
      ...item,
      created_at: item.created_at ?? now,
      updated_at: item.updated_at ?? now,
    }));

    allRows.push(...inserted);
    writeTable(this.table, allRows);

    return { data: inserted, error: null };
  }

  private executeUpdate(): { data: any[]; error: null } {
    const allRows = readTable(this.table);
    const op = this.operation as Extract<Operation, { type: "update" }>;
    const now = nowISO();
    const updated: any[] = [];

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const matches = this.filters.every(
        (f) => String(row[f.column]) === String(f.value),
      );
      if (matches) {
        allRows[i] = {
          ...row,
          ...op.data,
          updated_at: now,
        };
        updated.push(allRows[i]);
      }
    }

    writeTable(this.table, allRows);
    return { data: updated, error: null };
  }

  private executeDelete(): { data: any[]; error: null } {
    const allRows = readTable(this.table);
    const remaining = allRows.filter(
      (row) =>
        !this.filters.every(
          (f) => String(row[f.column]) === String(f.value),
        ),
    );
    const deleted = allRows.length - remaining.length;
    writeTable(this.table, remaining);
    return { data: [{ count: deleted }], error: null };
  }

  private executeUpsert(): { data: any[]; error: null } {
    const allRows = readTable(this.table);
    const op = this.operation as Extract<Operation, { type: "upsert" }>;
    const items = Array.isArray(op.data) ? op.data : [op.data];
    const conflictCols = op.onConflict?.split(",").map((c) => c.trim()) ?? ["id"];
    const now = nowISO();

    for (const item of items) {
      const existingIdx = allRows.findIndex((row) =>
        conflictCols.every((col) => String(row[col]) === String(item[col])),
      );

      if (existingIdx >= 0) {
        allRows[existingIdx] = {
          ...allRows[existingIdx],
          ...item,
          updated_at: item.updated_at ?? now,
        };
      } else {
        allRows.push({
          id: generateId(),
          ...item,
          created_at: item.created_at ?? now,
          updated_at: item.updated_at ?? now,
        });
      }
    }

    writeTable(this.table, allRows);
    return { data: items, error: null };
  }
}

// --- RPC handlers for guest mode ---

function handleRpc(
  fn: string,
  params: Record<string, unknown>,
): { data: any; error: StorageError | null } {
  switch (fn) {
    case "apply_preset_to_manual": {
      // Iterates manual_stocks, sets target_pct from preset targets
      const targets = params.p_targets as Array<{
        stock_code: string;
        target_pct: number;
      }>;
      const portfolioId = params.p_portfolio_id as string;

      // Verify portfolio belongs to guest user (defense-in-depth)
      const portfolios = readTable("manual_portfolios");
      const portfolio = portfolios.find(
        (p) => p.id === portfolioId && p.user_id === GUEST_USER_ID,
      );
      if (!portfolio) {
        return { data: null, error: { message: "Portfolio not found" } };
      }

      const stocks = readTable("manual_stocks");
      const targetMap = new Map(targets.map((t) => [t.stock_code, t.target_pct]));

      for (let i = 0; i < stocks.length; i++) {
        if (stocks[i].portfolio_id === portfolioId) {
          stocks[i].target_pct = targetMap.get(stocks[i].stock_code) ?? 0;
          stocks[i].updated_at = nowISO();
        }
      }

      writeTable("manual_stocks", stocks);
      return { data: null, error: null };
    }

    case "apply_preset_to_targets": {
      // Clears guest user's targets only, inserts new ones
      const targets = params.p_targets as Array<{
        stock_code: string;
        stock_name: string;
        target_pct: number;
      }>;
      const now = nowISO();

      // Preserve any non-guest targets (defense-in-depth)
      const allTargets = readTable("stock_targets");
      const otherUserTargets = allTargets.filter(
        (t) => t.user_id !== GUEST_USER_ID,
      );

      const newTargets = targets.map((t) => ({
        id: generateId(),
        user_id: GUEST_USER_ID,
        stock_code: t.stock_code,
        stock_name: t.stock_name,
        target_pct: t.target_pct,
        created_at: now,
        updated_at: now,
      }));
      writeTable("stock_targets", [...otherUserTargets, ...newTargets]);
      return { data: null, error: null };
    }

    case "toggle_execution_order": {
      // Toggle an order's executed status in a progressive rebalancing session
      const executionId = params.p_execution_id as string;
      const stockCode = params.p_stock_code as string;
      const executed = params.p_executed as boolean;
      const executions = readTable("executions");
      const exec = executions.find((e) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }

      const orders = (exec.orders ?? []) as Array<Record<string, unknown>>;
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].stock_code === stockCode) {
          orders[i].executed = executed;
          orders[i].executed_at = executed ? nowISO() : null;
        }
      }
      exec.orders = orders;

      // Update success/fail counts
      const successCount = orders.filter((o) => o.executed).length;
      exec.success_count = successCount;
      exec.fail_count = orders.length - successCount;

      writeTable("executions", executions);
      return { data: orders, error: null };
    }

    case "complete_rebalance_session": {
      // Mark a progressive rebalancing session as completed or partial
      const executionId = params.p_execution_id as string;
      const executions = readTable("executions");
      const exec = executions.find((e) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }

      const orders = (exec.orders ?? []) as Array<Record<string, unknown>>;
      const allExecuted = orders.every((o) => o.executed);
      exec.status = allExecuted ? "completed" : "partial";
      exec.completed_at = nowISO();

      writeTable("executions", executions);
      return { data: null, error: null };
    }

    case "abandon_rebalance_session": {
      // Mark a progressive rebalancing session as abandoned
      const executionId = params.p_execution_id as string;
      const executions = readTable("executions");
      const exec = executions.find((e) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }

      exec.status = "abandoned";
      exec.completed_at = nowISO();

      writeTable("executions", executions);
      return { data: null, error: null };
    }

    default:
      return {
        data: null,
        error: { message: `RPC "${fn}" is not available in guest mode` },
      };
  }
}

// --- Public API ---

export function createGuestClient(): StorageClient {
  return {
    from(table: string) {
      return new GuestQueryBuilder(table);
    },

    rpc(fn: string, params: Record<string, unknown>) {
      const result = handleRpc(fn, params);
      return Promise.resolve(result);
    },

    auth: {
      getUser() {
        return Promise.resolve({
          data: { user: { id: GUEST_USER_ID } },
        });
      },
    },
  };
}
