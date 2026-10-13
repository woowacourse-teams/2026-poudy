-- 구버전 서버가 롤링 배포 중 읽을 수 있도록 기존 블록 테이블은 유지한다.
-- 변환 중 큐레이션 적재와 수정이 끼어들어 일부 데이터만 복사되지 않게 한다.
LOCK TABLE curation, curation_block, curation_block_filter,
    curation_block_product, curation_block_product_filter IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE curation ADD COLUMN blocks JSONB;

UPDATE curation c
SET blocks = COALESCE((
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', b.id,
            'type', b.type,
            'spacingTop', b.spacing_top,
            'spacingBottom', b.spacing_bottom
        ) || CASE b.type
            WHEN 'IMAGE' THEN jsonb_build_object(
                'imageUrl', b.image_url, 'altText', b.alt_text, 'bodyText', b.body_text
            )
            WHEN 'PRODUCTS' THEN jsonb_build_object(
                'productIds', COALESCE((
                    SELECT jsonb_agg(p.product_id ORDER BY p.position)
                    FROM curation_block_product p WHERE p.block_id = b.id
                ), '[]'::jsonb)
            )
            WHEN 'PRODUCTS_BY_FILTER' THEN jsonb_build_object(
                'filters', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', f.id, 'label', f.label) ORDER BY f.position)
                    FROM curation_block_filter f WHERE f.block_id = b.id
                ), '[]'::jsonb),
                'products', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'productId', p.product_id,
                        'filterIds', COALESCE((
                            SELECT jsonb_agg(m.filter_id ORDER BY m.position)
                            FROM curation_block_product_filter m
                            WHERE m.block_id = p.block_id AND m.product_id = p.product_id
                        ), '[]'::jsonb)
                    ) ORDER BY p.position)
                    FROM curation_block_product p WHERE p.block_id = b.id
                ), '[]'::jsonb)
            )
        END ORDER BY b.position
    )
    FROM curation_block b WHERE b.curation_id = c.id
), '[]'::jsonb);

ALTER TABLE curation
    ALTER COLUMN blocks SET NOT NULL,
    ADD CONSTRAINT ck_curation_blocks_array CHECK (jsonb_typeof(blocks) = 'array');
