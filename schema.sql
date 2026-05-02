-- ============================================================
--  WANDR — Travel Itinerary Platform
--  PostgreSQL Schema (compatible with Supabase / Cloud SQL)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- USERS
-- Mirrors Firebase Auth. uid is the Firebase UID (string).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,   -- From Firebase Auth
  email        VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(120),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TRIPS
-- One user → many trips. slug is for public sharing.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE trips (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  cover_image  TEXT,                            -- URL to hero image
  destination  VARCHAR(200),                   -- Primary destination label

  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,

  is_public    BOOLEAN DEFAULT FALSE,
  slug         VARCHAR(100) UNIQUE,            -- e.g. "tokyo-2025-xyz123"

  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_trips_user_id  ON trips(user_id);
CREATE INDEX idx_trips_slug     ON trips(slug) WHERE is_public = TRUE;

-- ─────────────────────────────────────────────────────────────
-- DAYS
-- Auto-generated when a trip is created (one row per date).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE days (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  day_date     DATE NOT NULL,
  day_number   SMALLINT NOT NULL,              -- 1-based index
  title        VARCHAR(200),                   -- Optional day label
  notes        TEXT,                           -- General day notes

  UNIQUE(trip_id, day_date)
);

CREATE INDEX idx_days_trip_id ON days(trip_id);

-- ─────────────────────────────────────────────────────────────
-- ACTIVITIES
-- Each scheduled item in a day's timeline.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE activities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id         UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  title          VARCHAR(200) NOT NULL,
  category       VARCHAR(50)  DEFAULT 'general',  -- travel | food | accommodation | activity | general
  location_name  VARCHAR(200),
  location_lat   DECIMAL(10, 7),
  location_lng   DECIMAL(10, 7),
  location_url   TEXT,                            -- Google Maps / external link

  start_time     TIME,
  end_time       TIME,
  duration_mins  SMALLINT,

  notes          TEXT,
  booking_ref    VARCHAR(100),
  cost           DECIMAL(10, 2),
  currency       CHAR(3) DEFAULT 'USD',

  sort_order     SMALLINT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_day_id  ON activities(day_id);
CREATE INDEX idx_activities_trip_id ON activities(trip_id);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS — keep updated_at fresh automatically
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- HELPER VIEW — full trip with activity counts
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW trip_summary AS
SELECT
  t.*,
  u.display_name  AS owner_name,
  u.avatar_url    AS owner_avatar,
  COUNT(DISTINCT d.id)  AS total_days,
  COUNT(DISTINCT a.id)  AS total_activities
FROM trips t
LEFT JOIN users      u ON u.id = t.user_id
LEFT JOIN days       d ON d.trip_id = t.id
LEFT JOIN activities a ON a.trip_id = t.id
GROUP BY t.id, u.display_name, u.avatar_url;
