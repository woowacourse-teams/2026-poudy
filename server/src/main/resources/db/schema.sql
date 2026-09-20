-- 적용: psql -X -v ON_ERROR_STOP=1 --single-transaction -f src/main/resources/db/schema.sql
-- 한 트랜잭션으로 적용해 중간에 실패하면 아무것도 남지 않게 한다. 테스트는 spring.sql.init 이 파일 전체를 한 문장 묶음으로 실행한다.

-- preflight. ASCII 로만 쓴다. UTF8 이 아닌 DB 는 한글이 든 문장을 변환하다 먼저 실패하기 때문이다.
DO $$
BEGIN
    IF current_setting('server_encoding') <> 'UTF8' THEN
        RAISE EXCEPTION 'preflight failed: server_encoding must be UTF8 (current: %). normalize() and IS NFC NORMALIZED require UTF8.',
            current_setting('server_encoding');
    END IF;
    IF current_setting('server_version_num')::int < 150000 THEN
        RAISE EXCEPTION 'preflight failed: PostgreSQL 15 or later is required (UNIQUE NULLS NOT DISTINCT). current: %',
            current_setting('server_version');
    END IF;
END
$$;

CREATE TABLE brand (
    id           BIGINT        NOT NULL,
    korean_name  VARCHAR(100)  NOT NULL,
    english_name VARCHAR(200)  NULL,
    image_url    VARCHAR(1000) NULL,
    CONSTRAINT pk_brand PRIMARY KEY (id),
    CONSTRAINT ck_brand_name_nfc CHECK (korean_name IS NFC NORMALIZED AND (english_name IS NULL OR english_name IS NFC NORMALIZED)),
    CONSTRAINT ux_brand_korean_name UNIQUE (korean_name),
    CONSTRAINT ck_brand_korean_name_not_blank CHECK (korean_name !~ '^\s*$')
);

CREATE TABLE category (
    id            BIGINT       NOT NULL,
    parent_id     BIGINT       NULL,
    parent_depth  SMALLINT     NULL,
    name          VARCHAR(100) NOT NULL,
    depth         SMALLINT     NOT NULL,
    display_order INT          NOT NULL,
    CONSTRAINT pk_category PRIMARY KEY (id),
    CONSTRAINT ux_category_id_depth UNIQUE (id, depth),
    CONSTRAINT ux_category_order UNIQUE (display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id, parent_depth) REFERENCES category (id, depth),
    CONSTRAINT ck_category_name_not_blank CHECK (name !~ '^\s*$'),
    CONSTRAINT ck_category_depth CHECK (
        (depth = 0 AND parent_id IS NULL AND parent_depth IS NULL)
        OR (depth = 1 AND parent_id IS NOT NULL AND parent_depth = 0)
    )
);

CREATE TABLE tag (
    id         BIGINT       NOT NULL,
    category   VARCHAR(30)  NOT NULL,
    code       VARCHAR(100) NOT NULL,
    name       VARCHAR(100) NOT NULL,
    CONSTRAINT pk_tag PRIMARY KEY (id),
    CONSTRAINT ux_tag_category_code UNIQUE (category, code),
    CONSTRAINT ck_tag_code_not_blank CHECK (code !~ '^\s*$'),
    CONSTRAINT ck_tag_name_not_blank CHECK (name !~ '^\s*$'),
    CONSTRAINT ck_tag_category CHECK (category IN (
        'FUNCTION', 'BIOLOGICAL_EFFECT', 'INGREDIENT_CLASS', 'ALLERGEN', 'REGULATORY', 'SKIN_REACTION'
    ))
);

CREATE TABLE ingredient (
    id                BIGINT        NOT NULL,
    korean_name       VARCHAR(600)  NOT NULL,
    english_name      VARCHAR(2000) NULL,
    description       VARCHAR(1000) NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    CONSTRAINT pk_ingredient PRIMARY KEY (id),
    CONSTRAINT ck_ingredient_name_nfc CHECK (korean_name IS NFC NORMALIZED AND (english_name IS NULL OR english_name IS NFC NORMALIZED))
);

CREATE TABLE ingredient_alias (
    ingredient_id BIGINT       NOT NULL,
    display_order INT          NOT NULL,
    alias         VARCHAR(300) NOT NULL,
    CONSTRAINT pk_ingredient_alias PRIMARY KEY (ingredient_id, display_order),
    CONSTRAINT ux_ingredient_alias_alias UNIQUE (ingredient_id, alias),
    CONSTRAINT ck_ingredient_alias_nfc CHECK (alias IS NFC NORMALIZED),
    CONSTRAINT fk_ingredient_alias_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id) ON DELETE CASCADE
);

CREATE TABLE ingredient_tag (
    ingredient_id BIGINT NOT NULL,
    tag_id        BIGINT NOT NULL,
    display_order INT    NOT NULL,
    CONSTRAINT pk_ingredient_tag PRIMARY KEY (ingredient_id, tag_id),
    CONSTRAINT ux_ingredient_tag_order UNIQUE (ingredient_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_ingredient_tag_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id) ON DELETE CASCADE,
    CONSTRAINT fk_ingredient_tag_tag FOREIGN KEY (tag_id) REFERENCES tag (id)
);

CREATE TABLE ingredient_tag_evidence (
    ingredient_id BIGINT      NOT NULL,
    tag_id        BIGINT      NOT NULL,
    display_order INT         NOT NULL,
    content       TEXT        NOT NULL,
    CONSTRAINT pk_ingredient_tag_evidence PRIMARY KEY (ingredient_id, tag_id, display_order),
    CONSTRAINT fk_ingredient_tag_evidence_tag FOREIGN KEY (ingredient_id, tag_id) REFERENCES ingredient_tag (ingredient_id, tag_id) ON DELETE CASCADE,
    CONSTRAINT ck_ingredient_tag_evidence_not_deferred CHECK (content NOT LIKE '태그 보류%') -- 서버가 기동 시 거부하는 보류 근거
);

CREATE TABLE ingredient_source (
    ingredient_id BIGINT NOT NULL,
    display_order INT    NOT NULL,
    content       TEXT   NOT NULL,
    CONSTRAINT pk_ingredient_source PRIMARY KEY (ingredient_id, display_order),
    CONSTRAINT fk_ingredient_source_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id) ON DELETE CASCADE
);

CREATE TABLE exclude_code_ingredient (
    exclude_code  VARCHAR(50) NOT NULL,
    ingredient_id BIGINT      NOT NULL,
    display_order INT         NOT NULL,
    CONSTRAINT pk_exclude_code_ingredient PRIMARY KEY (exclude_code, ingredient_id),
    CONSTRAINT ux_exclude_code_ingredient_order UNIQUE (exclude_code, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_exclude_code_ingredient_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id),
    CONSTRAINT ck_exclude_code CHECK (exclude_code IN (
        'FRAGRANCE_ALLERGENS', 'DRYING_ALCOHOLS', 'HARSH_PRESERVATIVES',
        'SULFATES', 'CYCLIC_SILICONES', 'SYNTHETIC_COLORANTS'
    ))
);

CREATE TABLE product (
    id             BIGINT        NOT NULL,
    brand_id       BIGINT        NOT NULL,
    category_id    BIGINT        NOT NULL,
    category_depth SMALLINT      NOT NULL DEFAULT 1,
    product_name   VARCHAR(300)  NOT NULL,
    image_url      VARCHAR(1000) NULL,
    moisture_level SMALLINT      NOT NULL, -- 외부에서 계산한 결과를 저장한다
    oil_level      SMALLINT      NOT NULL, -- 외부에서 계산한 결과를 저장한다
    updated_at     TIMESTAMPTZ   NOT NULL,
    CONSTRAINT pk_product PRIMARY KEY (id),
    CONSTRAINT ux_product_brand_name UNIQUE (brand_id, product_name),
    CONSTRAINT ck_product_name_nfc CHECK (product_name IS NFC NORMALIZED),
    CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brand (id),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id, category_depth) REFERENCES category (id, depth),
    CONSTRAINT ck_product_category_depth CHECK (category_depth = 1),
    CONSTRAINT ck_product_moisture_level CHECK (moisture_level BETWEEN 0 AND 3),
    CONSTRAINT ck_product_oil_level CHECK (oil_level BETWEEN 0 AND 3)
);

-- 제품 행은 지우지 않고 ID 도 바꾸지 않는다. 참조가 아직 없는 제품도 삭제·TRUNCATE·ID 변경을 거부해 ID 가 재사용되지 않게 한다.
CREATE FUNCTION reject_product_identity_change() RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION '제품 ID 는 바꾸지 않는다 (% → %).', OLD.id, NEW.id;
        END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION '제품 행은 삭제하지 않는다 (%). 단종은 삭제가 아니라 옵션 상태(discontinued)로 표현한다.', TG_OP;
END
$$;

CREATE TRIGGER tg_product_reject_delete BEFORE DELETE ON product
    FOR EACH ROW EXECUTE FUNCTION reject_product_identity_change();

CREATE TRIGGER tg_product_reject_truncate BEFORE TRUNCATE ON product
    FOR EACH STATEMENT EXECUTE FUNCTION reject_product_identity_change();

CREATE TRIGGER tg_product_reject_id_update BEFORE UPDATE OF id ON product
    FOR EACH ROW EXECUTE FUNCTION reject_product_identity_change();

CREATE TABLE product_variant (
    id            BIGINT        NOT NULL,
    product_id    BIGINT        NOT NULL,
    display_order INT           NOT NULL,
    price         BIGINT        NOT NULL,
    volume_value  NUMERIC(10,2) NOT NULL,
    volume_unit   VARCHAR(20)   NOT NULL,
    status        VARCHAR(20)   NOT NULL,
    CONSTRAINT pk_product_variant PRIMARY KEY (id),
    CONSTRAINT ux_product_variant_order UNIQUE (product_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_product_variant_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_product_variant_price CHECK (price >= 0),
    CONSTRAINT ck_product_variant_volume CHECK (volume_value >= 0),
    CONSTRAINT ck_product_variant_volume_unit CHECK (volume_unit IN ('ml', 'g', 'ea')),
    CONSTRAINT ck_product_variant_status CHECK (status IN ('active', 'discontinued'))
);

-- 제품은 옵션을 하나 이상 가진다. 적재 중에는 제품과 옵션을 차례로 넣거나 옵션을 지우고 다시 넣으므로 커밋 시점에 검사한다.
-- 검사 전에 제품 행을 잠가(FOR NO KEY UPDATE, FK 검사의 KEY SHARE 와는 충돌하지 않는다) 같은 제품의 옵션을 동시에 지우는 트랜잭션끼리 차례로 검사하게 한다.
-- REPEATABLE READ 는 차례를 지켜도 시작 시점 스냅샷이라 앞선 커밋을 못 보므로 거부한다. READ COMMITTED 또는 SERIALIZABLE 에서 적재한다.
-- TRUNCATE 는 행 트리거를 거치지 않으므로 거부한다. 옵션 전체 교체는 DELETE 후 다시 넣는다.
CREATE FUNCTION require_product_variant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_product_id BIGINT;
BEGIN
    IF TG_OP = 'TRUNCATE' THEN
        RAISE EXCEPTION '제품 옵션은 TRUNCATE 하지 않는다. 옵션 교체는 DELETE 후 다시 넣는다.';
    END IF;
    IF current_setting('transaction_isolation') = 'repeatable read' THEN
        RAISE EXCEPTION '% 검사는 REPEATABLE READ 에서 동시 삭제를 놓친다. READ COMMITTED 또는 SERIALIZABLE 로 실행한다.', TG_TABLE_NAME;
    END IF;
    IF TG_TABLE_NAME = 'product' THEN
        v_product_id := NEW.id;
    ELSE
        v_product_id := OLD.product_id;
    END IF;
    PERFORM 1 FROM product WHERE id = v_product_id FOR NO KEY UPDATE;
    IF FOUND
       AND NOT EXISTS (SELECT 1 FROM product_variant WHERE product_id = v_product_id) THEN
        RAISE EXCEPTION '제품 % 에 옵션이 없다. 제품은 옵션을 하나 이상 가진다.', v_product_id;
    END IF;
    RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER tg_product_require_variant AFTER INSERT ON product
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_product_variant();
CREATE CONSTRAINT TRIGGER tg_product_variant_keep_one AFTER DELETE OR UPDATE OF product_id ON product_variant
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_product_variant();
CREATE TRIGGER tg_product_variant_reject_truncate BEFORE TRUNCATE ON product_variant
    FOR EACH STATEMENT EXECUTE FUNCTION require_product_variant();

CREATE TABLE product_component (
    product_id    BIGINT       NOT NULL,
    display_order INT          NOT NULL,
    name          VARCHAR(100) NULL,
    CONSTRAINT pk_product_component PRIMARY KEY (product_id, display_order),
    CONSTRAINT ux_product_component_name UNIQUE NULLS NOT DISTINCT (product_id, name),
    CONSTRAINT fk_product_component_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE product_ingredient (
    product_id             BIGINT        NOT NULL,
    component_order        INT           NOT NULL,
    display_order          INT           NOT NULL,
    ingredient_id          BIGINT        NOT NULL,
    disclosed_amount_type  VARCHAR(20)   NULL,
    disclosed_amount_value NUMERIC(19,9) NULL,
    disclosed_amount_unit  VARCHAR(20)   NULL,
    CONSTRAINT pk_product_ingredient PRIMARY KEY (product_id, component_order, display_order),
    CONSTRAINT fk_product_ingredient_component FOREIGN KEY (product_id, component_order) REFERENCES product_component (product_id, display_order),
    CONSTRAINT fk_product_ingredient_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id),
    CONSTRAINT ck_product_ingredient_amount CHECK (
        (disclosed_amount_type IS NULL AND disclosed_amount_value IS NULL AND disclosed_amount_unit IS NULL)
        OR (disclosed_amount_type IS NOT NULL AND disclosed_amount_value IS NOT NULL AND disclosed_amount_unit IS NOT NULL)
    ),
    CONSTRAINT ck_product_ingredient_amount_value CHECK (disclosed_amount_value IS NULL OR disclosed_amount_value >= 0),
    CONSTRAINT ck_product_ingredient_amount_unit CHECK (
        disclosed_amount_unit IS NULL OR disclosed_amount_unit IN ('ppm', 'ppb', 'percent')
    ),
    CONSTRAINT ck_product_ingredient_amount_type CHECK (
        disclosed_amount_type IS NULL OR disclosed_amount_type IN ('exact')
    )
);

CREATE TABLE product_skin_type (
    product_id BIGINT      NOT NULL,
    skin_type  VARCHAR(20) NOT NULL,
    CONSTRAINT pk_product_skin_type PRIMARY KEY (product_id, skin_type),
    CONSTRAINT fk_product_skin_type_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_product_skin_type CHECK (skin_type IN ('DRY', 'OILY', 'SENSITIVE', 'COMBINATION'))
);

CREATE TABLE curation (
    id                         BIGINT        NOT NULL, -- 원천이 준 ID. /api/curations/{id} 링크가 유지되도록 다시 적재해도 바꾸지 않는다
    position                   INT           NOT NULL,
    banner_title               VARCHAR(200)  NOT NULL,
    banner_description         VARCHAR(500)  NOT NULL,
    banner_thumbnail_image_url VARCHAR(1000) NOT NULL,
    detail_title               VARCHAR(200)  NOT NULL,
    detail_description         TEXT          NOT NULL,
    CONSTRAINT pk_curation PRIMARY KEY (id),
    CONSTRAINT ux_curation_position UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE curation_block (
    id             UUID          NOT NULL,
    curation_id    BIGINT        NOT NULL,
    position       INT           NOT NULL,
    type           VARCHAR(30)   NOT NULL,
    status         VARCHAR(10)   NOT NULL,
    spacing_top    INT           NOT NULL,
    spacing_bottom INT           NOT NULL,
    image_url      VARCHAR(1000) NULL,
    CONSTRAINT pk_curation_block PRIMARY KEY (id),
    CONSTRAINT ux_curation_block_id_type UNIQUE (id, type),
    CONSTRAINT ux_curation_block_order UNIQUE (curation_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_curation_block_curation FOREIGN KEY (curation_id) REFERENCES curation (id) ON DELETE CASCADE,
    CONSTRAINT ck_curation_block_type CHECK (type IN ('IMAGE', 'PRODUCTS', 'PRODUCTS_BY_FILTER')),
    CONSTRAINT ck_curation_block_status CHECK (status IN ('VISIBLE', 'HIDDEN')),
    CONSTRAINT ck_curation_block_spacing CHECK (spacing_top >= 0 AND spacing_bottom >= 0),
    CONSTRAINT ck_curation_block_image CHECK (
        (type = 'IMAGE' AND (status = 'HIDDEN' OR image_url IS NOT NULL))
        OR (type <> 'IMAGE' AND image_url IS NULL)
    )
);

CREATE TABLE curation_block_filter (
    id         UUID         NOT NULL,
    block_id   UUID         NOT NULL,
    block_type VARCHAR(30)  NOT NULL DEFAULT 'PRODUCTS_BY_FILTER',
    position   INT          NOT NULL,
    label      VARCHAR(100) NOT NULL,
    CONSTRAINT pk_curation_block_filter PRIMARY KEY (block_id, id),
    CONSTRAINT ux_curation_block_filter_order UNIQUE (block_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_curation_block_filter_block FOREIGN KEY (block_id, block_type) REFERENCES curation_block (id, type) ON DELETE CASCADE,
    CONSTRAINT ck_curation_block_filter_block_type CHECK (block_type = 'PRODUCTS_BY_FILTER')
);

CREATE TABLE curation_block_product (
    block_id   UUID        NOT NULL,
    block_type VARCHAR(30) NOT NULL,
    product_id BIGINT      NOT NULL,
    position   INT         NOT NULL,
    CONSTRAINT pk_curation_block_product PRIMARY KEY (block_id, product_id),
    CONSTRAINT ux_curation_block_product_order UNIQUE (block_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_curation_block_product_block FOREIGN KEY (block_id, block_type) REFERENCES curation_block (id, type) ON DELETE CASCADE,
    CONSTRAINT ck_curation_block_product_block_type CHECK (block_type IN ('PRODUCTS', 'PRODUCTS_BY_FILTER')),
    CONSTRAINT fk_curation_block_product_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE curation_block_product_filter (
    block_id   UUID   NOT NULL,
    product_id BIGINT NOT NULL,
    filter_id  UUID   NOT NULL,
    position   INT    NOT NULL,
    CONSTRAINT pk_curation_block_product_filter PRIMARY KEY (block_id, product_id, filter_id),
    CONSTRAINT ux_curation_block_product_filter_order UNIQUE (block_id, product_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_cbpf_product FOREIGN KEY (block_id, product_id) REFERENCES curation_block_product (block_id, product_id) ON DELETE CASCADE,
    CONSTRAINT fk_cbpf_filter FOREIGN KEY (block_id, filter_id) REFERENCES curation_block_filter (block_id, id) ON DELETE CASCADE
);

-- 필터형 제품 블록(PRODUCTS_BY_FILTER)은 필터를 하나 이상 가지고, 블록의 모든 제품은 필터에 하나 이상 연결된다(노출 상태와 무관).
-- 블록·필터·제품·연결을 차례로 넣거나 바꾸므로 커밋 시점에 검사하고, 검사 전에 블록 행을 잠가 동시 변경을 차례로 검사한다.
-- 필터·연결 테이블의 TRUNCATE 는 행 트리거를 거치지 않으므로 거부한다. 큐레이션 전체 교체는 curation 행 DELETE(연쇄 삭제) 후 다시 넣는다.
CREATE FUNCTION require_curation_block_filters() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_block_ids UUID[] := '{}';
    v_block_id  UUID;
    v_type      VARCHAR(30);
BEGIN
    IF TG_OP = 'TRUNCATE' THEN
        RAISE EXCEPTION '% 은 TRUNCATE 하지 않는다. 큐레이션 교체는 curation 행을 DELETE 후 다시 넣는다.', TG_TABLE_NAME;
    END IF;
    IF current_setting('transaction_isolation') = 'repeatable read' THEN
        RAISE EXCEPTION '% 검사는 REPEATABLE READ 에서 동시 삭제를 놓친다. READ COMMITTED 또는 SERIALIZABLE 로 실행한다.', TG_TABLE_NAME;
    END IF;
    IF TG_TABLE_NAME = 'curation_block' THEN
        v_block_ids := ARRAY[NEW.id];
    ELSIF TG_OP = 'INSERT' THEN
        v_block_ids := ARRAY[NEW.block_id];
    ELSIF TG_OP = 'DELETE' THEN
        v_block_ids := ARRAY[OLD.block_id];
    ELSE
        v_block_ids := ARRAY[OLD.block_id, NEW.block_id];
    END IF;
    FOREACH v_block_id IN ARRAY v_block_ids LOOP
        CONTINUE WHEN v_block_id IS NULL;
        SELECT type INTO v_type FROM curation_block WHERE id = v_block_id FOR NO KEY UPDATE;
        CONTINUE WHEN NOT FOUND OR v_type <> 'PRODUCTS_BY_FILTER';
        IF NOT EXISTS (SELECT 1 FROM curation_block_filter f WHERE f.block_id = v_block_id) THEN
            RAISE EXCEPTION '필터형 제품 블록 % 에 필터가 없다.', v_block_id;
        END IF;
        IF EXISTS (SELECT 1 FROM curation_block_product bp
                   WHERE bp.block_id = v_block_id
                     AND NOT EXISTS (SELECT 1 FROM curation_block_product_filter pf
                                     WHERE pf.block_id = bp.block_id AND pf.product_id = bp.product_id)) THEN
            RAISE EXCEPTION '필터형 제품 블록 % 에 필터에 연결되지 않은 제품이 있다.', v_block_id;
        END IF;
    END LOOP;
    RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER tg_curation_block_require_filters AFTER INSERT OR UPDATE ON curation_block
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_curation_block_filters();
CREATE CONSTRAINT TRIGGER tg_curation_block_filter_keep_one AFTER DELETE OR UPDATE ON curation_block_filter
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_curation_block_filters();
CREATE CONSTRAINT TRIGGER tg_curation_block_product_require_filter AFTER INSERT OR UPDATE ON curation_block_product
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_curation_block_filters();
CREATE CONSTRAINT TRIGGER tg_curation_block_product_filter_keep_one AFTER DELETE OR UPDATE ON curation_block_product_filter
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_curation_block_filters();
CREATE TRIGGER tg_curation_block_filter_reject_truncate BEFORE TRUNCATE ON curation_block_filter
    FOR EACH STATEMENT EXECUTE FUNCTION require_curation_block_filters();
CREATE TRIGGER tg_curation_block_product_filter_reject_truncate BEFORE TRUNCATE ON curation_block_product_filter
    FOR EACH STATEMENT EXECUTE FUNCTION require_curation_block_filters();

CREATE TABLE product_daily_view (
    view_date  DATE   NOT NULL,
    product_id BIGINT NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_product_daily_view PRIMARY KEY (view_date, product_id),
    CONSTRAINT fk_product_daily_view_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_product_daily_view_count CHECK (view_count >= 0)
);

CREATE TABLE search_keyword (
    id               VARCHAR(100) NOT NULL,
    keyword          VARCHAR(100) NOT NULL,
    status           VARCHAR(10)  NOT NULL,
    ranking_eligible BOOLEAN      NOT NULL,
    CONSTRAINT pk_search_keyword PRIMARY KEY (id),
    CONSTRAINT ck_search_keyword_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE search_keyword_expression (
    expression_key VARCHAR(300) COLLATE "C" NOT NULL,
    keyword_id     VARCHAR(100) NOT NULL,
    CONSTRAINT pk_search_keyword_expression PRIMARY KEY (expression_key),
    CONSTRAINT fk_search_keyword_expression_keyword FOREIGN KEY (keyword_id) REFERENCES search_keyword (id) ON DELETE CASCADE
);

CREATE TABLE search_keyword_bucket (
    bucket_start TIMESTAMPTZ  NOT NULL,
    keyword_key  VARCHAR(300) COLLATE "C" NOT NULL,
    hit_count    BIGINT       NOT NULL,
    CONSTRAINT pk_search_keyword_bucket PRIMARY KEY (bucket_start, keyword_key),
    CONSTRAINT ck_search_keyword_bucket_count CHECK (hit_count > 0)
);

CREATE TABLE feedback (
    id                UUID          NOT NULL,
    subject_type      VARCHAR(30)   NOT NULL,
    content           VARCHAR(2000) NOT NULL,
    page_path         VARCHAR(500)  NULL,
    received_at       TIMESTAMPTZ   NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMPTZ   NOT NULL,
    completed_at      TIMESTAMPTZ   NULL,
    CONSTRAINT pk_feedback PRIMARY KEY (id),
    CONSTRAINT ck_feedback_subject_type CHECK (subject_type IN ('BUG_REPORT', 'IMPROVEMENT', 'OTHER')),
    CONSTRAINT ck_feedback_status CHECK (
        status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')
    ),
    CONSTRAINT ck_feedback_completed_at CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL)
        OR (status <> 'COMPLETED' AND completed_at IS NULL)
    )
);

CREATE TABLE feedback_image (
    image_id      UUID        NOT NULL,
    feedback_id   UUID        NOT NULL,
    display_order INT         NOT NULL,
    extension     VARCHAR(10) NOT NULL,
    CONSTRAINT pk_feedback_image PRIMARY KEY (image_id),
    CONSTRAINT ux_feedback_image_order UNIQUE (feedback_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_feedback_image_feedback FOREIGN KEY (feedback_id) REFERENCES feedback (id) ON DELETE CASCADE,
    CONSTRAINT ck_feedback_image_extension CHECK (extension IN ('jpg', 'png')),
    CONSTRAINT ck_feedback_image_order CHECK (display_order BETWEEN 0 AND 4)
);

CREATE TABLE product_correction_request (
    id                UUID          NOT NULL,
    product_id        BIGINT        NOT NULL,
    product_name      VARCHAR(300)  NOT NULL,
    content           VARCHAR(2000) NOT NULL,
    received_at       TIMESTAMPTZ   NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMPTZ   NOT NULL,
    completed_at      TIMESTAMPTZ   NULL,
    CONSTRAINT pk_product_correction_request PRIMARY KEY (id),
    CONSTRAINT fk_product_correction_request_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_product_correction_request_status CHECK (
        status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')
    ),
    CONSTRAINT ck_product_correction_request_completed_at CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL)
        OR (status <> 'COMPLETED' AND completed_at IS NULL)
    )
);

CREATE TABLE product_correction_request_image (
    image_id      UUID        NOT NULL,
    request_id    UUID        NOT NULL,
    display_order INT         NOT NULL,
    extension     VARCHAR(10) NOT NULL,
    CONSTRAINT pk_product_correction_request_image PRIMARY KEY (image_id),
    CONSTRAINT ux_product_correction_request_image_order UNIQUE (request_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_product_correction_request_image_request FOREIGN KEY (request_id) REFERENCES product_correction_request (id) ON DELETE CASCADE,
    CONSTRAINT ck_product_correction_request_image_extension CHECK (extension IN ('jpg', 'png')),
    CONSTRAINT ck_product_correction_request_image_order CHECK (display_order BETWEEN 0 AND 4)
);

CREATE TABLE product_request (
    id                UUID         NOT NULL,
    product_name      VARCHAR(200) NOT NULL,
    brand_name        VARCHAR(100) NULL,
    requested_at      TIMESTAMPTZ  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMPTZ  NOT NULL,
    completed_at      TIMESTAMPTZ  NULL,
    CONSTRAINT pk_product_request PRIMARY KEY (id),
    CONSTRAINT ck_product_request_status CHECK (
        status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')
    ),
    CONSTRAINT ck_product_request_completed_at CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL)
        OR (status <> 'COMPLETED' AND completed_at IS NULL)
    )
);

CREATE INDEX ix_product_daily_view_product ON product_daily_view (product_id, view_date);
-- 긴 본문은 btree 한 행 한계(약 2.7KB)를 넘을 수 있어 해시로 중복을 막는다.
CREATE UNIQUE INDEX ux_ingredient_tag_evidence_content ON ingredient_tag_evidence (ingredient_id, tag_id, md5(content));
CREATE UNIQUE INDEX ux_ingredient_source_content ON ingredient_source (ingredient_id, md5(content));
CREATE INDEX ix_ingredient_korean_name ON ingredient (korean_name, id);
-- 영문명 정확 조회(대소문자 무시)용. 로케일과 무관하게 A-Z 만 소문자로 바꾼다. 조회도 같은 식으로 해야 인덱스를 탄다.
CREATE INDEX ix_ingredient_english_name ON ingredient (translate(english_name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), id);
CREATE INDEX ix_product_category ON product (category_id, category_depth);
CREATE INDEX ix_product_ingredient_ingredient ON product_ingredient (ingredient_id);
CREATE INDEX ix_feedback_received_at ON feedback (received_at, id);
CREATE INDEX ix_product_correction_request_received_at ON product_correction_request (received_at, id);

-- ===================== 검색 =====================

-- 카탈로그 검색 함수와 파생 뷰. 스키마 전체를 한 트랜잭션으로 적용한다.
-- 대상 테이블(brand, product, ingredient, ingredient_alias, product_daily_view)은 schema.sql 이 만든다.
-- 카탈로그 적재 트랜잭션의 맨 끝에서 검색 뷰 3개를 이 순서로 갱신한다:
--   REFRESH MATERIALIZED VIEW product_search_document;
--   REFRESH MATERIALIZED VIEW ingredient_search_term;
--   REFRESH MATERIALIZED VIEW search_vocabulary;

-- pg_trgm 은 DB 의 LC_CTYPE 으로 글자를 판별한다. 로케일이 한글·자모를 단어 문자로 보지 않으면 한글 검색과 오타 교정이 조용히 실패하므로 즉시 중단한다.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
    IF current_setting('server_version_num')::int < 150000 THEN
        RAISE EXCEPTION 'preflight 실패: PostgreSQL 15 이상이 필요하다 (regexp_instr). 현재 %', current_setting('server_version');
    END IF;
    IF show_trgm('가나다') = '{}'::text[] THEN
        RAISE EXCEPTION 'preflight 실패: DB LC_CTYPE(%)이 한글 트라이그램을 만들지 못한다. UTF-8 로케일로 DB 를 만든다.',
            (SELECT datctype FROM pg_database WHERE datname = current_database());
    END IF;
    IF show_trgm(normalize('가나다', NFD)) = '{}'::text[] THEN
        RAISE EXCEPTION 'preflight 실패: DB LC_CTYPE(%)이 한글 자모(NFD) 트라이그램을 만들지 못한다. 오타 교정(search_jamo)이 조용히 꺼진다.',
            (SELECT datctype FROM pg_database WHERE datname = current_database());
    END IF;
END
$$;

-- 검색 정규화 규칙은 아래 함수만 소유한다. 문자 범위와 영문 소문자화(A-Z → a-z)를 직접 지정해 로케일과 무관하게 동작한다.
-- lower() 는 쓰지 않는다. 터키어 로케일에서 I 를 ı 로 바꿔 영문 검색이 깨진다. 전각 영문·숫자(ＰＤＲＮ)는 ASCII 로 1:1 바꾼다(NFKC 는 호환 자모를 바꿔 쓰지 않는다). 정의를 바꾸면 검색 문서 뷰를 REFRESH 한다.
CREATE FUNCTION search_norm(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN regexp_replace(
        translate(normalize(t, NFC), 'ABCDEFGHIJKLMNOPQRSTUVWXYZＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ', 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'),
        '[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]+', '', 'g');

CREATE FUNCTION search_chosung(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN (
        SELECT coalesce(string_agg(
            CASE WHEN ascii(c) BETWEEN 44032 AND 55203
                THEN substr('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', (ascii(c) - 44032) / 588 + 1, 1)
                ELSE c END, '' ORDER BY i), '')
        FROM unnest(string_to_array(search_norm(t), NULL)) WITH ORDINALITY AS u(c, i)
    );

CREATE FUNCTION search_chosung_query(q text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN CASE q WHEN 'ㄱ' THEN '[ㄱㄲ]' WHEN 'ㄷ' THEN '[ㄷㄸ]'
                  WHEN 'ㅂ' THEN '[ㅂㅃ]' WHEN 'ㅅ' THEN '[ㅅㅆ]'
                  WHEN 'ㅈ' THEN '[ㅈㅉ]' ELSE q END;

-- 오타 교정 전용 자모 형태. 흔히 헷갈리는 모음(ㅐ/ㅔ, ㅒ/ㅖ, ㅙ/ㅚ/ㅞ)을 하나로 합쳐 스내일 → 스네일 같은 오타가 기준 유사도를 넘게 한다.
-- 검색 판정·일치 구간에는 쓰지 않는다.
CREATE FUNCTION search_jamo(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN translate(normalize(search_norm(t), NFD), 'ᅢᅤᅫᅬㅐㅒㅙㅚ', 'ᅦᅨᅰᅰㅔㅖㅞㅞ');

-- 정규화된 문자열의 영문 구간을 낱자 읽기로 바꾼다 (pdrn → 피디알엔).
CREATE FUNCTION search_read_latin(n text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN (
        SELECT coalesce(string_agg(
            CASE WHEN r.m[1] ~ '^[a-z]{1,4}$' THEN (
                SELECT string_agg((ARRAY['에이','비','씨','디','이','에프','지','에이치','아이','제이','케이','엘','엠',
                                         '엔','오','피','큐','알','에스','티','유','브이','더블유','엑스','와이','제트'])[ascii(u.c) - 96],
                                  '' ORDER BY u.i)
                FROM unnest(string_to_array(r.m[1], NULL)) WITH ORDINALITY AS u(c, i))
            ELSE r.m[1] END, '' ORDER BY r.ord), '')
        FROM regexp_matches(n, '[a-z]+|[^a-z]+', 'g') WITH ORDINALITY AS r(m, ord)
    );

-- 질의(또는 토큰)의 읽기 형태. 영문 한 글자뿐인 질의는 읽지 않는다. E 를 '이'로 읽으면 '이'가 든 거의 모든 이름과 맞는다.
-- 한글·숫자와 붙은 한 글자(비타민c → 비타민씨, b5 → 비5)는 읽는다.
CREATE FUNCTION search_read_query(n text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN CASE WHEN n ~ '^[a-z]$' THEN n ELSE search_read_latin(n) END;

-- 이름의 읽기 형태. 한글 음절이 없는 이름(Dr.G, glycerin)은 낱말로 보고 읽지 않는다.
CREATE FUNCTION search_reading_name(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN CASE WHEN search_norm(t) ~ '[가-힣]' THEN search_read_latin(search_norm(t)) ELSE search_norm(t) END;


-- 검색 뷰 3개(product_search_document → ingredient_search_term → search_vocabulary)는 적재 트랜잭션의 맨 끝, 모든 카탈로그 쓰기 뒤에 갱신한다.
-- 갱신은 배타 잠금을 사용하므로 모든 카탈로그 쓰기가 끝난 뒤 실행한다.
-- 검색 문서. 원천 테이블에서 파생된다. 카탈로그 적재와 같은 트랜잭션 안에서 REFRESH MATERIALIZED VIEW(CONCURRENTLY 아님)로 갱신해
-- 카탈로그와 검색 문서가 함께 커밋되게 한다. 갱신 중에는 검색 읽기가 잠금 대기한다.
-- 합친 문서(doc_*)는 후보 수집에만 쓴다. 등급과 토큰 판정은 제품명·브랜드 한글명·브랜드 영문명 필드 안에서만 계산한다.
CREATE MATERIALIZED VIEW product_search_document AS
SELECT p.id                                AS product_id,
       p.brand_id                          AS brand_id,
       p.product_name                      AS product_name,
       b.korean_name                       AS brand_korean_name,
       b.english_name                      AS brand_english_name,
       search_norm(p.product_name)         AS product_norm,
       search_reading_name(p.product_name) AS product_read,
       search_chosung(search_reading_name(p.product_name)) AS product_chosung,
       search_norm(b.korean_name)          AS brand_norm,
       search_reading_name(b.korean_name)  AS brand_read,
       search_chosung(search_reading_name(b.korean_name))  AS brand_chosung,
       search_norm(b.english_name)         AS brand_english_norm,
       search_norm(b.korean_name || coalesce(b.english_name, '') || p.product_name) AS doc_norm,
       search_reading_name(b.korean_name) || coalesce(search_reading_name(b.english_name), '')
           || search_reading_name(p.product_name) AS doc_read,
       search_chosung(search_reading_name(b.korean_name) || search_reading_name(p.product_name)) AS doc_chosung
FROM product p
JOIN brand b ON b.id = p.brand_id;

CREATE INDEX ix_product_search_document_norm ON product_search_document USING gin (doc_norm gin_trgm_ops);
CREATE INDEX ix_product_search_document_read ON product_search_document USING gin (doc_read gin_trgm_ops);
CREATE INDEX ix_product_search_document_chosung ON product_search_document USING gin (doc_chosung gin_trgm_ops);

-- read 는 이름에 낱자 읽기할 영문 구간이 있을 때만 값이 있고, 없으면 NULL 이다(대부분의 성분명).
CREATE MATERIALIZED VIEW ingredient_search_term AS
SELECT t.ingredient_id, t.field, t.source_order, t.text,
       search_norm(t.text) AS norm,
       nullif(search_reading_name(t.text), search_norm(t.text)) AS read,
       search_chosung(search_reading_name(t.text)) AS chosung
FROM (
    SELECT id AS ingredient_id, 'KOREAN_NAME' AS field, 0 AS source_order, korean_name AS text FROM ingredient
    UNION ALL
    SELECT id, 'ENGLISH_NAME', 0, english_name FROM ingredient WHERE english_name IS NOT NULL
    UNION ALL
    SELECT ingredient_id, 'ALIAS', display_order, alias FROM ingredient_alias
) t;

CREATE INDEX ix_ingredient_search_term_norm ON ingredient_search_term USING gin (norm gin_trgm_ops);
CREATE INDEX ix_ingredient_search_term_read ON ingredient_search_term USING gin (read gin_trgm_ops);
CREATE INDEX ix_ingredient_search_term_chosung ON ingredient_search_term USING gin (chosung gin_trgm_ops);

-- 오타 교정 후보 어휘. 제품 검색(PRODUCT)은 브랜드명·제품명 단어, 성분 검색(INGREDIENT)은 성분 한글명·이명·영문명 단어로 교정한다.
-- 같은 정규화 값은 가장 흔한 표기 하나로 묶는다. 토큰이 이미 이름에 있는지는 어휘가 아니라 검색 문서로 확인한다.
CREATE MATERIALIZED VIEW search_vocabulary AS
SELECT t.domain,
       search_norm(t.term)                                        AS norm,
       mode() WITHIN GROUP (ORDER BY t.term COLLATE "C")          AS term,
       search_jamo(mode() WITHIN GROUP (ORDER BY t.term COLLATE "C")) AS jamo,
       count(*)                                                   AS frequency
FROM (
    SELECT 'PRODUCT' AS domain, korean_name AS term FROM brand
    UNION ALL SELECT 'PRODUCT', english_name FROM brand WHERE english_name IS NOT NULL
    UNION ALL SELECT 'PRODUCT', w FROM product, regexp_split_to_table(product_name, U&'[[:space:]\0085\00a0\1680\2000-\200a\2028\2029\202f\205f\3000]+') AS w
    UNION ALL SELECT 'INGREDIENT', korean_name FROM ingredient
    UNION ALL SELECT 'INGREDIENT', alias FROM ingredient_alias
    UNION ALL SELECT 'INGREDIENT', w FROM ingredient, regexp_split_to_table(english_name, U&'[[:space:]\0085\00a0\1680\2000-\200a\2028\2029\202f\205f\3000]+') AS w
) t
WHERE length(search_norm(t.term)) >= 2
GROUP BY t.domain, search_norm(t.term);

CREATE INDEX ix_search_vocabulary_jamo ON search_vocabulary USING gin (jamo gin_trgm_ops);

-- 질의를 공백 토큰으로 나눈다. 원문·정규화·읽기·자모와 초성 전용 여부를 함께 돌려준다.
-- 중복 토큰은 처음 것만 남긴다. 뒤쪽 토큰을 버리면 전체 토큰 일치 조건이 달라진다.
CREATE FUNCTION search_query_tokens(p_query text)
    RETURNS TABLE (ord int, raw text, norm text, read text, jamo text, is_chosung boolean, chosung_contains text)
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT u.ord::int, u.tok, u.n, search_read_query(u.n), search_jamo(u.tok),
           u.n ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$',
           '%' || search_chosung_query(u.n) || '%'
    FROM (
        SELECT DISTINCT ON (search_norm(t.tok)) t.ord, t.tok, search_norm(t.tok) AS n
        FROM regexp_split_to_table(p_query, U&'[[:space:]\0085\00a0\1680\2000-\200a\2028\2029\202f\205f\3000]+') WITH ORDINALITY AS t(tok, ord)
        WHERE search_norm(t.tok) <> ''
        ORDER BY search_norm(t.tok), t.ord
    ) u
    ORDER BY u.ord
$$;

-- 오타 교정. 해당 검색 대상 이름 어디에도 포함되지 않는 세 글자 이상 토큰만 자모 유사도(0.5 이상)가 가장 높은 어휘로 바꾼다.
-- 초성 토큰과 교정 후보가 없는 토큰은 원문 그대로 둔다.
CREATE FUNCTION search_correct_query(p_query text, p_domain text) RETURNS text
    LANGUAGE sql STABLE
    SET pg_trgm.similarity_threshold = 0.5
AS $$
    WITH t AS MATERIALIZED (
        SELECT tok.*,
               tok.is_chosung
               OR length(tok.norm) < 3
               OR (p_domain = 'PRODUCT' AND EXISTS (
                      SELECT 1 FROM product_search_document d
                      WHERE d.product_norm LIKE '%' || tok.norm || '%' OR d.product_read LIKE '%' || tok.read || '%'
                         OR d.brand_norm LIKE '%' || tok.norm || '%' OR d.brand_read LIKE '%' || tok.read || '%'
                         OR d.brand_english_norm LIKE '%' || tok.norm || '%'))
               OR (p_domain = 'INGREDIENT' AND (
                      EXISTS (SELECT 1 FROM ingredient_search_term e WHERE e.norm LIKE '%' || tok.norm || '%')
                      OR EXISTS (SELECT 1 FROM ingredient_search_term e WHERE e.read LIKE '%' || tok.read || '%')
                      OR EXISTS (SELECT 1 FROM ingredient_search_term e WHERE e.read IS NULL AND e.norm LIKE '%' || tok.read || '%'))) AS keep
        FROM search_query_tokens(p_query) tok
    )
    SELECT string_agg(coalesce(c.term, t.raw), ' ' ORDER BY t.ord)
    FROM t
    LEFT JOIN LATERAL (
        SELECT v.term
        FROM search_vocabulary v
        WHERE NOT t.keep AND v.domain = p_domain AND v.jamo % t.jamo
        ORDER BY similarity(v.jamo, t.jamo) DESC, v.frequency DESC, v.norm COLLATE "C"
        LIMIT 1
    ) c ON true
$$;

-- 정규화된 질의를 원문에서 찾는 정규식. 글자 사이에는 정규화가 지우는 문자(공백·기호 등)만 끼어도 된다. 초성은 그 초성으로 시작하는 음절 범위로 바꾼다.
-- 초성은 호환 자모(ㄱ), 조합형 초성(ᄀ), 그 초성의 음절 범위(가~깋)를 모두 받는다.
CREATE FUNCTION search_match_pattern(q text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN (
        SELECT string_agg(
            CASE WHEN strpos('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', u.c) > 0 THEN
                '[' || CASE WHEN length(q) = 1 THEN
                    CASE u.c WHEN 'ㄱ' THEN 'ㄲᄁ까-낗' WHEN 'ㄷ' THEN 'ㄸᄄ따-띻'
                             WHEN 'ㅂ' THEN 'ㅃᄈ빠-삫' WHEN 'ㅅ' THEN 'ㅆᄊ싸-앃'
                             WHEN 'ㅈ' THEN 'ㅉᄍ짜-찧' ELSE '' END ELSE '' END
                    || u.c || chr(4351 + strpos('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', u.c))
                    || chr(44032 + 588 * (strpos('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', u.c) - 1)) || '-' || chr(44032 + 588 * strpos('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', u.c) - 1)
                    || ']'
            ELSE u.c END,
            '[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣᄀ-ᄒ]*' ORDER BY u.i)
        FROM unnest(string_to_array(q, NULL)) WITH ORDINALITY AS u(c, i)
    );

-- 문자 위치를 UTF-16 위치로 바꾼다. 앞쪽에 있는 보조 평면 문자(U+10000 이상)는 UTF-16 에서 두 칸을 차지한다.
CREATE FUNCTION search_utf16_index(p_text text, p_char_index int) RETURNS int
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN p_char_index + (
        SELECT count(*)::int FROM unnest(string_to_array(left(p_text, p_char_index), NULL)) AS c WHERE ascii(c) > 65535
    );

-- 원문에서 검색이 채택한 조각(match_query)이 일치한 구간 [시작, 끝) 을 0부터 세는 UTF-16 위치로 돌려준다.
-- API 의 startIndex, endIndexExclusive 와 같은 단위다. 원문을 다시 추측하지 않고 조각의 원형과 라틴 읽기 형태만 찾는다.
-- 원문의 영문 구간을 낱자 읽기로 펼친 문자열에서 찾고 원문 위치로 되돌리므로 '피디알엔'으로 'PDRN' 구간을 찾는다.
CREATE FUNCTION search_match_range(p_text text, p_piece text) RETURNS int[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    WITH seg AS (
        SELECT r.m[1] AS s, r.ord,
               coalesce(sum(length(r.m[1])) OVER (ORDER BY r.ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS offs
        FROM regexp_matches(translate(p_text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９', 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789'), '[a-z]+|[^a-z]+', 'g') WITH ORDINALITY AS r(m, ord)
    ),
    expanded AS (
        SELECT forms.form, x.c, x.orig, row_number() OVER (PARTITION BY forms.form ORDER BY seg.ord, x.i, x.j) AS pos
        FROM seg
        CROSS JOIN (VALUES (0), (1)) AS forms(form)
        CROSS JOIN LATERAL (
            SELECT u.i, k.j, k.c, seg.offs + u.i - 1 AS orig
            FROM unnest(string_to_array(seg.s, NULL)) WITH ORDINALITY AS u(c0, i)
            CROSS JOIN LATERAL unnest(string_to_array(
                CASE WHEN forms.form = 1 AND p_text ~ '[가-힣]' AND seg.s ~ '^[a-z]{1,4}$'
                     THEN (ARRAY['에이','비','씨','디','이','에프','지','에이치','아이','제이','케이','엘','엠','엔','오','피','큐','알','에스','티','유','브이','더블유','엑스','와이','제트'])[ascii(u.c0) - 96]
                     ELSE u.c0 END, NULL)) WITH ORDINALITY AS k(c, j)
        ) x
    ),
    target AS (
        SELECT form, string_agg(c, '' ORDER BY pos) AS t, array_agg(orig ORDER BY pos) AS origs
        FROM expanded GROUP BY form
    ),
    needles AS (
        SELECT 0 AS form, search_norm(p_piece) AS q
        UNION ALL SELECT 1, search_read_query(search_norm(p_piece))
    )
    SELECT ARRAY[search_utf16_index(p_text, (tg.origs[regexp_instr(tg.t, search_match_pattern(n.q))])::int),
                 search_utf16_index(p_text, (tg.origs[regexp_instr(tg.t, search_match_pattern(n.q), 1, 1, 1) - 1] + 1)::int)]
    FROM target tg
    CROSS JOIN needles n
    WHERE n.q <> '' AND regexp_instr(tg.t, search_match_pattern(n.q)) > 0
    ORDER BY n.form, tg.form
    LIMIT 1
$$;

-- 제품 검색 결과 한 행.
CREATE TYPE product_search_hit AS (
    product_id   bigint,
    tier         smallint,
    token_ratio  real,
    recent_views bigint,
    name_length  int,
    match_field  text,
    match_text   text,
    match_query  text
);

-- 제품 검색 본체. tier 0 완전 일치, 1 앞부분 일치, 2 포함 또는 모든 토큰 포함, 3 일부 토큰 포함.
CREATE FUNCTION search_products_core(p_query text)
    RETURNS SETOF product_search_hit
    LANGUAGE sql STABLE
AS $$
    WITH q AS (
        SELECT search_norm(p_query) AS n, search_read_query(search_norm(p_query)) AS r,
               search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung,
               search_chosung_query(search_norm(p_query)) AS chosung_exact,
               search_chosung_query(search_norm(p_query)) || '%' AS chosung_prefix,
               '%' || search_chosung_query(search_norm(p_query)) || '%' AS chosung_contains,
               (SELECT count(*) FROM search_query_tokens(p_query)) AS token_count
    ),
    tokens AS (
        SELECT * FROM search_query_tokens(p_query)
    ),
    -- 공백 없이 붙여 쓴 브랜드+제품(또는 제품+브랜드) 질의. 질의를 한 곳에서 나눠 한 조각은 브랜드명(한글·읽기·영문, 초성 질의는 초성)과
    -- 완전 일치 또는 두 글자 이상 접두 일치하고, 나머지 조각은 제품명에 포함돼야 한다.
    -- 브랜드명과 제품명을 이어 붙인 경계에서만 맞는 문자열(닥터지 블랙 → 지블)은 인정하지 않는다.
    split AS (
        SELECT left(q.n, g.i) AS head, substr(q.n, g.i + 1) AS tail
        FROM q, generate_series(1, length(q.n) - 1) AS g(i)
        WHERE q.token_count = 1
    ),
    brand_split AS (
        SELECT b.brand_id, sp.tail AS product_part
        FROM (SELECT DISTINCT brand_id, brand_norm, brand_read, brand_english_norm, brand_chosung FROM product_search_document) b,
             split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.head
                         OR (length(sp.head) >= 2 AND b.brand_chosung LIKE sp.head || '%')
                     ELSE sp.head IN (b.brand_norm, b.brand_read, b.brand_english_norm)
                         OR (length(sp.head) >= 2 AND (b.brand_norm LIKE sp.head || '%'
                             OR b.brand_read LIKE sp.head || '%' OR b.brand_english_norm LIKE sp.head || '%')) END
        UNION
        SELECT b.brand_id, sp.head
        FROM (SELECT DISTINCT brand_id, brand_norm, brand_read, brand_english_norm, brand_chosung FROM product_search_document) b,
             split sp, q
        WHERE CASE WHEN q.is_chosung THEN b.brand_chosung = sp.tail
                         OR (length(sp.tail) >= 2 AND b.brand_chosung LIKE sp.tail || '%')
                     ELSE sp.tail IN (b.brand_norm, b.brand_read, b.brand_english_norm)
                         OR (length(sp.tail) >= 2 AND (b.brand_norm LIKE sp.tail || '%'
                             OR b.brand_read LIKE sp.tail || '%' OR b.brand_english_norm LIKE sp.tail || '%')) END
    ),
    combined AS (
        SELECT DISTINCT ON (d.product_id) d.product_id, bs.product_part
        FROM brand_split bs
        JOIN product_search_document d ON d.brand_id = bs.brand_id
        CROSS JOIN q
        WHERE CASE WHEN q.is_chosung THEN d.product_chosung LIKE '%' || bs.product_part || '%'
                   ELSE d.product_norm LIKE '%' || bs.product_part || '%' OR d.product_read LIKE '%' || bs.product_part || '%'
                        OR d.product_read LIKE '%' || search_read_query(bs.product_part) || '%' END
        ORDER BY d.product_id, length(bs.product_part) DESC, bs.product_part COLLATE "C"
    ),
    candidate AS (
        SELECT d.product_id FROM product_search_document d, q
        WHERE q.n <> '' AND (d.doc_norm LIKE '%' || q.n || '%' OR d.doc_read LIKE '%' || q.r || '%')
        UNION
        SELECT c.product_id FROM combined c
        UNION
        SELECT c.product_id FROM tokens t CROSS JOIN LATERAL (
            SELECT d.product_id FROM product_search_document d WHERE d.doc_norm LIKE '%' || t.norm || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE d.doc_read LIKE '%' || t.read || '%'
            UNION
            SELECT d.product_id FROM product_search_document d WHERE t.is_chosung AND d.doc_chosung SIMILAR TO t.chosung_contains
        ) c
    ),
    scored AS (
        SELECT d.*, q.token_count,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN d.product_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN d.product_chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN d.product_chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN d.product_norm IN (q.n, q.r) OR d.product_read IN (q.n, q.r) THEN 0
                        WHEN d.product_norm LIKE q.n || '%' OR d.product_norm LIKE q.r || '%' OR d.product_read LIKE q.n || '%' OR d.product_read LIKE q.r || '%' THEN 1
                        WHEN d.product_norm LIKE '%' || q.n || '%' OR d.product_norm LIKE '%' || q.r || '%' OR d.product_read LIKE '%' || q.n || '%' OR d.product_read LIKE '%' || q.r || '%' THEN 2
                        ELSE 9 END
               END AS product_tier,
               CASE WHEN q.is_chosung THEN
                   CASE WHEN d.brand_chosung SIMILAR TO q.chosung_exact THEN 0 WHEN d.brand_chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN d.brand_chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN d.brand_norm IN (q.n, q.r) OR d.brand_read IN (q.n, q.r) THEN 0
                        WHEN d.brand_norm LIKE q.n || '%' OR d.brand_norm LIKE q.r || '%' OR d.brand_read LIKE q.n || '%' OR d.brand_read LIKE q.r || '%' THEN 1
                        WHEN d.brand_norm LIKE '%' || q.n || '%' OR d.brand_norm LIKE '%' || q.r || '%' OR d.brand_read LIKE '%' || q.n || '%' OR d.brand_read LIKE '%' || q.r || '%' THEN 2
                        ELSE 9 END
               END AS brand_tier,
               CASE WHEN d.brand_english_norm IN (q.n, q.r) THEN 0
                    WHEN d.brand_english_norm LIKE q.n || '%' OR d.brand_english_norm LIKE q.r || '%' THEN 1
                    WHEN d.brand_english_norm LIKE '%' || q.n || '%' OR d.brand_english_norm LIKE '%' || q.r || '%' THEN 2
                    ELSE 9 END AS english_tier,
               (SELECT count(*) FROM tokens t
                WHERE d.product_norm LIKE '%' || t.norm || '%' OR d.product_read LIKE '%' || t.read || '%'
                   OR d.brand_norm LIKE '%' || t.norm || '%' OR d.brand_read LIKE '%' || t.read || '%'
                   OR d.brand_english_norm LIKE '%' || t.norm || '%'
                   OR (t.is_chosung AND (d.product_chosung SIMILAR TO t.chosung_contains
                                         OR d.brand_chosung SIMILAR TO t.chosung_contains))) AS matched,
               cb.product_id IS NOT NULL AS combined,
               cb.product_part AS combined_part,
               q.n AS whole_query,
               (SELECT t.norm FROM tokens t WHERE (d.product_norm LIKE '%' || t.norm || '%' OR d.product_read LIKE '%' || t.read || '%' OR (t.is_chosung AND d.product_chosung SIMILAR TO t.chosung_contains)) ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS product_token,
               (SELECT t.norm FROM tokens t WHERE (d.brand_norm LIKE '%' || t.norm || '%' OR d.brand_read LIKE '%' || t.read || '%' OR (t.is_chosung AND d.brand_chosung SIMILAR TO t.chosung_contains)) ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS brand_token,
               (SELECT t.norm FROM tokens t WHERE (d.brand_english_norm LIKE '%' || t.norm || '%') ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS english_token
        FROM candidate c
        JOIN product_search_document d ON d.product_id = c.product_id
        LEFT JOIN combined cb ON cb.product_id = d.product_id
        CROSS JOIN q
    )
    SELECT s.product_id,
           least(s.product_tier, s.brand_tier, s.english_tier,
                 CASE WHEN s.combined THEN 2 ELSE 9 END,
                 CASE WHEN s.matched = s.token_count THEN 2 WHEN s.matched > 0 THEN 3 ELSE 9 END)::smallint,
           CASE WHEN s.combined THEN 1 ELSE s.matched::real / s.token_count END::real,
           coalesce((SELECT sum(v.view_count) FROM product_daily_view v
                     WHERE v.product_id = s.product_id
                       AND v.view_date > (now() AT TIME ZONE 'Asia/Seoul')::date - 30
                       AND v.view_date <= (now() AT TIME ZONE 'Asia/Seoul')::date), 0)::bigint,
           length(s.product_norm),
           CASE WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                    CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN 'PRODUCT_NAME' ELSE 'BRAND_NAME' END
                WHEN s.combined OR s.product_token IS NOT NULL THEN 'PRODUCT_NAME'
                ELSE 'BRAND_NAME' END,
           CASE WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN
                    CASE WHEN s.product_tier <= least(s.brand_tier, s.english_tier) THEN s.product_name
                         WHEN s.brand_tier <= s.english_tier THEN s.brand_korean_name
                         ELSE s.brand_english_name END
                WHEN s.combined OR s.product_token IS NOT NULL THEN s.product_name
                WHEN s.brand_token IS NOT NULL THEN s.brand_korean_name
                ELSE s.brand_english_name END,
           CASE WHEN least(s.product_tier, s.brand_tier, s.english_tier) < 9 THEN s.whole_query
                WHEN s.combined THEN s.combined_part
                WHEN s.product_token IS NOT NULL THEN s.product_token
                WHEN s.brand_token IS NOT NULL THEN s.brand_token
                ELSE s.english_token END
    FROM scored s
    WHERE s.matched > 0 OR s.combined OR least(s.product_tier, s.brand_tier, s.english_tier) < 9
$$;

-- 제품 검색 한 페이지. 검색 본체를 한 번만 실행해 전체 건수, 모든 토큰이 맞은 결과(tier 2 이하) 유무, 페이지 결과를 함께 만든다.
-- 결과는 배열로 모으지 않고 materialized CTE(작업 메모리를 넘으면 디스크로 내려간다)에 두고, 페이지는 상위 N 정렬로 자른다.
-- 일치 구간은 페이지를 자를 때(p_limit 이 있을 때)만 페이지 행에 대해 계산한다.
CREATE FUNCTION search_products_page(p_query text, p_offset int, p_limit int, p_max_tier int)
    RETURNS TABLE (total bigint, has_full_match boolean, items jsonb)
    LANGUAGE sql STABLE
AS $$
    WITH h AS MATERIALIZED (
        SELECT * FROM search_products_core(p_query)
    ),
    page AS (
        SELECT h.*
        FROM h
        WHERE h.tier <= p_max_tier
        ORDER BY h.tier, h.token_ratio DESC, h.recent_views DESC, h.name_length, h.product_id
        OFFSET p_offset LIMIT p_limit
    )
    SELECT (SELECT count(*) FROM h WHERE h.tier <= p_max_tier),
           coalesce((SELECT bool_or(h.tier <= 2) FROM h), false),
           coalesce((
               SELECT jsonb_agg(jsonb_build_object(
                          'productId', r.product_id, 'rank', r.rank, 'tier', r.tier, 'tokenRatio', r.token_ratio,
                          'recentViews', r.recent_views, 'matchField', r.match_field, 'matchText', r.match_text,
                          'matchRange', CASE WHEN p_limit IS NOT NULL THEN to_jsonb(search_match_range(r.match_text, r.match_query)) END)
                      ORDER BY r.rank)
               FROM (SELECT page.*, p_offset + row_number() OVER (
                                 ORDER BY page.tier, page.token_ratio DESC, page.recent_views DESC, page.name_length, page.product_id) AS rank
                     FROM page) r
           ), '[]'::jsonb)
$$;

-- 제품 검색. 한 행으로 전체 건수(total), 교정한 질의(corrected_query), 요청한 페이지의 결과(items)를 돌려준다. 빈 페이지여도 total 과 교정어가 온다.
-- 모든 토큰이 맞은 결과(tier 2 이하)가 없으면 오타를 교정한 질의로 다시 찾고, 교정한 질의에 결과가 있으면 그 결과를 쓴다.
-- 교정은 어느 이름에도 없는 토큰만 바꾸므로, 바뀐 질의는 원래보다 맞는 토큰이 늘어난다(성분처럼 토큰마다 다른 대상을 가리켜 전체 일치가 없는 질의도 교정한다).
-- p_limit 이 NULL 이면 전체를 돌려주고 일치 구간은 계산하지 않는다(제품 목록처럼 검색을 필터로만 쓰는 경우).
-- p_max_tier 이하 결과만 돌려준다. 제품 목록 필터는 2(질의 전체 또는 모든 토큰이 맞은 제품)를 쓴다. 제안·성분 검색은 기본 3.
-- items 원소: productId, rank(1부터), tier, tokenRatio, recentViews, matchField, matchText, matchRange([시작, 끝) UTF-16 위치).
CREATE FUNCTION search_products(p_query text, p_offset int DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3)
    RETURNS TABLE (total bigint, corrected_query text, items jsonb)
    LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_page record;
    v_corrected_page record;
    v_corrected text;
BEGIN
    IF p_offset IS NULL OR p_offset < 0 OR p_limit < 1 OR p_max_tier IS NULL OR p_max_tier NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION '페이지 조건이 올바르지 않다 (offset %, limit %, max_tier %).', p_offset, p_limit, p_max_tier;
    END IF;

    SELECT * INTO v_page FROM search_products_page(p_query, p_offset, p_limit, p_max_tier);

    IF NOT v_page.has_full_match THEN
        v_corrected := search_correct_query(p_query, 'PRODUCT');
        IF search_norm(v_corrected) <> search_norm(p_query) THEN
            SELECT * INTO v_corrected_page FROM search_products_page(v_corrected, p_offset, p_limit, p_max_tier);
            IF v_corrected_page.total > 0 THEN
                RETURN QUERY SELECT v_corrected_page.total, v_corrected, v_corrected_page.items;
                RETURN;
            END IF;
        END IF;
    END IF;

    RETURN QUERY SELECT v_page.total, NULL::text, v_page.items;
END
$$;

-- 성분 검색 결과 한 행.
CREATE TYPE ingredient_search_hit AS (
    ingredient_id  bigint,
    field          text,
    source_order   int,
    text           text,
    tier           smallint,
    token_ratio    real,
    field_priority int,
    name_length    int,
    match_query    text
);

-- 성분 검색 본체. 성분마다 가장 잘 맞은 이름 하나(한글명, 영문명, 이명)를 고른다.
-- 토큰이 하나면 질의 전체 조회와 같으므로 토큰별 원형·읽기 조회를 생략한다.
CREATE FUNCTION search_ingredients_core(p_query text)
    RETURNS SETOF ingredient_search_hit
    LANGUAGE sql STABLE
AS $$
    WITH q AS (
        SELECT search_norm(p_query) AS n, search_read_query(search_norm(p_query)) AS r,
               search_norm(p_query) ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' AS is_chosung,
               search_chosung_query(search_norm(p_query)) AS chosung_exact,
               search_chosung_query(search_norm(p_query)) || '%' AS chosung_prefix,
               '%' || search_chosung_query(search_norm(p_query)) || '%' AS chosung_contains,
               (SELECT count(*) FROM search_query_tokens(p_query)) AS token_count
    ),
    tokens AS (
        SELECT * FROM search_query_tokens(p_query)
    ),
    candidate AS (
        SELECT s.ingredient_id, s.field, s.source_order FROM ingredient_search_term s, q
        WHERE q.n <> ''
          AND (s.norm LIKE '%' || q.n || '%'
               OR s.read LIKE '%' || q.r || '%'
               OR (q.r <> q.n AND s.read IS NULL AND s.norm LIKE '%' || q.r || '%'))
        UNION
        SELECT c.ingredient_id, c.field, c.source_order FROM tokens t CROSS JOIN q CROSS JOIN LATERAL (
            SELECT s.ingredient_id, s.field, s.source_order FROM ingredient_search_term s
            WHERE q.token_count > 1 AND s.norm LIKE '%' || t.norm || '%'
            UNION
            SELECT s.ingredient_id, s.field, s.source_order FROM ingredient_search_term s
            WHERE q.token_count > 1 AND s.read LIKE '%' || t.read || '%'
            UNION
            SELECT s.ingredient_id, s.field, s.source_order FROM ingredient_search_term s
            WHERE q.token_count > 1 AND t.read <> t.norm AND s.read IS NULL AND s.norm LIKE '%' || t.read || '%'
            UNION
            SELECT s.ingredient_id, s.field, s.source_order FROM ingredient_search_term s
            WHERE t.is_chosung AND s.field <> 'ENGLISH_NAME' AND s.chosung SIMILAR TO t.chosung_contains
        ) c
    ),
    scored AS (
        SELECT s.ingredient_id, s.field, s.source_order, s.text, s.norm, q.token_count,
               CASE WHEN q.is_chosung AND s.field <> 'ENGLISH_NAME' THEN
                   CASE WHEN s.chosung SIMILAR TO q.chosung_exact THEN 0 WHEN s.chosung SIMILAR TO q.chosung_prefix THEN 1
                        WHEN s.chosung SIMILAR TO q.chosung_contains THEN 2 ELSE 9 END
               ELSE
                   CASE WHEN s.norm IN (q.n, q.r) OR s.read IN (q.n, q.r) THEN 0
                        WHEN s.norm LIKE q.n || '%' OR s.norm LIKE q.r || '%' OR s.read LIKE q.n || '%' OR s.read LIKE q.r || '%' THEN 1
                        WHEN s.norm LIKE '%' || q.n || '%' OR s.norm LIKE '%' || q.r || '%' OR s.read LIKE '%' || q.n || '%' OR s.read LIKE '%' || q.r || '%' THEN 2
                        ELSE 9 END
               END AS whole_tier,
               (SELECT count(*) FROM tokens t
                WHERE s.norm LIKE '%' || t.norm || '%'
                   OR s.read LIKE '%' || t.read || '%'
                   OR (s.read IS NULL AND t.read <> t.norm AND s.norm LIKE '%' || t.read || '%')
                   OR (t.is_chosung AND s.field <> 'ENGLISH_NAME' AND s.chosung SIMILAR TO t.chosung_contains)) AS matched,
               q.n AS whole_query,
               (SELECT t.norm FROM tokens t
                WHERE s.norm LIKE '%' || t.norm || '%'
                   OR s.read LIKE '%' || t.read || '%'
                   OR (s.read IS NULL AND t.read <> t.norm AND s.norm LIKE '%' || t.read || '%')
                   OR (t.is_chosung AND s.field <> 'ENGLISH_NAME' AND s.chosung SIMILAR TO t.chosung_contains)
                ORDER BY length(t.norm) DESC, t.ord LIMIT 1) AS token_piece
        FROM candidate c
        JOIN ingredient_search_term s USING (ingredient_id, field, source_order)
        CROSS JOIN q
    ),
    ranked AS (
        SELECT s.ingredient_id, s.field, s.source_order, s.text,
               least(s.whole_tier, CASE WHEN s.matched = s.token_count THEN 2 WHEN s.matched > 0 THEN 3 ELSE 9 END)::smallint AS tier,
               (s.matched::real / s.token_count) AS token_ratio,
               (CASE s.field WHEN 'KOREAN_NAME' THEN 0 WHEN 'ENGLISH_NAME' THEN 1 ELSE 2 END) AS field_priority,
               length(s.norm) AS name_length,
               CASE WHEN s.whole_tier < 9 THEN s.whole_query ELSE s.token_piece END AS match_query
        FROM scored s
        WHERE s.matched > 0 OR s.whole_tier < 9
    )
    SELECT DISTINCT ON (r.ingredient_id) r.*
    FROM ranked r
    ORDER BY r.ingredient_id, r.tier, r.token_ratio DESC, r.field_priority, r.name_length, r.source_order
$$;

-- 성분 검색 한 페이지. search_products_page 와 같은 방식이다.
CREATE FUNCTION search_ingredients_page(p_query text, p_offset int, p_limit int, p_max_tier int)
    RETURNS TABLE (total bigint, has_full_match boolean, items jsonb)
    LANGUAGE sql STABLE
AS $$
    WITH h AS MATERIALIZED (
        SELECT * FROM search_ingredients_core(p_query)
    ),
    page AS (
        SELECT h.*
        FROM h
        WHERE h.tier <= p_max_tier
        ORDER BY h.tier, h.token_ratio DESC, h.field_priority, h.name_length, h.ingredient_id
        OFFSET p_offset LIMIT p_limit
    )
    SELECT (SELECT count(*) FROM h WHERE h.tier <= p_max_tier),
           coalesce((SELECT bool_or(h.tier <= 2) FROM h), false),
           coalesce((
               SELECT jsonb_agg(jsonb_build_object(
                          'ingredientId', r.ingredient_id, 'rank', r.rank, 'tier', r.tier, 'tokenRatio', r.token_ratio,
                          'matchField', r.field, 'sourceOrder', r.source_order, 'matchText', r.text,
                          'matchRange', CASE WHEN p_limit IS NOT NULL THEN to_jsonb(search_match_range(r.text, r.match_query)) END)
                      ORDER BY r.rank)
               FROM (SELECT page.*, p_offset + row_number() OVER (
                                 ORDER BY page.tier, page.token_ratio DESC, page.field_priority, page.name_length, page.ingredient_id) AS rank
                     FROM page) r
           ), '[]'::jsonb)
$$;

-- 성분 검색. search_products 와 같은 계약이다.
-- items 원소: ingredientId, rank, tier, tokenRatio, matchField(KOREAN_NAME·ENGLISH_NAME·ALIAS), sourceOrder, matchText, matchRange.
CREATE FUNCTION search_ingredients(p_query text, p_offset int DEFAULT 0, p_limit int DEFAULT NULL, p_max_tier int DEFAULT 3)
    RETURNS TABLE (total bigint, corrected_query text, items jsonb)
    LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_page record;
    v_corrected_page record;
    v_corrected text;
BEGIN
    IF p_offset IS NULL OR p_offset < 0 OR p_limit < 1 OR p_max_tier IS NULL OR p_max_tier NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION '페이지 조건이 올바르지 않다 (offset %, limit %, max_tier %).', p_offset, p_limit, p_max_tier;
    END IF;

    SELECT * INTO v_page FROM search_ingredients_page(p_query, p_offset, p_limit, p_max_tier);

    IF NOT v_page.has_full_match THEN
        v_corrected := search_correct_query(p_query, 'INGREDIENT');
        IF search_norm(v_corrected) <> search_norm(p_query) THEN
            SELECT * INTO v_corrected_page FROM search_ingredients_page(v_corrected, p_offset, p_limit, p_max_tier);
            IF v_corrected_page.total > 0 THEN
                RETURN QUERY SELECT v_corrected_page.total, v_corrected, v_corrected_page.items;
                RETURN;
            END IF;
        END IF;
    END IF;

    RETURN QUERY SELECT v_page.total, NULL::text, v_page.items;
END
$$;
