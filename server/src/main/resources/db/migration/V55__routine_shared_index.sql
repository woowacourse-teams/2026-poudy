CREATE INDEX ix_routine_public_created_at ON routine (created_at DESC, id DESC) WHERE is_public;
