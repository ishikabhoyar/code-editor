-- =============================================================
-- Migration: create all tables for void_app schema
-- Run via: psql or scripts/migrate.sh
-- =============================================================

SET search_path TO void_app;

-- ── Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL
);

-- ── Documents ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL    PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_name  VARCHAR(255) NOT NULL,
    language    VARCHAR(50)  NOT NULL,
    content     TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_email ON documents (owner_email);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at  ON documents (updated_at DESC);

-- ── Document collaborators (element collection) ────────────────
CREATE TABLE IF NOT EXISTS document_collaborators (
    document_id       BIGINT       NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    collaborator_name VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_collaborators_doc_id ON document_collaborators (document_id);

-- ── Document execution history (element collection) ────────────
CREATE TABLE IF NOT EXISTS document_execution_history (
    document_id   BIGINT       NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    history_order INT          NOT NULL,
    execution_id  VARCHAR(255) NOT NULL,
    executed_at   TIMESTAMPTZ  NOT NULL,
    status        VARCHAR(50)  NOT NULL,
    stdout        TEXT,
    stderr        TEXT,
    duration_ms   BIGINT       NOT NULL,
    PRIMARY KEY (document_id, history_order)
);

-- ── Document sessions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_sessions (
    id                BIGSERIAL    PRIMARY KEY,
    document_id       BIGINT       NOT NULL,
    collaborator_name VARCHAR(255) NOT NULL,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    last_heartbeat_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_document_id ON document_sessions (document_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active       ON document_sessions (document_id, active);
