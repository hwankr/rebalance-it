# Stock Seeding Scripts

## seed-stocks-full.ts

Comprehensive script that fetches ALL stocks from live APIs and seeds the database.

### Data Sources

1. **Korean Stocks (KRX)**
   - KOSPI: ~900+ stocks
   - KOSDAQ: ~1,500+ stocks
   - Source: KRX Data Portal API (`http://data.krx.co.kr`)
   - Updates daily with current trading date

2. **US Stocks (SEC)**
   - NYSE + NASDAQ: ~10,000+ companies
   - Source: SEC EDGAR Company Tickers (`https://www.sec.gov/files/company_tickers.json`)
   - Filters: tickers ≤5 chars, no spaces
   - Includes Korean name mappings for top ~240 popular stocks

### Usage

```bash
# Run from project root
npx tsx scripts/seed-stocks-full.ts
```

### Requirements

- `.env.local` file with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Active internet connection (fetches from external APIs)

### Output

1. Upserts all stocks to Supabase `stocks` table (batches of 500)
2. Generates `public/data/stocks.json` for client-side cache

### Progress Logs

The script shows:
- Stock counts per market (KOSPI, KOSDAQ, US)
- Batch upload progress
- Total stocks processed
- Any duplicates or errors

---

## seed-stocks.ts (Legacy)

Original script that seeds from static JSON files in `scripts/data/`:
- `kr-stocks.json`
- `us-stocks.json`

Use this for offline seeding or when you want to control the exact stock list.
