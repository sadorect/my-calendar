-- Schema for the calendar sync service.
--
-- The server deliberately cannot read what it stores: `ciphertext` is AES-GCM
-- encrypted in the browser with a key derived from the account password, which
-- never leaves the device. That means a database dump, a backup tape or a
-- curious administrator sees nothing but random bytes — which matters, because
-- what is being stored is somebody's pregnancy journal.

CREATE TABLE IF NOT EXISTS accounts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL,
  email_key     TEXT NOT NULL UNIQUE,   -- lowercased email, the lookup key
  auth_hash     TEXT NOT NULL,          -- scrypt of the client's auth secret
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vaults (
  account_id   BIGINT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  ciphertext   TEXT NOT NULL,           -- base64 AES-GCM payload
  iv           TEXT NOT NULL,           -- base64 96-bit nonce
  -- Client's own `updatedAt` for the decrypted blob. Kept alongside so a client
  -- can decide whether to merge without downloading and decrypting first.
  client_updated_at TIMESTAMPTZ,
  -- Monotonic per-account. A write must name the revision it was based on, so
  -- two devices saving at once cannot silently overwrite each other.
  revision     BIGINT NOT NULL DEFAULT 1,
  bytes        INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vaults_updated_at_idx ON vaults (updated_at);

