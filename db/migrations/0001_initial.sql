CREATE TABLE IF NOT EXISTS parent_sessions (
  id TEXT PRIMARY KEY,
  child_ages TEXT NOT NULL,
  delivery_target TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shows (
  id TEXT PRIMARY KEY,
  parent_session_id TEXT,
  mode TEXT NOT NULL,
  source_pack_id TEXT NOT NULL,
  story_type TEXT NOT NULL,
  characters TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_session_id) REFERENCES parent_sessions(id)
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_target_sec INTEGER NOT NULL,
  learning_goal TEXT NOT NULL,
  continuity_summary TEXT NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (show_id) REFERENCES shows(id)
);

CREATE TABLE IF NOT EXISTS source_packs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  topic TEXT NOT NULL,
  subject TEXT NOT NULL,
  citation_label TEXT NOT NULL,
  transcript_excerpt TEXT NOT NULL
);
