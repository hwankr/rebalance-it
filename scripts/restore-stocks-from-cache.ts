import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
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

interface CacheStock {
  stock_code: string;
  stock_name: string;
  stock_name_ko: string | null;
  market: string;
  country: string;
  currency: string;
}

interface StockRow extends CacheStock {
  is_active: boolean;
}

async function main() {
  console.log("=== Restore stocks from local cache ===\n");

  // Step 1: Check current DB state
  const { count: preCount, error: countError } = await supabase
    .from("stocks")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error querying current stock count:", countError.message);
    process.exit(1);
  }

  console.log(`Current DB stock count: ${preCount ?? 0}`);

  // Step 2: Read local cache
  const cachePath = join(process.cwd(), "public", "data", "stocks.json");
  let cacheStocks: CacheStock[];

  try {
    cacheStocks = JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch (error) {
    console.error(`Failed to read cache file at ${cachePath}:`, error);
    process.exit(1);
  }

  console.log(`Cache file contains: ${cacheStocks.length} stocks`);

  // Step 3: Deduplicate by stock_code
  const seen = new Set<string>();
  const uniqueStocks: StockRow[] = [];

  for (const stock of cacheStocks) {
    if (seen.has(stock.stock_code)) {
      console.warn(`  Duplicate stock_code: ${stock.stock_code} (skipped)`);
      continue;
    }
    seen.add(stock.stock_code);
    uniqueStocks.push({
      ...stock,
      is_active: true,
    });
  }

  const krCount = uniqueStocks.filter((s) => s.country === "KR").length;
  const usCount = uniqueStocks.filter((s) => s.country === "US").length;
  console.log(
    `Unique stocks to upsert: ${uniqueStocks.length} (KR: ${krCount}, US: ${usCount})`
  );

  // Step 4: Upsert in batches
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil(uniqueStocks.length / BATCH_SIZE);
  console.log(`\nUpserting in ${totalBatches} batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < uniqueStocks.length; i += BATCH_SIZE) {
    const batch = uniqueStocks.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("stocks").upsert(batch, {
      onConflict: "stock_code",
    });

    if (error) {
      console.error(`Error upserting batch at offset ${i}:`, error.message);
      process.exit(1);
    }

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(
      `  Batch ${batchNum}/${totalBatches} upserted (${batch.length} rows)`
    );
  }

  // Step 5: Verify post-restore count
  const { count: postCount, error: postError } = await supabase
    .from("stocks")
    .select("*", { count: "exact", head: true });

  if (postError) {
    console.error("Error querying post-restore count:", postError.message);
    process.exit(1);
  }

  console.log(`\n=== Results ===`);
  console.log(`Before: ${preCount ?? 0} rows`);
  console.log(`After:  ${postCount ?? 0} rows`);
  console.log(`Delta:  +${(postCount ?? 0) - (preCount ?? 0)} rows`);

  // Step 6: Spot-check known stocks
  const spotChecks = ["005930", "AAPL", "NVDA"];
  console.log(`\nSpot-checking: ${spotChecks.join(", ")}...`);

  for (const code of spotChecks) {
    const { data, error } = await supabase
      .from("stocks")
      .select("stock_code, stock_name, stock_name_ko, country")
      .eq("stock_code", code)
      .single();

    if (error || !data) {
      console.error(`  ✗ ${code}: NOT FOUND`);
    } else {
      console.log(
        `  ✓ ${data.stock_code}: ${data.stock_name} (${data.stock_name_ko ?? "N/A"}) [${data.country}]`
      );
    }
  }

  // Final verdict
  if ((postCount ?? 0) >= 12000) {
    console.log(`\n✓ Restore completed successfully. ${postCount} stocks in DB.`);
  } else {
    console.error(
      `\n✗ Restore may have failed. Expected >= 12,000, got ${postCount ?? 0}.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n✗ Restore failed:", err);
  process.exit(1);
});
