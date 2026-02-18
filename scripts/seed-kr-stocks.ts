import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
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
  stock_name_ko: string | null;
  market: string;
  country: string;
  currency: string;
  is_active: boolean;
  asset_type: 'STOCK' | 'ETF';
}

// Market name mapping from KIND format to our DB format
const MARKET_MAP: Record<string, string> = {
  유가: "KOSPI",
  코스닥: "KOSDAQ",
  코넥스: "KONEX",
};

async function fetchNaverEtfs(): Promise<StockRow[]> {
  console.log("Fetching Korean ETFs from Naver Finance...");
  const url = "https://finance.naver.com/api/sise/etfItemList.nhn?etfType=0&targetColumn=market_sum&sortOrder=desc";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://finance.naver.com/sise/etf.naver",
      },
    });
    if (!res.ok) throw new Error(`Naver API returned ${res.status}`);
    // Naver .nhn endpoints return EUC-KR encoded JSON
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("euc-kr").decode(buf);
    const data = JSON.parse(text);
    const etfList: Array<{ itemcode: string; itemname: string }> = data?.result?.etfItemList || [];
    console.log(`  Found ${etfList.length} Korean ETFs from Naver`);
    return etfList.map((e) => ({
      stock_code: e.itemcode,
      stock_name: e.itemname,
      stock_name_ko: e.itemname,
      market: "KOSPI",
      country: "KR",
      currency: "KRW",
      is_active: true,
      asset_type: "ETF" as const,
    }));
  } catch (error) {
    console.warn(`  ⚠ Naver ETF fetch failed: ${(error as Error).message}`);
    return [];
  }
}

async function fetchKindStocks(): Promise<StockRow[]> {
  console.log("Fetching Korean stocks from KIND (kind.krx.co.kr)...");

  const url =
    "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`KIND API returned ${res.status}: ${res.statusText}`);
  }

  const buf = await res.arrayBuffer();
  const text = new TextDecoder("euc-kr").decode(buf);

  // Parse HTML table rows
  const trBlocks = text.split(/<tr>/gi).slice(2); // skip HTML header + table header
  const stocks: StockRow[] = [];

  for (const block of trBlocks) {
    const tds: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m: RegExpExecArray | null;
    while ((m = tdRegex.exec(block)) !== null) {
      tds.push(
        m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      );
    }

    // Columns: [회사명, 시장구분, 종목코드, 업종, 주요제품, 상장일, ...]
    if (tds.length < 3) continue;

    const name = tds[0];
    const marketRaw = tds[1];
    const code = tds[2];

    // Only include 6-digit numeric stock codes (skip warrants, bonds, SPACs with letter codes)
    if (!/^\d{6}$/.test(code)) continue;

    // Skip KONEX (minor market, not useful for most users)
    const market = MARKET_MAP[marketRaw];
    if (!market || market === "KONEX") continue;

    stocks.push({
      stock_code: code,
      stock_name: name,
      stock_name_ko: name, // Korean stocks: name is already Korean
      market,
      country: "KR",
      currency: "KRW",
      is_active: true,
      asset_type: 'STOCK' as const,
    });
  }

  return stocks;
}

async function main() {
  console.log("=== Seed Korean stocks from KIND API ===\n");

  // Step 1: Check current KR stock count
  const { count: preKrCount } = await supabase
    .from("stocks")
    .select("*", { count: "exact", head: true })
    .eq("country", "KR");

  console.log(`Current KR stocks in DB: ${preKrCount ?? 0}\n`);

  // Step 2: Fetch from KIND API and Naver ETFs
  const [allKrStocks, naverEtfs] = await Promise.all([
    fetchKindStocks(),
    fetchNaverEtfs(),
  ]);

  // Combine stocks + ETFs, ETFs appended last so they win during dedup
  const combined = [...allKrStocks, ...naverEtfs];
  const stockMap = new Map<string, StockRow>();
  for (const s of combined) {
    stockMap.set(s.stock_code, s);
  }
  const uniqueKrStocks = Array.from(stockMap.values());

  const kospiCount = uniqueKrStocks.filter((s) => s.market === "KOSPI").length;
  const kosdaqCount = uniqueKrStocks.filter(
    (s) => s.market === "KOSDAQ"
  ).length;
  const etfCount = uniqueKrStocks.filter((s) => s.asset_type === "ETF").length;

  console.log(
    `Fetched ${uniqueKrStocks.length} unique KR stocks (KOSPI: ${kospiCount}, KOSDAQ: ${kosdaqCount}, ETF: ${etfCount})`
  );

  if (uniqueKrStocks.length < 1000) {
    console.error(
      `✗ Expected at least 1,000 KR stocks, got ${uniqueKrStocks.length}. Aborting.`
    );
    process.exit(1);
  }

  // Step 3: Upsert KR stocks to Supabase
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil(uniqueKrStocks.length / BATCH_SIZE);
  console.log(
    `\nUpserting ${uniqueKrStocks.length} KR stocks in ${totalBatches} batches...`
  );

  for (let i = 0; i < uniqueKrStocks.length; i += BATCH_SIZE) {
    const batch = uniqueKrStocks.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("stocks").upsert(batch, {
      onConflict: "stock_code",
    });

    if (error) {
      console.error(`Error upserting batch at offset ${i}:`, error.message);
      process.exit(1);
    }

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} rows)`);
  }

  // Step 4: Verify
  const { count: postKrCount } = await supabase
    .from("stocks")
    .select("*", { count: "exact", head: true })
    .eq("country", "KR");

  const { count: totalCount } = await supabase
    .from("stocks")
    .select("*", { count: "exact", head: true });

  console.log(`\n=== Results ===`);
  console.log(`KR stocks before: ${preKrCount ?? 0}`);
  console.log(`KR stocks after:  ${postKrCount ?? 0}`);
  console.log(`KR delta:         +${(postKrCount ?? 0) - (preKrCount ?? 0)}`);
  console.log(`Total stocks:     ${totalCount ?? 0}`);

  // Step 5: Update public/data/stocks.json cache
  console.log(`\nUpdating local cache...`);

  // Supabase returns max 1000 rows by default, paginate to get all
  const allStocks: Array<{
    stock_code: string;
    stock_name: string;
    stock_name_ko: string | null;
    market: string;
    country: string;
    currency: string;
  }> = [];

  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error: fetchError } = await supabase
      .from("stocks")
      .select(
        "stock_code, stock_name, stock_name_ko, market, country, currency, asset_type"
      )
      .eq("is_active", true)
      .order("stock_code")
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      console.error("Error fetching stocks for cache:", fetchError.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allStocks.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const publicDir = join(process.cwd(), "public", "data");
  mkdirSync(publicDir, { recursive: true });
  const outputPath = join(publicDir, "stocks.json");
  writeFileSync(outputPath, JSON.stringify(allStocks, null, 2), "utf-8");

  const cacheKr = allStocks.filter((s) => s.country === "KR").length;
  const cacheUs = allStocks.filter((s) => s.country === "US").length;
  console.log(
    `✓ Cache updated: ${allStocks.length} stocks (KR: ${cacheKr}, US: ${cacheUs})`
  );

  // Spot-check
  const spotChecks = ["005930", "000660", "035420"];
  console.log(`\nSpot-check: ${spotChecks.join(", ")}...`);

  for (const code of spotChecks) {
    const found = allStocks.find((s) => s.stock_code === code);
    if (found) {
      console.log(
        `  ✓ ${found.stock_code}: ${found.stock_name} [${found.market}]`
      );
    } else {
      console.error(`  ✗ ${code}: NOT FOUND`);
    }
  }

  if ((postKrCount ?? 0) >= 1000) {
    console.log(
      `\n✓ KR stock seed completed. ${postKrCount} Korean stocks in DB.`
    );
  } else {
    console.error(
      `\n✗ Seed may have failed. Expected >= 1,000 KR stocks, got ${postKrCount ?? 0}.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err);
  process.exit(1);
});
