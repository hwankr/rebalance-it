export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          strategy: string;
          threshold_pct: number;
          calendar_interval: string | null;
          targets: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          strategy: string;
          threshold_pct?: number;
          calendar_interval?: string | null;
          targets?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          strategy?: string;
          threshold_pct?: number;
          calendar_interval?: string | null;
          targets?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      executions: {
        Row: {
          id: string;
          user_id: string | null;
          profile_id: string | null;
          profile_name: string;
          preset_name: string | null;
          executed_at: string;
          status: string;
          total_orders: number;
          success_count: number;
          fail_count: number;
          total_buy_amount: number;
          total_sell_amount: number;
          net_cash_change: number;
          orders: Json;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          profile_id?: string | null;
          profile_name: string;
          preset_name?: string | null;
          executed_at?: string;
          status: string;
          total_orders?: number;
          success_count?: number;
          fail_count?: number;
          total_buy_amount?: number;
          total_sell_amount?: number;
          net_cash_change?: number;
          orders?: Json;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          profile_id?: string | null;
          profile_name?: string;
          preset_name?: string | null;
          executed_at?: string;
          status?: string;
          total_orders?: number;
          success_count?: number;
          fail_count?: number;
          total_buy_amount?: number;
          total_sell_amount?: number;
          net_cash_change?: number;
          orders?: Json;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          user_id: string | null;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          key: string;
          value?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_portfolios: {
        Row: {
          id: string;
          user_id: string;
          cash: number;
          active_preset_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cash?: number;
          active_preset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cash?: number;
          active_preset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_stocks: {
        Row: {
          id: string;
          portfolio_id: string;
          stock_code: string;
          stock_name: string;
          quantity: number;
          avg_price: number;
          current_price: number;
          currency: string;
          price_updated_at: string | null;
          target_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          stock_code: string;
          stock_name: string;
          quantity: number;
          avg_price: number;
          current_price: number;
          currency?: string;
          price_updated_at?: string | null;
          target_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          stock_code?: string;
          stock_name?: string;
          quantity?: number;
          avg_price?: number;
          current_price?: number;
          currency?: string;
          price_updated_at?: string | null;
          target_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rebalance_settings: {
        Row: {
          id: string;
          user_id: string;
          data_source: string;
          strategy: string;
          threshold_pct: number;
          calendar_interval: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data_source: string;
          strategy?: string;
          threshold_pct?: number;
          calendar_interval?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data_source?: string;
          strategy?: string;
          threshold_pct?: number;
          calendar_interval?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_targets: {
        Row: {
          id: string;
          user_id: string;
          stock_code: string;
          stock_name: string;
          target_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stock_code: string;
          stock_name: string;
          target_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_code?: string;
          stock_name?: string;
          target_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          targets: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          targets?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          targets?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          portone_billing_key: string | null;
          portone_customer_id: string | null;
          payment_method: string | null;
          plan_tier: string;
          billing_cycle: string | null;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          portone_billing_key?: string | null;
          portone_customer_id?: string | null;
          payment_method?: string | null;
          plan_tier?: string;
          billing_cycle?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          portone_billing_key?: string | null;
          portone_customer_id?: string | null;
          payment_method?: string | null;
          plan_tier?: string;
          billing_cycle?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          user_id: string | null;
          portone_event_id: string;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          portone_event_id: string;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          portone_event_id?: string;
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      stocks: {
        Row: {
          stock_code: string;
          stock_name: string;
          stock_name_ko: string | null;
          market: string;
          country: string;
          currency: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          stock_code: string;
          stock_name: string;
          stock_name_ko?: string | null;
          market: string;
          country: string;
          currency: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          stock_code?: string;
          stock_name?: string;
          stock_name_ko?: string | null;
          market?: string;
          country?: string;
          currency?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_preset_to_targets: {
        Args: {
          p_user_id: string;
          p_targets: Json;
        };
        Returns: undefined;
      };
      apply_preset_to_manual: {
        Args: {
          p_portfolio_id: string;
          p_targets: Json;
          p_preset_id?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
