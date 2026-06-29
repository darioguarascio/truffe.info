-- Truffe.info database schema

CREATE TABLE IF NOT EXISTS segnalazioni (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Informazioni base sulla truffa
  luogo TEXT,
  importo NUMERIC(12, 2),
  denaro_sottratto BOOLEAN,
  denuncia_polizia BOOLEAN,

  -- Cronologia eventi (array JSON: [{data, ora, descrizione}])
  eventi JSONB NOT NULL DEFAULT '[]',

  -- Allegati (array JSON: [{filename, originalName, mimeType, size}])
  allegati JSONB NOT NULL DEFAULT '[]',

  -- Identificazione truffatore
  truffatore_codename TEXT,
  truffatore_sesso TEXT CHECK (truffatore_sesso IN ('uomo', 'donna', NULL)),
  truffatore_nazionalita TEXT,
  truffatore_nome TEXT,
  truffatore_telefono TEXT,
  truffatore_caratteristiche TEXT,

  -- Dati segnalante
  vittima_nome TEXT NOT NULL,
  vittima_cognome TEXT NOT NULL,
  vittima_email TEXT NOT NULL,

  -- Dichiarazione di responsabilità
  dichiarazione_accettata BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadati legali
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  accept_language TEXT,
  forwarded_for TEXT
);

CREATE INDEX IF NOT EXISTS idx_segnalazioni_created_at ON segnalazioni (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_segnalazioni_email ON segnalazioni (vittima_email);
