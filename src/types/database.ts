export type SessionStatus = "lobby" | "active" | "completed";
export type ItemStatus = "pending" | "active" | "sold" | "unsold";
export type AnonMode = "visible" | "hidden" | "partial";

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          code: string;
          admin_name: string;
          admin_token: string;
          starting_money: number;
          status: SessionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          admin_name: string;
          admin_token?: string;
          starting_money?: number;
          status?: SessionStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          admin_name?: string;
          admin_token?: string;
          starting_money?: number;
          status?: SessionStatus;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          token: string;
          balance: number;
          is_admin: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          name: string;
          token?: string;
          balance?: number;
          is_admin?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          name?: string;
          token?: string;
          balance?: number;
          is_admin?: boolean;
          joined_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          starting_bid: number;
          anon_mode: AnonMode;
          anon_hint: string | null;
          status: ItemStatus;
          sort_order: number;
          sold_to: string | null;
          sold_price: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          starting_bid?: number;
          anon_mode?: AnonMode;
          anon_hint?: string | null;
          status?: ItemStatus;
          sort_order?: number;
          sold_to?: string | null;
          sold_price?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          starting_bid?: number;
          anon_mode?: AnonMode;
          anon_hint?: string | null;
          status?: ItemStatus;
          sort_order?: number;
          sold_to?: string | null;
          sold_price?: number | null;
        };
      };
      bids: {
        Row: {
          id: string;
          item_id: string;
          participant_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          participant_id: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          participant_id?: string;
          amount?: number;
          created_at?: string;
        };
      };
    };
    Enums: {
      session_status: SessionStatus;
      item_status: ItemStatus;
      anon_mode: AnonMode;
    };
  };
}
