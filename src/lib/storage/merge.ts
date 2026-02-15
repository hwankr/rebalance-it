
import { SupabaseClient } from "@supabase/supabase-js";

const GUEST_PREFIX = "guest:";

interface ManualPortfolio {
  id: string;
  user_id: string;
  cash: number;
}

interface ManualStock {
  id: string;
  portfolio_id: string;
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  currency: string;
  target_pct: number;
  created_at: string;
  updated_at: string;
  price_updated_at?: string | null;
}

/**
 * Merges guest mode data (localStorage) into the authenticated user's account (Supabase).
 * Preserves guest localStorage until explicitly cleared by the caller (or clears it here if success).
 */
export async function mergeGuestData(
  supabase: SupabaseClient
) {
  if (typeof window === "undefined") return;

  // 1. Read Guest Data
  const guestPortfolioStr = localStorage.getItem(`${GUEST_PREFIX}manual_portfolios`);
  const guestStocksStr = localStorage.getItem(`${GUEST_PREFIX}manual_stocks`);

  console.error("Merge Debug: Guest LS Data", guestPortfolioStr, guestStocksStr);

  if (!guestPortfolioStr) {
    console.error("Merge Debug: No guest portfolio string found.");
    return;
  }

  const guestPortfolios: ManualPortfolio[] = JSON.parse(guestPortfolioStr);
  const guestStocks: ManualStock[] = guestStocksStr ? JSON.parse(guestStocksStr) : [];
  
  console.error("Merge Debug: Parsed Counts", guestPortfolios.length, guestStocks.length);
  
  // Assuming guest has only one portfolio for now (user_id='guest')
  const guestPortfolio = guestPortfolios.find(p => p.user_id === "guest");
  if (!guestPortfolio) {
    console.error("Merge Debug: No guest user portfolio found.");
    return;
  }

  // 2. Get Current User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("Merge Debug: No authenticated user found.");
    return; // Should be logged in
  }

  console.error("Merge Debug: Merging guest data for user:", user.email);

  // 3. Get or Create User Portfolio
  let { data: userPortfolio, error: pError } = await supabase
    .from("manual_portfolios")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (pError) {
    console.error("Merge Debug: Error fetching user portfolio:", pError);
    return;
  }

  if (!userPortfolio) {
    console.error("Merge Debug: Creating new portfolio for user.");
    // Create new portfolio for user
    const { data: newPortfolio, error: createError } = await supabase
      .from("manual_portfolios")
      .insert({
        user_id: user.id,
        cash: guestPortfolio.cash // Copy guest cash
      })
      .select()
      .single();
    
    if (createError) {
      console.error("Merge Debug: Error creating user portfolio:", createError);
      return;
    }
    userPortfolio = newPortfolio;
  } else {
    console.error("Merge Debug: Found existing portfolio:", userPortfolio.id);
    // Update cash? Maybe add guest cash to user cash?
    // Let's add it.
    const newCash = (userPortfolio.cash || 0) + (guestPortfolio.cash || 0);
    await supabase
      .from("manual_portfolios")
      .update({ cash: newCash })
      .eq("id", userPortfolio.id);
  }

  // 4. Merge Stocks
  // Fetch existing user stocks
  const { data: userStocks, error: sError } = await supabase
    .from("manual_stocks")
    .select("*")
    .eq("portfolio_id", userPortfolio.id);

  if (sError) {
    console.error("Merge Debug: Error fetching user stocks:", sError);
    return;
  }
  
  console.error("Merge Debug: User stocks count:", userStocks?.length);

  const guestStocksForPortfolio = guestStocks.filter(s => s.portfolio_id === guestPortfolio.id);
  console.error("Merge Debug: Guest stocks to merge:", guestStocksForPortfolio.length);

  for (const gStock of guestStocksForPortfolio) {
    const existingStock = userStocks?.find(s => s.stock_code === gStock.stock_code);

    if (existingStock) {
      console.error("Merge Debug: Updating existing stock:", gStock.stock_name);
      // Merge logic: Weighted Average Price
      const oldQty = existingStock.quantity;
      const newQty = oldQty + gStock.quantity;
      
      let newAvgPrice = existingStock.avg_price;
      if (newQty > 0) {
        newAvgPrice = ((oldQty * existingStock.avg_price) + (gStock.quantity * gStock.avg_price)) / newQty;
      }

      await supabase
        .from("manual_stocks")
        .update({
          quantity: newQty,
          avg_price: newAvgPrice,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingStock.id);
        
    } else {
      // Insert new stock
      // Explicitly select fields to avoid "column does not exist" errors
      const stockToInsert = {
        portfolio_id: userPortfolio.id,
        stock_code: gStock.stock_code,
        stock_name: gStock.stock_name,
        quantity: gStock.quantity,
        avg_price: gStock.avg_price,
        current_price: gStock.current_price,
        currency: gStock.currency || 'KRW',
        target_pct: 0,
        price_updated_at: gStock.price_updated_at || null
      };
      
      const { error: insertError } = await supabase
        .from("manual_stocks")
        .insert(stockToInsert);

      if (insertError) {
        console.error("Error inserting guest stock:", gStock.stock_name, insertError);
        // We continue trying others, but should probably flag this?
        // Let's re-throw to prevent clearing storage if we want to be safe.
        throw new Error(`Failed to merge stock ${gStock.stock_name}: ${insertError.message}`);
      }
    }
  }

  console.log("Guest data merged successfully.");
}
