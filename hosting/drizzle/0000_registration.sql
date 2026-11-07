CREATE TABLE registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ps5', 'xbox')),
  consent_version TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL,
  receipt_sent_at INTEGER
);
--> statement-breakpoint
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ps5', 'xbox')),
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sending',
  registration_id TEXT
);
--> statement-breakpoint
CREATE INDEX challenges_email_created ON challenges(email, created_at);
--> statement-breakpoint
CREATE INDEX challenges_expiration ON challenges(expires_at);
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
