-- Add session name
ALTER TABLE sessions ADD COLUMN session_name TEXT NOT NULL DEFAULT 'BidWars';

-- Rounds table: each round is a "bag" that gets auctioned blind
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  status item_status NOT NULL DEFAULT 'active',
  item_id UUID REFERENCES items(id),  -- linked AFTER reveal, nullable until then
  sold_to UUID REFERENCES participants(id),
  sold_price INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rounds_session ON rounds(session_id);

-- Bids now reference rounds instead of items
ALTER TABLE bids ADD COLUMN round_id UUID REFERENCES rounds(id) ON DELETE CASCADE;

-- RLS for rounds
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to rounds" ON rounds FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for rounds
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
