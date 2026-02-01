import type { Database } from "./database";

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Bid = Database["public"]["Tables"]["bids"]["Row"];

export interface BidWithParticipant extends Bid {
  participant: Pick<Participant, "id" | "name">;
}

export interface ItemWithBids extends Item {
  bids: BidWithParticipant[];
  highest_bid: number | null;
  highest_bidder: string | null;
}

export interface ParticipantWithItems extends Participant {
  items_won: Item[];
}

export interface SessionState {
  session: Session;
  participants: Participant[];
  items: Item[];
  activeItem: ItemWithBids | null;
}

export interface AuctionEvent {
  type: "auction:start" | "auction:end" | "item:sold" | "item:reveal" | "session:end";
  itemId?: string;
  winnerId?: string;
  winnerName?: string;
  finalPrice?: number;
}
