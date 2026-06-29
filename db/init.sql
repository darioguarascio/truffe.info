-- Truffe.info database schema

-- Migrate legacy Italian table names first (before CREATE TABLE)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'segnalazioni')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    ALTER TABLE segnalazioni RENAME TO reports;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'segnalazioni_contenuto')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
    ALTER TABLE segnalazioni_contenuto RENAME TO content_reports;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_moderazione')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_log') THEN
    ALTER TABLE log_moderazione RENAME TO moderation_log;
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS moderation_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('story', 'content')),
  reference_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'removed', 'resolved', 'dismissed')),
  notes TEXT,
  operator TEXT
);

-- Rename legacy columns on reports
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'stato') THEN
    ALTER TABLE reports RENAME COLUMN stato TO status;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'moderato_il') THEN
    ALTER TABLE reports RENAME COLUMN moderato_il TO moderated_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'note_moderazione') THEN
    ALTER TABLE reports RENAME COLUMN note_moderazione TO moderation_notes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'luogo') THEN
    ALTER TABLE reports RENAME COLUMN luogo TO location;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'importo') THEN
    ALTER TABLE reports RENAME COLUMN importo TO amount;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'denaro_sottratto') THEN
    ALTER TABLE reports RENAME COLUMN denaro_sottratto TO money_taken;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'denuncia_polizia') THEN
    ALTER TABLE reports RENAME COLUMN denuncia_polizia TO reported_to_police;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'eventi') THEN
    ALTER TABLE reports RENAME COLUMN eventi TO events;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'allegati') THEN
    ALTER TABLE reports RENAME COLUMN allegati TO attachments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'truffatore_codename') THEN
    ALTER TABLE reports RENAME COLUMN truffatore_codename TO scammer_codename;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'truffatore_sesso') THEN
    ALTER TABLE reports RENAME COLUMN truffatore_sesso TO scammer_gender;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'truffatore_nazionalita') THEN
    ALTER TABLE reports RENAME COLUMN truffatore_nazionalita TO scammer_nationality;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'truffatore_nome') THEN
    ALTER TABLE reports RENAME COLUMN truffatore_nome TO scammer_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'truffatore_telefono') THEN
    ALTER TABLE reports RENAME COLUMN truffatore_telefono TO scammer_phone;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'truffatore_caratteristiche') THEN
    ALTER TABLE reports RENAME COLUMN truffatore_caratteristiche TO scammer_characteristics;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'vittima_nome') THEN
    ALTER TABLE reports RENAME COLUMN vittima_nome TO reporter_first_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'vittima_cognome') THEN
    ALTER TABLE reports RENAME COLUMN vittima_cognome TO reporter_last_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'vittima_email') THEN
    ALTER TABLE reports RENAME COLUMN vittima_email TO reporter_email;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'dichiarazione_accettata') THEN
    ALTER TABLE reports RENAME COLUMN dichiarazione_accettata TO declaration_accepted;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'termini_accettati') THEN
    ALTER TABLE reports RENAME COLUMN termini_accettati TO terms_accepted;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'linee_guida_accettate') THEN
    ALTER TABLE reports RENAME COLUMN linee_guida_accettate TO guidelines_accepted;
  END IF;
END $$;

-- Add columns if missing (legacy installs)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS guidelines_accepted BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate legacy status values
UPDATE reports SET status = 'pending' WHERE status = 'in_attesa';
UPDATE reports SET status = 'approved' WHERE status = 'approvata';
UPDATE reports SET status = 'rejected' WHERE status = 'rifiutata';
UPDATE reports SET status = 'removed' WHERE status = 'rimossa';

-- Migrate legacy gender values
UPDATE reports SET scammer_gender = 'male' WHERE scammer_gender = 'uomo';
UPDATE reports SET scammer_gender = 'female' WHERE scammer_gender = 'donna';

-- Rename content_reports legacy columns
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'url_contenuto') THEN
    ALTER TABLE content_reports RENAME COLUMN url_contenuto TO content_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'tipo_contenuto') THEN
    ALTER TABLE content_reports RENAME COLUMN tipo_contenuto TO content_type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'motivo') THEN
    ALTER TABLE content_reports RENAME COLUMN motivo TO reason;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'descrizione') THEN
    ALTER TABLE content_reports RENAME COLUMN descrizione TO description;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'email_segnalante') THEN
    ALTER TABLE content_reports RENAME COLUMN email_segnalante TO reporter_email;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'nome_segnalante') THEN
    ALTER TABLE content_reports RENAME COLUMN nome_segnalante TO reporter_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'risolto_il') THEN
    ALTER TABLE content_reports RENAME COLUMN risolto_il TO resolved_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'note_risoluzione') THEN
    ALTER TABLE content_reports RENAME COLUMN note_risoluzione TO resolution_notes;
  END IF;
END $$;

UPDATE content_reports SET status = 'open' WHERE status = 'aperta';
UPDATE content_reports SET status = 'reviewing' WHERE status = 'in_esame';
UPDATE content_reports SET status = 'resolved' WHERE status = 'risolta';
UPDATE content_reports SET status = 'dismissed' WHERE status = 'respinta';

-- Rename moderation_log legacy columns
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moderation_log' AND column_name = 'tipo') THEN
    ALTER TABLE moderation_log RENAME COLUMN tipo TO entity_type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moderation_log' AND column_name = 'riferimento_id') THEN
    ALTER TABLE moderation_log RENAME COLUMN riferimento_id TO reference_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moderation_log' AND column_name = 'azione') THEN
    ALTER TABLE moderation_log RENAME COLUMN azione TO action;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moderation_log' AND column_name = 'note') THEN
    ALTER TABLE moderation_log RENAME COLUMN note TO notes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moderation_log' AND column_name = 'operatore') THEN
    ALTER TABLE moderation_log RENAME COLUMN operatore TO operator;
  END IF;
END $$;

UPDATE moderation_log SET entity_type = 'story' WHERE entity_type = 'storia';
UPDATE moderation_log SET entity_type = 'content' WHERE entity_type = 'contenuto';
UPDATE moderation_log SET action = 'approved' WHERE action = 'approvata';
UPDATE moderation_log SET action = 'rejected' WHERE action = 'rifiutata';
UPDATE moderation_log SET action = 'removed' WHERE action = 'rimossa';
UPDATE moderation_log SET action = 'resolved' WHERE action = 'risolta';
UPDATE moderation_log SET action = 'dismissed' WHERE action = 'respinta';

-- Update legacy scammer_gender check constraint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'segnalazioni_truffatore_sesso_check'
  ) THEN
    ALTER TABLE reports DROP CONSTRAINT segnalazioni_truffatore_sesso_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_scammer_gender_check'
  ) THEN
    ALTER TABLE reports ADD CONSTRAINT reports_scammer_gender_check
      CHECK (scammer_gender IN ('male', 'female') OR scammer_gender IS NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_email ON reports (reporter_email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status);
CREATE INDEX IF NOT EXISTS idx_moderation_log_created_at ON moderation_log (created_at DESC);
