-- Truffe.info database schema

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Moderation (stories are not public until approved)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,

  -- Basic scam info
  location TEXT,
  amount NUMERIC(12, 2),
  money_taken BOOLEAN,
  reported_to_police BOOLEAN,

  -- Timeline (JSON array: [{date, time, description}])
  events JSONB NOT NULL DEFAULT '[]',

  -- Attachments (JSON array: [{filename, originalName, mimeType, size}])
  attachments JSONB NOT NULL DEFAULT '[]',

  -- Scammer identification (internal / moderation only, not auto-published)
  scammer_codename TEXT,
  scammer_gender TEXT CHECK (scammer_gender IN ('male', 'female', NULL)),
  scammer_nationality TEXT,
  scammer_name TEXT,
  scammer_phone TEXT,
  scammer_characteristics TEXT,

  -- Reporter data (private, not published)
  reporter_first_name TEXT NOT NULL,
  reporter_last_name TEXT NOT NULL,
  reporter_email TEXT NOT NULL,

  -- Legal acceptances
  declaration_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  guidelines_accepted BOOLEAN NOT NULL DEFAULT FALSE,

  -- Legal metadata
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  accept_language TEXT,
  forwarded_for TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_email ON reports (reporter_email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- Content reports (notice-and-takedown)
CREATE TABLE IF NOT EXISTS content_reports (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),

  content_url TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'page',
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  reporter_email TEXT,
  reporter_name TEXT,

  ip_address INET,
  user_agent TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status);

-- Moderation action log (removals, rejections)
CREATE TABLE IF NOT EXISTS moderation_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('story', 'content')),
  reference_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'removed', 'resolved', 'dismissed')),
  notes TEXT,
  operator TEXT
);

CREATE INDEX IF NOT EXISTS idx_moderation_log_created_at ON moderation_log (created_at DESC);

-- Migrate from legacy Italian table/column names
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'segnalazioni') THEN
    ALTER TABLE segnalazioni RENAME TO reports;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'segnalazioni_contenuto') THEN
    ALTER TABLE segnalazioni_contenuto RENAME TO content_reports;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'log_moderazione') THEN
    ALTER TABLE log_moderazione RENAME TO moderation_log;
  END IF;
END $$;

-- Rename legacy columns on reports (idempotent via IF EXISTS checks)
ALTER TABLE reports RENAME COLUMN IF EXISTS stato TO status;
ALTER TABLE reports RENAME COLUMN IF EXISTS moderato_il TO moderated_at;
ALTER TABLE reports RENAME COLUMN IF EXISTS note_moderazione TO moderation_notes;
ALTER TABLE reports RENAME COLUMN IF EXISTS luogo TO location;
ALTER TABLE reports RENAME COLUMN IF EXISTS importo TO amount;
ALTER TABLE reports RENAME COLUMN IF EXISTS denaro_sottratto TO money_taken;
ALTER TABLE reports RENAME COLUMN IF EXISTS denuncia_polizia TO reported_to_police;
ALTER TABLE reports RENAME COLUMN IF EXISTS eventi TO events;
ALTER TABLE reports RENAME COLUMN IF EXISTS allegati TO attachments;
ALTER TABLE reports RENAME COLUMN IF EXISTS truffatore_codename TO scammer_codename;
ALTER TABLE reports RENAME COLUMN IF EXISTS truffatore_sesso TO scammer_gender;
ALTER TABLE reports RENAME COLUMN IF EXISTS truffatore_nazionalita TO scammer_nationality;
ALTER TABLE reports RENAME COLUMN IF EXISTS truffatore_nome TO scammer_name;
ALTER TABLE reports RENAME COLUMN IF EXISTS truffatore_telefono TO scammer_phone;
ALTER TABLE reports RENAME COLUMN IF EXISTS truffatore_caratteristiche TO scammer_characteristics;
ALTER TABLE reports RENAME COLUMN IF EXISTS vittima_nome TO reporter_first_name;
ALTER TABLE reports RENAME COLUMN IF EXISTS vittima_cognome TO reporter_last_name;
ALTER TABLE reports RENAME COLUMN IF EXISTS vittima_email TO reporter_email;
ALTER TABLE reports RENAME COLUMN IF EXISTS dichiarazione_accettata TO declaration_accepted;
ALTER TABLE reports RENAME COLUMN IF EXISTS termini_accettati TO terms_accepted;
ALTER TABLE reports RENAME COLUMN IF EXISTS linee_guida_accettate TO guidelines_accepted;

-- Migrate legacy status values
UPDATE reports SET status = 'pending' WHERE status = 'in_attesa';
UPDATE reports SET status = 'approved' WHERE status = 'approvata';
UPDATE reports SET status = 'rejected' WHERE status = 'rifiutata';
UPDATE reports SET status = 'removed' WHERE status = 'rimossa';

-- Migrate legacy gender values
UPDATE reports SET scammer_gender = 'male' WHERE scammer_gender = 'uomo';
UPDATE reports SET scammer_gender = 'female' WHERE scammer_gender = 'donna';

-- Rename content_reports legacy columns
ALTER TABLE content_reports RENAME COLUMN IF EXISTS url_contenuto TO content_url;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS tipo_contenuto TO content_type;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS motivo TO reason;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS descrizione TO description;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS email_segnalante TO reporter_email;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS nome_segnalante TO reporter_name;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS risolto_il TO resolved_at;
ALTER TABLE content_reports RENAME COLUMN IF EXISTS note_risoluzione TO resolution_notes;

UPDATE content_reports SET status = 'open' WHERE status = 'aperta';
UPDATE content_reports SET status = 'reviewing' WHERE status = 'in_esame';
UPDATE content_reports SET status = 'resolved' WHERE status = 'risolta';
UPDATE content_reports SET status = 'dismissed' WHERE status = 'respinta';

-- Rename moderation_log legacy columns
ALTER TABLE moderation_log RENAME COLUMN IF EXISTS tipo TO entity_type;
ALTER TABLE moderation_log RENAME COLUMN IF EXISTS riferimento_id TO reference_id;
ALTER TABLE moderation_log RENAME COLUMN IF EXISTS azione TO action;
ALTER TABLE moderation_log RENAME COLUMN IF EXISTS note TO notes;
ALTER TABLE moderation_log RENAME COLUMN IF EXISTS operatore TO operator;

UPDATE moderation_log SET entity_type = 'story' WHERE entity_type = 'storia';
UPDATE moderation_log SET entity_type = 'content' WHERE entity_type = 'contenuto';
UPDATE moderation_log SET action = 'approved' WHERE action = 'approvata';
UPDATE moderation_log SET action = 'rejected' WHERE action = 'rifiutata';
UPDATE moderation_log SET action = 'removed' WHERE action = 'rimossa';
UPDATE moderation_log SET action = 'resolved' WHERE action = 'risolta';
UPDATE moderation_log SET action = 'dismissed' WHERE action = 'respinta';

-- Add columns if missing (fresh partial installs)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS guidelines_accepted BOOLEAN NOT NULL DEFAULT FALSE;
