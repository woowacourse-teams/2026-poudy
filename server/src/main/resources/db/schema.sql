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
    created_at   TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at   TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_brand PRIMARY KEY (id),
    CONSTRAINT ck_brand_name_nfc CHECK (korean_name IS NFC NORMALIZED AND (english_name IS NULL OR english_name IS NFC NORMALIZED)),
    CONSTRAINT ux_brand_korean_name UNIQUE (korean_name),
    CONSTRAINT ck_brand_korean_name_not_blank CHECK (korean_name !~ '^\s*$')
);

CREATE TABLE category (
    id         BIGINT       NOT NULL,
    parent_id  BIGINT       NULL,
    name       VARCHAR(100) NOT NULL,
    depth      INT          NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_category PRIMARY KEY (id),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES category (id),
    CONSTRAINT ck_category_name_not_blank CHECK (name !~ '^\s*$'),
    CONSTRAINT ck_category_depth CHECK (
        (depth = 0 AND parent_id IS NULL)
        OR (depth = 1 AND parent_id IS NOT NULL)
    )
);

CREATE TABLE tag (
    code          VARCHAR(100) NOT NULL,
    category_code VARCHAR(30)  NOT NULL,
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_tag PRIMARY KEY (code),
    CONSTRAINT ck_tag_code_not_blank CHECK (code !~ '^\s*$'),
    CONSTRAINT ck_tag_name_not_blank CHECK (name !~ '^\s*$'),
    CONSTRAINT ck_tag_category CHECK (category_code IN (
        'FUNCTION', 'BIOLOGICAL_EFFECT', 'INGREDIENT_CLASS', 'ALLERGEN', 'REGULATORY', 'SKIN_REACTION'
    ))
);

CREATE TABLE ingredient (
    id                BIGINT        NOT NULL,
    korean_name       VARCHAR(600)  NOT NULL,
    english_name      VARCHAR(2000) NULL,
    description       VARCHAR(1000) NOT NULL,
    updated_at        TIMESTAMP     NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_ingredient PRIMARY KEY (id),
    CONSTRAINT ck_ingredient_name_nfc CHECK (korean_name IS NFC NORMALIZED AND (english_name IS NULL OR english_name IS NFC NORMALIZED))
);

CREATE TABLE ingredient_alias (
    id            BIGINT GENERATED ALWAYS AS IDENTITY,
    ingredient_id BIGINT       NOT NULL,
    alias         VARCHAR(300) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_ingredient_alias PRIMARY KEY (id),
    CONSTRAINT ux_ingredient_alias_alias UNIQUE (ingredient_id, alias),
    CONSTRAINT ck_ingredient_alias_nfc CHECK (alias IS NFC NORMALIZED),
    CONSTRAINT fk_ingredient_alias_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id) ON DELETE CASCADE
);

CREATE TABLE ingredient_tag (
    ingredient_id BIGINT       NOT NULL,
    tag_code      VARCHAR(100) NOT NULL,
    display_order INT          NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_ingredient_tag PRIMARY KEY (ingredient_id, tag_code),
    CONSTRAINT ux_ingredient_tag_order UNIQUE (ingredient_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_ingredient_tag_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id) ON DELETE CASCADE,
    CONSTRAINT fk_ingredient_tag_tag FOREIGN KEY (tag_code) REFERENCES tag (code)
);

CREATE TABLE ingredient_source (
    id            BIGINT GENERATED ALWAYS AS IDENTITY,
    ingredient_id BIGINT      NOT NULL,
    type          VARCHAR(10) NOT NULL,
    content       TEXT        NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_ingredient_source PRIMARY KEY (id),
    CONSTRAINT ck_ingredient_source_type CHECK (type IN ('INFO', 'EFFECT')),
    CONSTRAINT ck_ingredient_source_not_deferred CHECK (content NOT LIKE '태그 보류%'),
    CONSTRAINT fk_ingredient_source_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id) ON DELETE CASCADE
);

CREATE TABLE exclude_code_ingredient (
    exclude_code  VARCHAR(50) NOT NULL,
    ingredient_id BIGINT      NOT NULL,
    display_order INT         NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
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
    product_name   VARCHAR(300)  NOT NULL,
    image_url      VARCHAR(1000) NULL,
    moisture_level SMALLINT      NOT NULL, -- 외부에서 계산한 결과를 저장한다
    oil_level      SMALLINT      NOT NULL, -- 외부에서 계산한 결과를 저장한다
    updated_at     TIMESTAMP     NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product PRIMARY KEY (id),
    CONSTRAINT ux_product_brand_name UNIQUE (brand_id, product_name),
    CONSTRAINT ck_product_name_nfc CHECK (product_name IS NFC NORMALIZED),
    CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brand (id),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES category (id),
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
    created_at    TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
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
    id            BIGINT GENERATED ALWAYS AS IDENTITY,
    product_id    BIGINT       NOT NULL,
    display_order INT          NOT NULL,
    name          VARCHAR(100) NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_component PRIMARY KEY (id),
    CONSTRAINT ux_product_component_order UNIQUE (product_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ux_product_component_name UNIQUE NULLS NOT DISTINCT (product_id, name),
    CONSTRAINT fk_product_component_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE product_ingredient (
    component_id           BIGINT        NOT NULL,
    ingredient_id          BIGINT        NOT NULL,
    display_order          INT           NOT NULL,
    disclosed_amount_type  VARCHAR(20)   NULL,
    disclosed_amount_value NUMERIC(19,9) NULL,
    disclosed_amount_unit  VARCHAR(20)   NULL,
    created_at             TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at             TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_ingredient PRIMARY KEY (component_id, ingredient_id),
    CONSTRAINT ux_product_ingredient_order UNIQUE (component_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_product_ingredient_component FOREIGN KEY (component_id) REFERENCES product_component (id),
    CONSTRAINT fk_product_ingredient_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (id),
    CONSTRAINT ck_product_ingredient_amount CHECK (
        (disclosed_amount_type IS NULL AND disclosed_amount_value IS NULL AND disclosed_amount_unit IS NULL)
        OR (disclosed_amount_type IS NOT NULL AND disclosed_amount_value IS NOT NULL AND disclosed_amount_unit IS NOT NULL)
    ),
    CONSTRAINT ck_product_ingredient_amount_value CHECK (
        disclosed_amount_value IS NULL OR disclosed_amount_value >= 0
    ),
    CONSTRAINT ck_product_ingredient_amount_unit CHECK (
        disclosed_amount_unit IS NULL OR disclosed_amount_unit IN ('ppm', 'ppb', 'percent')
    ),
    CONSTRAINT ck_product_ingredient_amount_type CHECK (
        disclosed_amount_type IS NULL OR disclosed_amount_type IN ('exact')
    )
);

CREATE TABLE skin_type (
    code       VARCHAR(20) NOT NULL,
    name       VARCHAR(50) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_skin_type PRIMARY KEY (code),
    CONSTRAINT ck_skin_type_name_not_blank CHECK (name !~ '^\s*$')
);

CREATE TABLE product_skin_type (
    product_id     BIGINT      NOT NULL,
    skin_type_code VARCHAR(20) NOT NULL,
    created_at     TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at     TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_skin_type PRIMARY KEY (product_id, skin_type_code),
    CONSTRAINT fk_product_skin_type_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT fk_product_skin_type_definition FOREIGN KEY (skin_type_code) REFERENCES skin_type (code)
);

CREATE TABLE curation (
    id                         BIGINT        NOT NULL, -- 원천이 준 ID. /api/curations/{id} 링크가 유지되도록 다시 적재해도 바꾸지 않는다
    position                   INT           NOT NULL,
    title                      VARCHAR(200)  NOT NULL,
    description                TEXT          NOT NULL,
    banner_visible             BOOLEAN       NOT NULL,
    banner_thumbnail_image_url VARCHAR(1000) NULL,
    publication_status         VARCHAR(20)   NOT NULL,
    created_at                 TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at                 TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_curation PRIMARY KEY (id),
    CONSTRAINT ux_curation_position UNIQUE (position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ck_curation_publication_status CHECK (publication_status IN ('PUBLISHED', 'UNPUBLISHED')),
    CONSTRAINT ck_curation_banner CHECK (
        NOT banner_visible OR (publication_status = 'PUBLISHED' AND banner_thumbnail_image_url IS NOT NULL)
    )
);

CREATE TABLE curation_block (
    id             UUID          NOT NULL,
    curation_id    BIGINT        NOT NULL,
    position       INT           NOT NULL,
    type           VARCHAR(30)   NOT NULL,
    spacing_top    INT           NOT NULL,
    spacing_bottom INT           NOT NULL,
    image_url      VARCHAR(1000) NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at     TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_curation_block PRIMARY KEY (id),
    CONSTRAINT ux_curation_block_order UNIQUE (curation_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_curation_block_curation FOREIGN KEY (curation_id) REFERENCES curation (id) ON DELETE CASCADE,
    CONSTRAINT ck_curation_block_type CHECK (type IN ('IMAGE', 'PRODUCTS', 'PRODUCTS_BY_FILTER')),
    CONSTRAINT ck_curation_block_spacing CHECK (spacing_top >= 0 AND spacing_bottom >= 0),
    CONSTRAINT ck_curation_block_image CHECK (
        (type = 'IMAGE' AND image_url IS NOT NULL)
        OR (type <> 'IMAGE' AND image_url IS NULL)
    )
);

CREATE TABLE curation_block_filter (
    id         UUID      NOT NULL,
    block_id   UUID      NOT NULL,
    position   INT       NOT NULL,
    label      VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_curation_block_filter PRIMARY KEY (id, block_id),
    CONSTRAINT ux_curation_block_filter_order UNIQUE (block_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_curation_block_filter_block FOREIGN KEY (block_id) REFERENCES curation_block (id) ON DELETE CASCADE
);

CREATE TABLE curation_block_product (
    block_id   UUID      NOT NULL,
    product_id BIGINT    NOT NULL,
    position   INT       NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_curation_block_product PRIMARY KEY (block_id, product_id),
    CONSTRAINT ux_curation_block_product_order UNIQUE (block_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_curation_block_product_block FOREIGN KEY (block_id) REFERENCES curation_block (id) ON DELETE CASCADE,
    CONSTRAINT fk_curation_block_product_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE TABLE curation_block_product_filter (
    block_id   UUID   NOT NULL,
    product_id BIGINT NOT NULL,
    filter_id  UUID   NOT NULL,
    position   INT    NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_curation_block_product_filter PRIMARY KEY (block_id, product_id, filter_id),
    CONSTRAINT ux_curation_block_product_filter_order UNIQUE (block_id, product_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_cbpf_product FOREIGN KEY (block_id, product_id) REFERENCES curation_block_product (block_id, product_id) ON DELETE CASCADE,
    CONSTRAINT fk_cbpf_filter FOREIGN KEY (block_id, filter_id) REFERENCES curation_block_filter (block_id, id) ON DELETE CASCADE
);

-- block_type 컬럼을 자식 테이블에 중복하지 않고 부모 블록의 type을 검사한다.
CREATE FUNCTION require_curation_block_child_type() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_type VARCHAR(30);
BEGIN
    IF TG_TABLE_NAME = 'curation_block' THEN
        IF NEW.type <> 'PRODUCTS_BY_FILTER'
            AND EXISTS (SELECT 1 FROM curation_block_filter WHERE block_id = NEW.id) THEN
            RAISE EXCEPTION '필터가 있는 큐레이션 블록 % 타입은 PRODUCTS_BY_FILTER 여야 한다.', NEW.id
                USING ERRCODE = '23514';
        END IF;
        IF NEW.type NOT IN ('PRODUCTS', 'PRODUCTS_BY_FILTER')
            AND EXISTS (SELECT 1 FROM curation_block_product WHERE block_id = NEW.id) THEN
            RAISE EXCEPTION '제품이 있는 큐레이션 블록 % 타입은 PRODUCTS 또는 PRODUCTS_BY_FILTER 여야 한다.', NEW.id
                USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    SELECT type INTO v_type FROM curation_block WHERE id = NEW.block_id;
    IF TG_TABLE_NAME = 'curation_block_filter' AND v_type <> 'PRODUCTS_BY_FILTER' THEN
        RAISE EXCEPTION '큐레이션 필터의 블록 % 타입은 PRODUCTS_BY_FILTER 여야 한다.', NEW.block_id
            USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'curation_block_product' AND v_type NOT IN ('PRODUCTS', 'PRODUCTS_BY_FILTER') THEN
        RAISE EXCEPTION '큐레이션 제품의 블록 % 타입은 PRODUCTS 또는 PRODUCTS_BY_FILTER 여야 한다.', NEW.block_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_curation_block_child_type BEFORE UPDATE OF type ON curation_block
    FOR EACH ROW EXECUTE FUNCTION require_curation_block_child_type();
CREATE TRIGGER tg_curation_block_filter_type BEFORE INSERT OR UPDATE ON curation_block_filter
    FOR EACH ROW EXECUTE FUNCTION require_curation_block_child_type();
CREATE TRIGGER tg_curation_block_product_type BEFORE INSERT OR UPDATE ON curation_block_product
    FOR EACH ROW EXECUTE FUNCTION require_curation_block_child_type();

-- 필터형 제품 블록(PRODUCTS_BY_FILTER)은 필터를 하나 이상 가지고, 블록의 모든 제품은 필터에 하나 이상 연결된다.
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
    view_date  DATE      NOT NULL,
    product_id BIGINT    NOT NULL,
    view_count BIGINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_daily_view PRIMARY KEY (view_date, product_id),
    CONSTRAINT fk_product_daily_view_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_product_daily_view_count CHECK (view_count >= 0)
);

CREATE TABLE search_keyword (
    id               VARCHAR(100) NOT NULL,
    keyword          VARCHAR(100) NOT NULL,
    status           VARCHAR(10)  NOT NULL,
    ranking_eligible BOOLEAN      NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at       TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_search_keyword PRIMARY KEY (id),
    CONSTRAINT ck_search_keyword_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE search_keyword_expression (
    expression_key VARCHAR(300) COLLATE "C" NOT NULL,
    keyword_id     VARCHAR(100) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at     TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_search_keyword_expression PRIMARY KEY (expression_key),
    CONSTRAINT fk_search_keyword_expression_keyword FOREIGN KEY (keyword_id) REFERENCES search_keyword (id) ON DELETE CASCADE
);

CREATE TABLE search_keyword_bucket (
    bucket_start TIMESTAMP    NOT NULL,
    keyword_key  VARCHAR(300) COLLATE "C" NOT NULL,
    hit_count    BIGINT       NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at   TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_search_keyword_bucket PRIMARY KEY (bucket_start, keyword_key),
    CONSTRAINT ck_search_keyword_bucket_count CHECK (hit_count > 0)
);

CREATE TABLE feedback (
    id                UUID          NOT NULL,
    subject_type      VARCHAR(30)   NOT NULL,
    content           VARCHAR(2000) NOT NULL,
    page_path         VARCHAR(500)  NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMP     NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_feedback PRIMARY KEY (id),
    CONSTRAINT ck_feedback_subject_type CHECK (subject_type IN ('BUG_REPORT', 'IMPROVEMENT', 'OTHER')),
    CONSTRAINT ck_feedback_status CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
);

CREATE TABLE feedback_image (
    image_id      UUID      NOT NULL,
    feedback_id   UUID      NOT NULL,
    display_order INT       NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_feedback_image PRIMARY KEY (image_id),
    CONSTRAINT ux_feedback_image_order UNIQUE (feedback_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_feedback_image_feedback FOREIGN KEY (feedback_id) REFERENCES feedback (id) ON DELETE CASCADE,
    CONSTRAINT ck_feedback_image_order CHECK (display_order BETWEEN 0 AND 4)
);

CREATE TABLE product_correction_request (
    id                UUID          NOT NULL,
    product_id        BIGINT        NOT NULL,
    content           VARCHAR(2000) NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMP     NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_correction_request PRIMARY KEY (id),
    CONSTRAINT fk_product_correction_request_product FOREIGN KEY (product_id) REFERENCES product (id),
    CONSTRAINT ck_product_correction_request_status CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
);

CREATE TABLE product_correction_request_image (
    image_id      UUID      NOT NULL,
    request_id    UUID      NOT NULL,
    display_order INT       NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_correction_request_image PRIMARY KEY (image_id),
    CONSTRAINT ux_product_correction_request_image_order UNIQUE (request_id, display_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_product_correction_request_image_request FOREIGN KEY (request_id) REFERENCES product_correction_request (id) ON DELETE CASCADE,
    CONSTRAINT ck_product_correction_request_image_order CHECK (display_order BETWEEN 0 AND 4)
);

CREATE TABLE product_request (
    id                UUID         NOT NULL,
    product_name      VARCHAR(200) NOT NULL,
    brand_name        VARCHAR(100) NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMP    NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul'),
    CONSTRAINT pk_product_request PRIMARY KEY (id),
    CONSTRAINT ck_product_request_status CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
);

-- 서버는 표시 순서를 목록 위치(JPA @OrderColumn)로 읽는다. 순서가 비면 목록에 빈 칸이 생기므로 부모마다 0부터 끊김 없이 이어지는지 커밋 시점에 검사한다.
-- 인자: 부모 키 컬럼(쉼표로 구분), 순서 컬럼. 순서 중복은 각 테이블의 UNIQUE 제약이 막는다.
CREATE FUNCTION require_contiguous_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_parent_columns TEXT[] := string_to_array(TG_ARGV[0], ',');
    v_order_column   TEXT := TG_ARGV[1];
    v_rows           JSONB[];
    v_row            JSONB;
    v_condition      TEXT;
    v_count          BIGINT;
    v_min            INT;
    v_max            INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_rows := ARRAY[to_jsonb(NEW)];
    ELSIF TG_OP = 'DELETE' THEN
        v_rows := ARRAY[to_jsonb(OLD)];
    ELSE
        v_rows := ARRAY[to_jsonb(OLD), to_jsonb(NEW)];
    END IF;
    FOREACH v_row IN ARRAY v_rows LOOP
        SELECT string_agg(format('%I = %L', parent_column, v_row ->> parent_column), ' AND ')
        INTO v_condition
        FROM unnest(v_parent_columns) AS parent_column;
        EXECUTE format('SELECT count(*), min(%1$I), max(%1$I) FROM %2$I.%3$I WHERE %4$s',
                       v_order_column, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_condition)
        INTO v_count, v_min, v_max;
        IF v_count > 0 AND (v_min <> 0 OR v_max <> v_count - 1) THEN
            RAISE EXCEPTION '% 의 % 는 0부터 끊김 없이 이어져야 한다. 대상: %', TG_TABLE_NAME, v_order_column, v_condition
                USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER tg_ingredient_tag_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON ingredient_tag
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('ingredient_id', 'display_order');
CREATE CONSTRAINT TRIGGER tg_product_ingredient_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON product_ingredient
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('component_id', 'display_order');
CREATE CONSTRAINT TRIGGER tg_curation_block_filter_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON curation_block_filter
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('block_id', 'position');
CREATE CONSTRAINT TRIGGER tg_curation_block_product_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON curation_block_product
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('block_id', 'position');
CREATE CONSTRAINT TRIGGER tg_curation_block_product_filter_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON curation_block_product_filter
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('block_id,product_id', 'position');
CREATE CONSTRAINT TRIGGER tg_feedback_image_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON feedback_image
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('feedback_id', 'display_order');
CREATE CONSTRAINT TRIGGER tg_product_correction_request_image_contiguous_order AFTER INSERT OR UPDATE OR DELETE ON product_correction_request_image
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_contiguous_order('request_id', 'display_order');

CREATE INDEX ix_product_daily_view_product ON product_daily_view (product_id, view_date);
-- 긴 본문은 btree 한 행 한계(약 2.7KB)를 넘을 수 있어 해시로 중복을 막는다.
CREATE UNIQUE INDEX ux_ingredient_source_content ON ingredient_source (ingredient_id, type, md5(content));
CREATE INDEX ix_ingredient_korean_name ON ingredient (korean_name, id);
-- 영문명 정확 조회(대소문자 무시)용. 로케일과 무관하게 A-Z 만 소문자로 바꾼다. 조회도 같은 식으로 해야 인덱스를 탄다.
CREATE INDEX ix_ingredient_english_name ON ingredient (translate(english_name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), id);
CREATE INDEX ix_product_category ON product (category_id);
CREATE INDEX ix_product_ingredient_ingredient ON product_ingredient (ingredient_id);
CREATE INDEX ix_feedback_created_at ON feedback (created_at, id);
CREATE INDEX ix_product_correction_request_created_at ON product_correction_request (created_at, id);
CREATE INDEX ix_search_keyword_expression_keyword ON search_keyword_expression (keyword_id);
