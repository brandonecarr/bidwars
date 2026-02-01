-- BidWars Database Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom enum types
CREATE TYPE session_status AS ENUM ('lobby', 'active', 'completed');
CREATE TYPE item_status AS ENUM ('pending', 'active', 'sold', 'unsold');
CREATE TYPE anon_mode AS ENUM ('visible', 'hidden', 'partial');

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  admin_name TEXT NOT NULL,
  admin_token UUID NOT NULL DEFAULT gen_random_uuid(),
  starting_money INTEGER NOT NULL DEFAULT 1000,
  status session_status NOT NULL DEFAULT 'lobby',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_code ON sessions(code);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  balance INTEGER NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_token ON participants(token);

-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  starting_bid INTEGER NOT NULL DEFAULT 1,
  anon_mode anon_mode NOT NULL DEFAULT 'visible',
  anon_hint TEXT,
  status item_status NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  sold_to UUID REFERENCES participants(id),
  sold_price INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_session ON items(session_id);
CREATE INDEX idx_items_status ON items(status);

-- Bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bids_item ON bids(item_id);
CREATE INDEX idx_bids_participant ON bids(participant_id);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for the party game (no auth required)
-- Security is handled via session codes and participant tokens in the API layer
CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bids" ON bids FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
