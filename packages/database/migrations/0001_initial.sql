-- Tracefolio v1 MVP schema for PostgreSQL 16+.
-- Application services generate UUID IDs. All timestamps are stored in UTC.

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'CONSENT_REQUIRED', 'PENDING_DELETION', 'SUSPENDED');
CREATE TYPE achievement_status AS ENUM ('DRAFT', 'PRIVATE', 'PUBLIC', 'ARCHIVED');
CREATE TYPE attachment_status AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETE_PENDING', 'DELETED');
CREATE TYPE background_job_state AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE users (
  id TEXT PRIMARY KEY, role user_role NOT NULL DEFAULT 'USER', status user_status NOT NULL DEFAULT 'ACTIVE', display_name TEXT,
  deletion_requested_at TIMESTAMPTZ, deletion_scheduled_for TIMESTAMPTZ, suspended_at TIMESTAMPTZ, suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'PENDING_DELETION' OR deletion_scheduled_for IS NOT NULL),
  CHECK (status <> 'SUSPENDED' OR suspended_at IS NOT NULL)
);
CREATE TABLE auth_accounts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('GOOGLE', 'GITHUB')), provider_account_id TEXT NOT NULL, provider_email TEXT,
  provider_email_verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id), UNIQUE (user_id, provider)
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ
);
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY, document_type TEXT NOT NULL CHECK (document_type IN ('TERMS_OF_SERVICE', 'PRIVACY_POLICY')),
  version TEXT NOT NULL, content_url TEXT NOT NULL, published_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (document_type, version)
);
CREATE TABLE legal_consents (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL, ip_hash TEXT, user_agent_hash TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (user_id, document_id)
);
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT, username TEXT NOT NULL, username_normalized TEXT NOT NULL UNIQUE,
  headline TEXT, bio TEXT, location TEXT, avatar_url TEXT, links_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(username) BETWEEN 3 AND 32), CHECK (username_normalized = lower(username_normalized))
);
CREATE TABLE username_aliases (
  username_normalized TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK (username_normalized = lower(username_normalized))
);
CREATE TABLE portfolio_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT, is_public BOOLEAN NOT NULL DEFAULT false,
  allow_search_indexing BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE user_usage (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT, active_achievement_count INTEGER NOT NULL DEFAULT 0 CHECK (active_achievement_count BETWEEN 0 AND 500),
  skill_count INTEGER NOT NULL DEFAULT 0 CHECK (skill_count BETWEEN 0 AND 100), storage_used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (storage_used_bytes BETWEEN 0 AND 1073741824),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE skills (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, name TEXT NOT NULL, name_normalized TEXT NOT NULL, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name_normalized), CHECK (char_length(name) BETWEEN 1 AND 80), CHECK (name_normalized = lower(name_normalized))
);
CREATE TABLE achievements (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, title TEXT NOT NULL, summary TEXT NOT NULL,
  context TEXT, contribution TEXT, impact TEXT, occurred_at TIMESTAMPTZ, status achievement_status NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(title) BETWEEN 1 AND 160), CHECK (char_length(summary) BETWEEN 1 AND 2000),
  CHECK (status <> 'PUBLIC' OR published_at IS NOT NULL), CHECK (status <> 'ARCHIVED' OR archived_at IS NOT NULL)
);
CREATE TABLE achievement_skills (
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT, skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (achievement_id, skill_id)
);
CREATE TABLE attachments (
  id TEXT PRIMARY KEY, achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT, storage_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL, mime_type TEXT NOT NULL, byte_size BIGINT NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  checksum_sha256 TEXT NOT NULL CHECK (char_length(checksum_sha256) = 64), status attachment_status NOT NULL DEFAULT 'PENDING',
  upload_expires_at TIMESTAMPTZ, uploaded_at TIMESTAMPTZ, delete_requested_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ, failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'READY' OR uploaded_at IS NOT NULL), CHECK (status <> 'DELETE_PENDING' OR delete_requested_at IS NOT NULL), CHECK (status <> 'DELETED' OR deleted_at IS NOT NULL)
);
CREATE TABLE reports (
  id TEXT PRIMARY KEY, reporter_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, target_type TEXT NOT NULL CHECK (target_type IN ('PROFILE', 'ACHIEVEMENT')),
  profile_user_id TEXT REFERENCES profiles(user_id) ON DELETE RESTRICT, achievement_id TEXT REFERENCES achievements(id) ON DELETE RESTRICT,
  reason_code TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((target_type = 'PROFILE' AND profile_user_id IS NOT NULL AND achievement_id IS NULL) OR (target_type = 'ACHIEVEMENT' AND achievement_id IS NOT NULL AND profile_user_id IS NULL))
);
CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY, report_id TEXT REFERENCES reports(id) ON DELETE SET NULL, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('SUSPEND_USER', 'UNSUSPEND_USER', 'UNPUBLISH_PORTFOLIO', 'HIDE_ACHIEVEMENT', 'DISMISS_REPORT', 'NOTE')),
  reason TEXT, metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, subject_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, entity_id TEXT, action TEXT NOT NULL, request_id TEXT, metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY, event_name TEXT NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  source TEXT NOT NULL, route TEXT, entity_type TEXT, entity_id TEXT, metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb, schema_version INTEGER NOT NULL DEFAULT 1, occurred_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY, job_type TEXT NOT NULL CHECK (job_type IN ('ATTACHMENT_DELETE', 'PENDING_ATTACHMENT_CLEANUP', 'USAGE_RECONCILIATION', 'BUCKET_AUDIT', 'ACCOUNT_PURGE', 'ANALYTICS_DELIVERY')),
  state background_job_state NOT NULL DEFAULT 'PENDING', dedupe_key TEXT, payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0), max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(), locked_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (job_type, dedupe_key)
);
CREATE TABLE storage_audit_runs (
  id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'RUNNING' CHECK (state IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
  scanned_object_count INTEGER NOT NULL DEFAULT 0 CHECK (scanned_object_count >= 0), orphaned_object_count INTEGER NOT NULL DEFAULT 0 CHECK (orphaned_object_count >= 0),
  started_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, failure_code TEXT
);
CREATE TABLE storage_orphans (
  id TEXT PRIMARY KEY, audit_run_id TEXT NOT NULL REFERENCES storage_audit_runs(id) ON DELETE RESTRICT, storage_key TEXT NOT NULL,
  byte_size BIGINT, discovered_at TIMESTAMPTZ NOT NULL, remediated_at TIMESTAMPTZ, UNIQUE (audit_run_id, storage_key)
);
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, request_id TEXT NOT NULL UNIQUE,
  dialect TEXT NOT NULL CHECK (dialect IN ('CODEX', 'CLAUDE_CODE', 'DSH')), skill_name TEXT,
  state TEXT NOT NULL CHECK (state IN ('PREVIEW', 'COMPLETED', 'FAILED', 'CANCELLED')), input_hash TEXT, output_hash TEXT, failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
);

CREATE INDEX sessions_user_expires_idx ON sessions(user_id, expires_at);
CREATE INDEX legal_consents_user_idx ON legal_consents(user_id, accepted_at DESC);
CREATE INDEX username_aliases_user_expires_idx ON username_aliases(user_id, expires_at);
CREATE INDEX skills_user_name_idx ON skills(user_id, name_normalized);
CREATE INDEX achievements_user_status_idx ON achievements(user_id, status, occurred_at DESC);
CREATE INDEX achievements_public_idx ON achievements(published_at DESC) WHERE status = 'PUBLIC';
CREATE INDEX achievement_skills_skill_idx ON achievement_skills(skill_id, achievement_id);
CREATE INDEX attachments_achievement_status_idx ON attachments(achievement_id, status);
CREATE INDEX attachments_pending_expiry_idx ON attachments(upload_expires_at) WHERE status = 'PENDING';
CREATE INDEX reports_status_created_idx ON reports(status, created_at DESC);
CREATE INDEX moderation_actions_target_created_idx ON moderation_actions(target_user_id, created_at DESC);
CREATE INDEX audit_events_subject_created_idx ON audit_events(subject_user_id, created_at DESC);
CREATE INDEX audit_events_request_idx ON audit_events(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX analytics_events_name_time_idx ON analytics_events(event_name, occurred_at DESC);
CREATE INDEX background_jobs_ready_idx ON background_jobs(available_at) WHERE state = 'PENDING';
CREATE INDEX storage_orphans_unremediated_idx ON storage_orphans(remediated_at) WHERE remediated_at IS NULL;
CREATE INDEX agent_runs_user_created_idx ON agent_runs(user_id, created_at DESC);

CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE FUNCTION create_user_usage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO user_usage (user_id) VALUES (NEW.id); RETURN NEW; END;
$$;
CREATE FUNCTION unpublish_suspended_user() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.status = 'SUSPENDED' AND OLD.status IS DISTINCT FROM 'SUSPENDED' THEN UPDATE portfolio_settings SET is_public = false WHERE user_id = NEW.id; END IF; RETURN NEW; END;
$$;
CREATE FUNCTION validate_achievement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'PUBLIC' THEN RAISE EXCEPTION 'Achievement cannot be created directly as PUBLIC'; END IF;
    IF NEW.status IN ('DRAFT', 'PRIVATE') THEN
      SELECT active_achievement_count INTO current_count FROM user_usage WHERE user_id = NEW.user_id FOR UPDATE;
      IF current_count >= 500 THEN RAISE EXCEPTION 'Active Achievement quota reached'; END IF;
    END IF;
  ELSIF NEW.status = 'PUBLIC' AND OLD.status IS DISTINCT FROM 'PUBLIC' AND NOT EXISTS (SELECT 1 FROM achievement_skills WHERE achievement_id = NEW.id) THEN
    RAISE EXCEPTION 'Achievement must have at least one Skill before public visibility';
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION update_achievement_usage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('DRAFT', 'PRIVATE', 'PUBLIC') THEN UPDATE user_usage SET active_achievement_count = active_achievement_count + 1 WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('DRAFT', 'PRIVATE', 'PUBLIC') THEN UPDATE user_usage SET active_achievement_count = active_achievement_count - 1 WHERE user_id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ARCHIVED' AND NEW.status IN ('DRAFT', 'PRIVATE', 'PUBLIC') THEN
    PERFORM 1 FROM user_usage WHERE user_id = NEW.user_id FOR UPDATE;
    IF (SELECT active_achievement_count FROM user_usage WHERE user_id = NEW.user_id) >= 500 THEN RAISE EXCEPTION 'Active Achievement quota reached'; END IF;
    UPDATE user_usage SET active_achievement_count = active_achievement_count + 1 WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('DRAFT', 'PRIVATE', 'PUBLIC') AND NEW.status = 'ARCHIVED' THEN UPDATE user_usage SET active_achievement_count = active_achievement_count - 1 WHERE user_id = NEW.user_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION validate_skill() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_count INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'achievement_skills' THEN
    IF NOT EXISTS (SELECT 1 FROM achievements a JOIN skills s ON s.id = NEW.skill_id WHERE a.id = NEW.achievement_id AND a.user_id = s.user_id) THEN RAISE EXCEPTION 'Achievement and Skill must belong to the same user'; END IF;
  ELSE
    SELECT skill_count INTO current_count FROM user_usage WHERE user_id = NEW.user_id FOR UPDATE;
    IF current_count >= 100 THEN RAISE EXCEPTION 'Skill quota reached'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION update_skill_usage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF TG_OP = 'INSERT' THEN UPDATE user_usage SET skill_count = skill_count + 1 WHERE user_id = NEW.user_id; ELSE UPDATE user_usage SET skill_count = skill_count - 1 WHERE user_id = OLD.user_id; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END;
$$;
CREATE FUNCTION validate_attachment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; current_bytes BIGINT; current_files INTEGER;
BEGIN
  SELECT user_id INTO owner_id FROM achievements WHERE id = NEW.achievement_id;
  SELECT storage_used_bytes INTO current_bytes FROM user_usage WHERE user_id = owner_id FOR UPDATE;
  SELECT count(*) INTO current_files FROM attachments WHERE achievement_id = NEW.achievement_id AND status IN ('PENDING', 'READY', 'DELETE_PENDING');
  IF NEW.status IN ('PENDING', 'READY', 'DELETE_PENDING') AND current_files >= 5 THEN RAISE EXCEPTION 'Attachment count limit reached'; END IF;
  IF NEW.status IN ('PENDING', 'READY') AND current_bytes + NEW.byte_size > 1073741824 THEN RAISE EXCEPTION 'Storage quota reached'; END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION update_attachment_usage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT; delta BIGINT := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN IF NEW.status IN ('PENDING', 'READY') THEN delta := NEW.byte_size; END IF; SELECT user_id INTO owner_id FROM achievements WHERE id = NEW.achievement_id;
  ELSIF TG_OP = 'DELETE' THEN IF OLD.status IN ('PENDING', 'READY') THEN delta := -OLD.byte_size; END IF; SELECT user_id INTO owner_id FROM achievements WHERE id = OLD.achievement_id;
  ELSE
    IF OLD.status IN ('PENDING', 'READY') THEN delta := delta - OLD.byte_size; END IF;
    IF NEW.status IN ('PENDING', 'READY') THEN delta := delta + NEW.byte_size; END IF;
    SELECT user_id INTO owner_id FROM achievements WHERE id = NEW.achievement_id;
  END IF;
  IF delta <> 0 THEN UPDATE user_usage SET storage_used_bytes = storage_used_bytes + delta WHERE user_id = owner_id; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION validate_attachment_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.achievement_id <> OLD.achievement_id OR NEW.byte_size <> OLD.byte_size OR NEW.checksum_sha256 <> OLD.checksum_sha256 THEN RAISE EXCEPTION 'Attachment ownership, byte size and checksum are immutable'; END IF;
  IF OLD.status = 'PENDING' AND NEW.status NOT IN ('PENDING', 'READY', 'FAILED', 'DELETE_PENDING') THEN RAISE EXCEPTION 'Invalid attachment transition'; END IF;
  IF OLD.status = 'READY' AND NEW.status NOT IN ('READY', 'DELETE_PENDING') THEN RAISE EXCEPTION 'Invalid attachment transition'; END IF;
  IF OLD.status = 'FAILED' AND NEW.status NOT IN ('FAILED', 'DELETE_PENDING') THEN RAISE EXCEPTION 'Invalid attachment transition'; END IF;
  IF OLD.status = 'DELETE_PENDING' AND NEW.status NOT IN ('DELETE_PENDING', 'DELETED') THEN RAISE EXCEPTION 'Invalid attachment transition'; END IF;
  IF OLD.status = 'DELETED' AND NEW.status <> 'DELETED' THEN RAISE EXCEPTION 'Deleted attachment is immutable'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_usage_after_insert AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_user_usage();
CREATE TRIGGER users_suspend_after_update AFTER UPDATE OF status ON users FOR EACH ROW EXECUTE FUNCTION unpublish_suspended_user();
CREATE TRIGGER achievements_validate_before_insert BEFORE INSERT ON achievements FOR EACH ROW EXECUTE FUNCTION validate_achievement();
CREATE TRIGGER achievements_publish_before_update BEFORE UPDATE OF status ON achievements FOR EACH ROW EXECUTE FUNCTION validate_achievement();
CREATE TRIGGER achievements_usage_after_change AFTER INSERT OR UPDATE OR DELETE ON achievements FOR EACH ROW EXECUTE FUNCTION update_achievement_usage();
CREATE TRIGGER achievement_skills_owner_before_insert BEFORE INSERT ON achievement_skills FOR EACH ROW EXECUTE FUNCTION validate_skill();
CREATE TRIGGER skills_quota_before_insert BEFORE INSERT ON skills FOR EACH ROW EXECUTE FUNCTION validate_skill();
CREATE TRIGGER skills_usage_after_change AFTER INSERT OR DELETE ON skills FOR EACH ROW EXECUTE FUNCTION update_skill_usage();
CREATE TRIGGER attachments_limits_before_insert BEFORE INSERT ON attachments FOR EACH ROW EXECUTE FUNCTION validate_attachment();
CREATE TRIGGER attachments_transition_before_update BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE FUNCTION validate_attachment_transition();
CREATE TRIGGER attachments_usage_after_change AFTER INSERT OR UPDATE OR DELETE ON attachments FOR EACH ROW EXECUTE FUNCTION update_attachment_usage();
CREATE TRIGGER users_touch_before_update BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER profiles_touch_before_update BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER portfolio_settings_touch_before_update BEFORE UPDATE ON portfolio_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER user_usage_touch_before_update BEFORE UPDATE ON user_usage FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER skills_touch_before_update BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER achievements_touch_before_update BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER attachments_touch_before_update BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER reports_touch_before_update BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER background_jobs_touch_before_update BEFORE UPDATE ON background_jobs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
