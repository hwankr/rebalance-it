import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
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

interface KrStock {
  stock_code: string;
  stock_name: string;
  market: string;
}

interface UsStock {
  stock_code: string;
  stock_name: string;
  stock_name_ko: string | null;
  market: string;
}

interface StockRow {
  stock_code: string;
  stock_name: string;
  stock_name_ko: string | null;
  market: string;
  country: string;
  currency: string;
  is_active: boolean;
}

async function main() {
  // Run from project root: npx tsx scripts/seed-stocks.ts
  const projectRoot = process.cwd();
  const dataDir = join(projectRoot, "scripts", "data");

  const krStocks: KrStock[] = JSON.parse(
    readFileSync(join(dataDir, "kr-stocks.json"), "utf-8")
  );
  const usStocks: UsStock[] = JSON.parse(
    readFileSync(join(dataDir, "us-stocks.json"), "utf-8")
  );

  // Deduplicate by stock_code (keep first occurrence)
  const seen = new Set<string>();
  const dedup = <T extends { stock_code: string }>(arr: T[]): T[] =>
    arr.filter((s) => {
      if (seen.has(s.stock_code)) return false;
      seen.add(s.stock_code);
      return true;
    });

  const uniqueKr = dedup(krStocks);
  const uniqueUs = dedup(usStocks);

  // Build rows for Supabase upsert
  const krRows: StockRow[] = uniqueKr.map((s) => ({
    stock_code: s.stock_code,
    stock_name: s.stock_name,
    stock_name_ko: s.stock_name, // Korean stocks: stock_name_ko = stock_name
    market: s.market,
    country: "KR",
    currency: "KRW",
    is_active: true,
  }));

  const usRows: StockRow[] = uniqueUs.map((s) => ({
    stock_code: s.stock_code,
    stock_name: s.stock_name,
    stock_name_ko: s.stock_name_ko ?? null,
    market: s.market,
    country: "US",
    currency: "USD",
    is_active: true,
  }));

  const allRows = [...krRows, ...usRows];

  console.log(
    `Seeding ${krRows.length} KR stocks + ${usRows.length} US stocks = ${allRows.length} total`
  );

  // Upsert in batches of 200
  const BATCH_SIZE = 200;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("stocks").upsert(batch, {
      onConflict: "stock_code",
    });
    if (error) {
      console.error(`Error upserting batch at offset ${i}:`, error.message);
      process.exit(1);
    }
    console.log(
      `  Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)`
    );
  }

  console.log("Supabase seed complete.");

  // Generate public/data/stocks.json for client-side fallback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const publicData = allRows.map(({ is_active, ...rest }) => rest);
  const publicDir = join(projectRoot, "public", "data");
  mkdirSync(publicDir, { recursive: true });
  const outputPath = join(publicDir, "stocks.json");
  writeFileSync(outputPath, JSON.stringify(publicData, null, 2), "utf-8");
  console.log(`Wrote ${publicData.length} stocks to ${outputPath}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
