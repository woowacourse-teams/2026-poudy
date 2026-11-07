CREATE TABLE youtube_channel (
    id                  VARCHAR(64) PRIMARY KEY,
    name                TEXT NOT NULL CHECK (btrim(name) <> ''),
    display_order       INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    handle              TEXT,
    subscriber_count    BIGINT CHECK (subscriber_count >= 0),
    profile_image_url   TEXT,
    banner_image_url    TEXT,
    metadata_checked_at TIMESTAMP NOT NULL,
    CONSTRAINT ck_youtube_channel_id CHECK (btrim(id) <> '')
);

CREATE TABLE youtube_video (
    id                  VARCHAR(11) PRIMARY KEY,
    channel_id          VARCHAR(64) NOT NULL REFERENCES youtube_channel(id),
    title               TEXT NOT NULL CHECK (btrim(title) <> ''),
    description         TEXT NOT NULL DEFAULT '',
    thumbnail_url       TEXT,
    duration_ms         BIGINT NOT NULL CHECK (duration_ms > 0),
    published_at        TIMESTAMP NOT NULL,
    view_count          BIGINT CHECK (view_count >= 0),
    visible             BOOLEAN NOT NULL DEFAULT false,
    metadata_checked_at TIMESTAMP NOT NULL,
    CONSTRAINT ck_youtube_video_id CHECK (id ~ '^[A-Za-z0-9_-]{11}$')
);
CREATE INDEX ix_youtube_video_channel ON youtube_video(channel_id, published_at DESC, id);

CREATE TABLE youtube_video_product (
    video_id       VARCHAR(11) NOT NULL REFERENCES youtube_video(id) ON DELETE CASCADE,
    product_id     BIGINT NOT NULL REFERENCES product(id),
    recommendation VARCHAR(20) NOT NULL,
    PRIMARY KEY (video_id, product_id),
    CONSTRAINT ck_youtube_video_product_recommendation CHECK (
        recommendation IN ('recommended', 'not_recommended', 'mixed', 'neutral', 'uncertain')
    )
);
CREATE INDEX ix_youtube_video_product_product ON youtube_video_product(product_id, video_id);

CREATE TABLE youtube_product_mention (
    video_id                 VARCHAR(11) NOT NULL,
    source_ordinal           INTEGER NOT NULL CHECK (source_ordinal > 0),
    product_id               BIGINT NOT NULL,
    spoken_name              TEXT NOT NULL CHECK (btrim(spoken_name) <> ''),
    start_ms                 BIGINT NOT NULL CHECK (start_ms >= 0),
    end_ms                   BIGINT,
    summary                  TEXT NOT NULL CHECK (btrim(summary) <> ''),
    recommendation           VARCHAR(20) NOT NULL,
    recommendation_condition TEXT,
    source_batch_hash        VARCHAR(64) NOT NULL CHECK (source_batch_hash ~ '^[0-9a-f]{64}$'),
    PRIMARY KEY (video_id, source_ordinal),
    CONSTRAINT fk_youtube_mention_video_product FOREIGN KEY (video_id, product_id)
        REFERENCES youtube_video_product(video_id, product_id) ON DELETE CASCADE,
    CONSTRAINT ck_youtube_mention_time CHECK (end_ms IS NULL OR end_ms > start_ms),
    CONSTRAINT ck_youtube_mention_recommendation CHECK (
        recommendation IN ('recommended', 'not_recommended', 'mixed', 'neutral', 'uncertain')
    )
);
CREATE INDEX ix_youtube_mention_product_time ON youtube_product_mention(video_id, product_id, start_ms);

-- Lock the parent while checking so a concurrent duration edit cannot invalidate this segment.
CREATE FUNCTION check_youtube_mention_duration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    video_duration BIGINT;
BEGIN
    SELECT duration_ms INTO video_duration FROM youtube_video WHERE id = NEW.video_id FOR SHARE;
    IF NEW.start_ms >= video_duration OR NEW.end_ms > video_duration THEN
        RAISE EXCEPTION 'YouTube mention is outside video duration' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$$;
CREATE TRIGGER tg_youtube_mention_duration BEFORE INSERT OR UPDATE
    ON youtube_product_mention FOR EACH ROW EXECUTE FUNCTION check_youtube_mention_duration();

CREATE FUNCTION check_youtube_video_duration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM youtube_product_mention
               WHERE video_id = NEW.id AND (start_ms >= NEW.duration_ms OR end_ms > NEW.duration_ms)) THEN
        RAISE EXCEPTION 'YouTube duration would invalidate existing mentions' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$$;
CREATE TRIGGER tg_youtube_video_duration BEFORE UPDATE OF duration_ms
    ON youtube_video FOR EACH ROW EXECUTE FUNCTION check_youtube_video_duration();
