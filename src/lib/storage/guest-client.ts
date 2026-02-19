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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  select(columns?: string): StorageQueryBuilder<T> {
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
    case "update_execution_order": {
      // Update an order's executed quantity in a progressive rebalancing session
      const executionId = params.p_execution_id as string;
      const stockCode = params.p_stock_code as string;
      const executedQuantity = params.p_executed_quantity as number;
      const actualPrice = params.p_actual_price as number | null | undefined;
      const executions = readTable("executions");
      const exec = executions.find((e: any) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }

      const orders = (exec.orders ?? []) as Array<Record<string, unknown>>;
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].stock_code === stockCode) {
          const clampedQty = Math.max(0, executedQuantity);
          orders[i].executed_quantity = clampedQty;
          orders[i].executed = clampedQty > 0;
          orders[i].executed_at = clampedQty > 0 ? nowISO() : null;
          // Store actual_price if provided
          if (actualPrice != null) {
            orders[i].actual_price = actualPrice;
            orders[i].actual_amount = clampedQty * actualPrice;
          }
        }
      }
      exec.orders = orders;

      // Update success/fail counts
      const successCount = orders.filter((o: any) => o.executed).length;
      exec.success_count = successCount;
      exec.fail_count = orders.length - successCount;

      writeTable("executions", executions);
      return { data: orders, error: null };
    }

    case "toggle_execution_order": {
      // Backward compat wrapper: calls update_execution_order logic
      const executionId = params.p_execution_id as string;
      const stockCode = params.p_stock_code as string;
      const executed = params.p_executed as boolean;
      const executions = readTable("executions");
      const exec = executions.find((e) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }

      const orders = (exec.orders ?? []) as Array<Record<string, unknown>>;
      const order = orders.find((o) => o.stock_code === stockCode);
      const orderQty = order ? (order.quantity as number) ?? 0 : 0;

      return handleRpc("update_execution_order", {
        p_execution_id: executionId,
        p_stock_code: stockCode,
        p_executed_quantity: executed ? orderQty : 0,
      });
    }

    case "complete_rebalance_session": {
      // Mark a progressive rebalancing session as completed or partial + update portfolio
      const executionId = params.p_execution_id as string;
      const executions = readTable("executions");
      const exec = executions.find((e) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }

      const orders = (exec.orders ?? []) as Array<Record<string, unknown>>;

      // Count executed orders (backward compat: support both executed_quantity and executed)
      const executedCount = orders.filter((o) => {
        const execQty = o.executed_quantity as number | undefined;
        if (execQty !== undefined) return execQty > 0;
        return o.executed === true;
      }).length;

      exec.status = executedCount >= orders.length ? "completed" : "partial";
      exec.completed_at = nowISO();
      exec.success_count = executedCount;
      exec.fail_count = orders.length - executedCount;

      writeTable("executions", executions);

      // Portfolio auto-update: adjust stock quantities and cash
      const portfolios = readTable("manual_portfolios");
      const portfolioId = exec.portfolio_id as string | null;
      const portfolio = portfolioId
        ? portfolios.find((p) => p.id === portfolioId)
        : portfolios.find((p) => p.user_id === GUEST_USER_ID);

      if (portfolio) {
        const stocks = readTable("manual_stocks");
        let netCashChange = 0;

        for (const order of orders) {
          // Backward compat: derive executed quantity
          const execQty = (order.executed_quantity as number | undefined) !== undefined
            ? (order.executed_quantity as number)
            : (order.executed === true ? (order.quantity as number) ?? 0 : 0);

          if (execQty <= 0) continue;

          const side = order.side as string;
          const stockCode = order.stock_code as string;
          const stockName = order.stock_name as string;
          const price = (order.actual_price as number) ?? (order.estimated_price as number) ?? 0;
          const currency = (order.currency as string) ?? "KRW";
          // NOTE: estimated_price와 actual_price는 모두 KRW 정규화된 값이므로
          // 환율 추가 적용 없이 그대로 사용한다. (USD 종목도 이미 KRW로 변환됨)
          const stockIdx = stocks.findIndex(
            (s: any) => s.portfolio_id === portfolio.id && s.stock_code === stockCode,
          );

          if (side === "sell") {
            if (stockIdx >= 0) {
              stocks[stockIdx].quantity = Math.max(0, (stocks[stockIdx].quantity as number) - execQty);
              stocks[stockIdx].updated_at = nowISO();
            }
            netCashChange += execQty * price;
          } else if (side === "buy") {
            if (stockIdx >= 0) {
              stocks[stockIdx].quantity = (stocks[stockIdx].quantity as number) + execQty;
              stocks[stockIdx].updated_at = nowISO();
              // Update avg_price when actual_price is available
              if (order.actual_price != null) {
                const existingQty = (stocks[stockIdx].quantity as number) - execQty;
                const existingAvg = (stocks[stockIdx].avg_price as number) ?? 0;
                const newAvg = existingQty > 0
                  ? ((existingAvg * existingQty) + (price * execQty)) / ((stocks[stockIdx].quantity as number))
                  : price;
                stocks[stockIdx].avg_price = newAvg;
              }
            } else {
              // New stock: insert
              stocks.push({
                id: generateId(),
                portfolio_id: portfolio.id,
                stock_code: stockCode,
                stock_name: stockName,
                quantity: execQty,
                avg_price: price,
                current_price: price,
                currency: currency,
                target_pct: 0,
                is_rebalance_tracked: true,
                price_updated_at: null,
                created_at: nowISO(),
                updated_at: nowISO(),
              });
            }
            netCashChange -= execQty * price;
          }
        }

        writeTable("manual_stocks", stocks);

        // Update cash
        portfolio.cash = (portfolio.cash as number) + netCashChange;
        portfolio.updated_at = nowISO();
        writeTable("manual_portfolios", portfolios);
      }

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

    case "resume_rebalance_session": {
      // Resume a partial session back to in_progress
      const executionId = params.p_execution_id as string;
      const executions = readTable("executions");
      const exec = executions.find((e: any) => e.id === executionId);
      if (!exec) {
        return { data: null, error: { message: "Execution not found" } };
      }
      if (exec.status !== "partial") {
        return { data: null, error: { message: "Only partial sessions can be resumed" } };
      }
      // Check no other in_progress session for this portfolio
      const hasActive = executions.some(
        (e: any) => e.portfolio_id === exec.portfolio_id && e.status === "in_progress" && e.id !== executionId
      );
      if (hasActive) {
        return { data: null, error: { message: "Another session is already in progress" } };
      }
      exec.status = "in_progress";
      exec.completed_at = null;
      writeTable("executions", executions);
      return { data: null, error: null };
    }

    case "recalculate_session_orders": {
      // Recalculate session orders with updated prices
      const executionId = params.p_execution_id as string;
      const newOrders = params.p_new_orders as any[];
      const totalBuyAmount = params.p_total_buy_amount as number;
      const totalSellAmount = params.p_total_sell_amount as number;
      const netCashChange = params.p_net_cash_change as number;
      const recalculatedPrices = params.p_recalculated_prices as Record<string, number> ?? {};

      const executions = readTable("executions");
      const exec = executions.find((e: any) => e.id === executionId && e.status === "in_progress");
      if (!exec) {
        return { data: null, error: { message: "Execution not found or not in progress" } };
      }

      exec.orders = newOrders;
      exec.total_buy_amount = totalBuyAmount;
      exec.total_sell_amount = totalSellAmount;
      exec.net_cash_change = netCashChange;

      const snapshot = exec.portfolio_snapshot ?? {};
      const prevCount = snapshot.recalculation_count ?? 0;
      exec.portfolio_snapshot = {
        ...snapshot,
        recalculated_at: nowISO(),
        recalculation_count: prevCount + 1,
        recalculated_prices: recalculatedPrices,
      };

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
