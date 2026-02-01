import type { Database } from "./database";

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Bid = Database["public"]["Tables"]["bids"]["Row"];
export type Round = Database["public"]["Tables"]["rounds"]["Row"];

export interface BidWithParticipant extends Bid {
  participantName: string;
}

export interface RoundWithBids extends Round {
  bids: BidWithParticipant[];
  highest_bid: number | null;
  highest_bidder: string | null;
  item?: Item | null;
}

export interface SessionState {
  session: Session;
  participants: Participant[];
  items: Item[];
  rounds: Round[];
  activeRound: Round | null;
}

export interface AuctionEvent {
  type: "round:start" | "round:sold" | "round:skip" | "round:assign" | "session:end";
  roundId?: string;
  roundNumber?: number;
  winnerId?: string;
  winnerName?: string;
  finalPrice?: number;
  itemName?: string;
}
