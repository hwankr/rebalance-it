import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { join } from "path";

// Load .env.local for standalone script execution
config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface StockRow {
  stock_code: string;
  stock_name: string;
  market: string;
  country: string;
}

interface YahooChartMeta {
  instrumentType?: string;
  quoteType?: string;
  symbol?: string;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const PROGRESS_INTERVAL = 100;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getYahooQuoteType(
  ticker: string,
  retryCount = 0
): Promise<string | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Handle rate limiting with exponential backoff
    if (res.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        console.warn(`  ⚠ Rate limit exceeded for ${ticker} after ${MAX_RETRIES} retries`);
        return null;
      }

      const backoffMs = Math.min(
        INITIAL_BACKOFF_MS * Math.pow(2, retryCount),
        MAX_BACKOFF_MS
      );
      console.warn(
        `  ⚠ Rate limited (429) for ${ticker}, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await sleep(backoffMs);
      return getYahooQuoteType(ticker, retryCount + 1);
    }

    if (!res.ok) {
      console.warn(`  ⚠ Yahoo Finance error ${res.status} for ${ticker}`);
      return null;
    }

    const data: YahooChartResponse = await res.json();

    if (data.chart?.error) {
      console.warn(`  ⚠ Yahoo API error for ${ticker}: ${data.chart.error.description}`);
      return null;
    }

    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) {
      console.warn(`  ⚠ No meta data for ${ticker}`);
      return null;
    }

    // Prefer quoteType over instrumentType for ETF detection
    const quoteType = meta.quoteType ?? meta.instrumentType ?? null;
    return quoteType;
  } catch (error) {
    console.warn(`  ⚠ Exception fetching ${ticker}:`, (error as Error).message);
    return null;
  }
}

async function processBatch(
  tickers: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process up to BATCH_SIZE tickers concurrently
  const promises = tickers.map(async (ticker) => {
    const quoteType = await getYahooQuoteType(ticker);
    if (quoteType) {
      results.set(ticker, quoteType);
    }
  });

  await Promise.allSettled(promises);
  return results;
}

async function main() {
  console.log("=== Starting US stock asset_type backfill ===\n");

  // 1. Query all US stocks with asset_type = 'STOCK' (paginated)
  console.log("Querying US stocks with asset_type = 'STOCK'...");
  const PAGE_SIZE = 1000;
  const stocks: StockRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error: queryError } = await supabase
      .from("stocks")
      .select("stock_code, stock_name, market, country")
      .eq("country", "US")
      .eq("asset_type", "STOCK")
      .order("stock_code")
      .range(offset, offset + PAGE_SIZE - 1);

    if (queryError) {
      console.error("Error querying stocks:", queryError.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    stocks.push(...data);
    console.log(`  Fetched ${stocks.length} stocks so far...`);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (stocks.length === 0) {
    console.log("No US stocks with asset_type = 'STOCK' found. Nothing to backfill.");
    return;
  }

  console.log(`Found ${stocks.length} US stocks to process.\n`);

  // 2. Process in batches
  const etfTickers = new Set<string>();
  const errors: string[] = [];
  let processedCount = 0;

  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    const batch = stocks.slice(i, i + BATCH_SIZE);
    const tickers = batch.map((s) => s.stock_code);

    const results = await processBatch(tickers);

    // Collect ETF tickers
    results.forEach((quoteType, ticker) => {
      if (quoteType === "ETF") {
        etfTickers.add(ticker);
      }
    });

    processedCount += batch.length;

    // Progress logging
    if (processedCount % PROGRESS_INTERVAL === 0 || processedCount === stocks.length) {
      console.log(
        `  Progress: ${processedCount}/${stocks.length} stocks processed (${etfTickers.size} ETFs found so far)`
      );
    }

    // Rate limiting delay between batches (except for last batch)
    if (i + BATCH_SIZE < stocks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(
    `\n✓ Processing complete: ${processedCount} stocks, ${etfTickers.size} ETFs identified`
  );

  // 3. Batch update ETF tickers in Supabase
  if (etfTickers.size === 0) {
    console.log("No ETFs found. No database updates needed.");
    console.log("\n=== Backfill completed successfully ===");
    return;
  }

  console.log(`\nUpdating ${etfTickers.size} ETFs in database...`);

  const etfTickersArray = Array.from(etfTickers);
  const UPDATE_BATCH_SIZE = 500;

  for (let i = 0; i < etfTickersArray.length; i += UPDATE_BATCH_SIZE) {
    const updateBatch = etfTickersArray.slice(i, i + UPDATE_BATCH_SIZE);

    const { error: updateError } = await supabase
      .from("stocks")
      .update({ asset_type: "ETF" })
      .in("stock_code", updateBatch);

    if (updateError) {
      console.error(
        `Error updating batch at offset ${i}:`,
        updateError.message
      );
      errors.push(`Update batch ${i}: ${updateError.message}`);
    } else {
      const batchNum = Math.floor(i / UPDATE_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(etfTickersArray.length / UPDATE_BATCH_SIZE);
      console.log(
        `  Batch ${batchNum}/${totalBatches} updated (${updateBatch.length} rows)`
      );
    }
  }

  // 4. Final summary
  console.log("\n=== Backfill Summary ===");
  console.log(`Total stocks processed: ${processedCount}`);
  console.log(`ETFs identified: ${etfTickers.size}`);
  console.log(`Errors encountered: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log("\n✓ Backfill completed successfully");

  // Log sample ETFs for verification
  if (etfTickers.size > 0) {
    const sampleETFs = Array.from(etfTickers).slice(0, 10);
    console.log(`\nSample ETFs updated: ${sampleETFs.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("\n✗ Backfill failed:", err);
  process.exit(1);
});
