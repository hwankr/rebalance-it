import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
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
}

interface KrxStockData {
  ISU_SRT_CD: string; // Stock code (e.g., "005930")
  ISU_ABBRV: string; // Stock name (e.g., "삼성전자")
  MKT_NM: string; // Market name (e.g., "KOSPI")
}

interface SecCompanyData {
  cik_str: number;
  ticker: string;
  title: string;
}

// Get today's date in YYYYMMDD format for KRX API
function getTodayKrxFormat(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function fetchKrxStocks(marketId: "STK" | "KSQ"): Promise<StockRow[]> {
  const marketName = marketId === "STK" ? "KOSPI" : "KOSDAQ";
  const trdDd = getTodayKrxFormat();

  console.log(`Fetching ${marketName} stocks from KRX (date: ${trdDd})...`);

  const url = "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd";
  const params = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT01501",
    mktId: marketId,
    trdDd: trdDd,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "http://data.krx.co.kr/contents/MDC/MDI/mdiStat/tables/MDCSTAT01501.cmd",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "http://data.krx.co.kr",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `KRX API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    const stocks: KrxStockData[] = data.OutBlock_1 || [];

    console.log(`  Found ${stocks.length} ${marketName} stocks`);

    return stocks.map((s) => ({
      stock_code: s.ISU_SRT_CD,
      stock_name: s.ISU_ABBRV,
      stock_name_ko: s.ISU_ABBRV, // Korean stocks: stock_name_ko = stock_name
      market: marketName,
      country: "KR",
      currency: "KRW",
      is_active: true,
    }));
  } catch (error) {
    console.error(`Error fetching ${marketName} stocks:`, error);
    throw error;
  }
}

async function fetchUsStocks(): Promise<StockRow[]> {
  console.log("Fetching US stocks from SEC EDGAR...");

  const url = "https://www.sec.gov/files/company_tickers.json";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RebalanceIt/1.0 contact@rebalance-it.com",
      },
    });

    if (!response.ok) {
      throw new Error(
        `SEC API returned ${response.status}: ${response.statusText}`
      );
    }

    const data: Record<string, SecCompanyData> = await response.json();
    const companies = Object.values(data);

    console.log(`  Found ${companies.length} companies from SEC`);

    // Filter to only include valid stock tickers
    // Skip tickers with spaces or those longer than 5 characters
    const validStocks = companies.filter((c) => {
      const ticker = c.ticker;
      return ticker.length <= 5 && !ticker.includes(" ");
    });

    console.log(`  Filtered to ${validStocks.length} valid tickers`);

    // Load Korean name mappings for popular US stocks
    const projectRoot = process.cwd();
    const dataDir = join(projectRoot, "scripts", "data");
    const usStocksData: Array<{
      stock_code: string;
      stock_name_ko: string | null;
    }> = JSON.parse(readFileSync(join(dataDir, "us-stocks.json"), "utf-8"));

    const koNameMap = new Map<string, string>();
    for (const s of usStocksData) {
      if (s.stock_name_ko) {
        koNameMap.set(s.stock_code, s.stock_name_ko);
      }
    }

    return validStocks.map((c) => ({
      stock_code: c.ticker,
      stock_name: c.title,
      stock_name_ko: koNameMap.get(c.ticker) ?? null,
      market: "US", // SEC data doesn't distinguish NYSE/NASDAQ
      country: "US",
      currency: "USD",
      is_active: true,
    }));
  } catch (error) {
    console.error("Error fetching US stocks:", error);
    throw error;
  }
}

async function main() {
  console.log("=== Starting comprehensive stock seed ===\n");

  // Fetch all stocks in parallel (KRX failures are non-fatal)
  const [kospiResult, kosdaqResult, usStocks] = await Promise.all([
    fetchKrxStocks("STK").catch((e) => {
      console.warn(`  ⚠ KOSPI fetch failed: ${e.message} — using fallback data`);
      return [] as StockRow[];
    }),
    fetchKrxStocks("KSQ").catch((e) => {
      console.warn(`  ⚠ KOSDAQ fetch failed: ${e.message} — using fallback data`);
      return [] as StockRow[];
    }),
    fetchUsStocks(),
  ]);

  // If KRX failed, use existing kr-stocks.json as fallback
  let kospiStocks = kospiResult;
  let kosdaqStocks = kosdaqResult;

  if (kospiStocks.length === 0 && kosdaqStocks.length === 0) {
    console.log("  Loading Korean stocks from KIND API fallback (kind.krx.co.kr)...");
    try {
      const kindUrl =
        "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13";
      const kindRes = await fetch(kindUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      if (!kindRes.ok) throw new Error(`KIND API returned ${kindRes.status}`);

      const buf = await kindRes.arrayBuffer();
      const html = new TextDecoder("euc-kr").decode(buf);

      const marketMap: Record<string, string> = { "유가": "KOSPI", "코스닥": "KOSDAQ" };
      const trBlocks = html.split(/<tr>/gi).slice(2);
      const kindStocks: StockRow[] = [];

      for (const block of trBlocks) {
        const tds: string[] = [];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let m: RegExpExecArray | null;
        while ((m = tdRegex.exec(block)) !== null) {
          tds.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
        }
        if (tds.length < 3) continue;
        const code = tds[2];
        const market = marketMap[tds[1]];
        if (!/^\d{6}$/.test(code) || !market) continue;

        kindStocks.push({
          stock_code: code,
          stock_name: tds[0],
          stock_name_ko: tds[0],
          market,
          country: "KR",
          currency: "KRW",
          is_active: true,
        });
      }

      kospiStocks = kindStocks.filter((s) => s.market === "KOSPI");
      kosdaqStocks = kindStocks.filter((s) => s.market === "KOSDAQ");
      console.log(`  Loaded ${kindStocks.length} Korean stocks from KIND API (KOSPI: ${kospiStocks.length}, KOSDAQ: ${kosdaqStocks.length})`);
    } catch (kindErr) {
      console.warn(`  ⚠ KIND API fallback failed: ${(kindErr as Error).message}`);
      // Last resort: use static file
      try {
        const krData: Array<{ stock_code: string; stock_name: string; market: string }> =
          JSON.parse(readFileSync(join(process.cwd(), "scripts", "data", "kr-stocks.json"), "utf-8"));
        const krRows = krData.map((s) => ({
          stock_code: s.stock_code,
          stock_name: s.stock_name,
          stock_name_ko: s.stock_name,
          market: s.market,
          country: "KR",
          currency: "KRW",
          is_active: true,
        }));
        kospiStocks = krRows.filter((s) => s.market === "KOSPI");
        kosdaqStocks = krRows.filter((s) => s.market === "KOSDAQ");
        console.log(`  Loaded ${krRows.length} Korean stocks from static fallback`);
      } catch {
        console.warn("  ⚠ No fallback available for Korean stocks");
      }
    }
  }

  // Combine and deduplicate
  const allStocks = [...kospiStocks, ...kosdaqStocks, ...usStocks];

  const seen = new Set<string>();
  const uniqueStocks = allStocks.filter((s) => {
    if (seen.has(s.stock_code)) {
      console.warn(`  Duplicate stock_code: ${s.stock_code} (skipped)`);
      return false;
    }
    seen.add(s.stock_code);
    return true;
  });

  console.log(
    `\nTotal stocks: ${uniqueStocks.length} (KR: ${kospiStocks.length + kosdaqStocks.length}, US: ${usStocks.length})`
  );

  // Upsert to Supabase in batches
  const BATCH_SIZE = 500;
  console.log(`\nUpserting to Supabase in batches of ${BATCH_SIZE}...`);

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
    const totalBatches = Math.ceil(uniqueStocks.length / BATCH_SIZE);
    console.log(
      `  Batch ${batchNum}/${totalBatches} upserted (${batch.length} rows)`
    );
  }

  console.log("\n✓ Supabase seed complete.");

  // Generate public/data/stocks.json for client-side cache
  const publicData = uniqueStocks.map(({ is_active, ...rest }) => rest);
  const publicDir = join(process.cwd(), "public", "data");
  mkdirSync(publicDir, { recursive: true });
  const outputPath = join(publicDir, "stocks.json");
  writeFileSync(outputPath, JSON.stringify(publicData, null, 2), "utf-8");

  console.log(`✓ Wrote ${publicData.length} stocks to ${outputPath}`);
  console.log("\n=== Stock seed completed successfully ===");
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err);
  process.exit(1);
});
