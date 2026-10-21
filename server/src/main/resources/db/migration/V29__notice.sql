CREATE TABLE notice (
 id UUID PRIMARY KEY, title VARCHAR(40) NOT NULL CHECK(length(btrim(title))>0),
 content VARCHAR(2000) NOT NULL CHECK(length(btrim(content))>0),
 status VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' CHECK(status IN ('PRIVATE','PUBLISHED')),
 banner_enabled BOOLEAN NOT NULL DEFAULT false, banner_text VARCHAR(24),
 first_published_at TIMESTAMP, view_count BIGINT NOT NULL DEFAULT 0 CHECK(view_count>=0),
 created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL,
 CHECK(NOT banner_enabled OR (banner_text IS NOT NULL AND length(btrim(banner_text))>0)),
 CHECK(status<>'PUBLISHED' OR first_published_at IS NOT NULL)
);
CREATE INDEX ON notice(status,first_published_at DESC,id DESC);
CREATE INDEX ON notice(first_published_at DESC,id DESC) WHERE status='PUBLISHED' AND banner_enabled;
CREATE TABLE notice_image (
 image_id UUID PRIMARY KEY, notice_id UUID REFERENCES notice(id) ON DELETE SET NULL,
 display_order INTEGER CHECK(display_order BETWEEN 0 AND 4),
 object_key VARCHAR(1000) NOT NULL UNIQUE, content_type VARCHAR(30) NOT NULL,
 expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP NOT NULL,
 UNIQUE(notice_id,display_order) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX ON notice_image(expires_at) WHERE notice_id IS NULL;
