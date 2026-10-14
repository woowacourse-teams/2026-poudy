-- 두 번째 배포용 SQL 초안. 이 파일은 Flyway 자동 탐색 경로에 두지 않는다.
-- 모든 서버의 JSONB 읽기 전환과 데이터 비교가 끝난 뒤, 다음 Flyway 버전으로 배포한다.
LOCK TABLE curation, curation_block, curation_block_filter,
    curation_block_product, curation_block_product_filter IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM curation WHERE blocks IS NULL OR jsonb_typeof(blocks) <> 'array') THEN
        RAISE EXCEPTION '큐레이션 JSONB 이전이 완료되지 않았습니다.';
    END IF;
END $$;

DROP TABLE curation_block_product_filter;
DROP TABLE curation_block_product;
DROP TABLE curation_block_filter;
DROP TABLE curation_block;
DROP FUNCTION require_curation_block_child_type();
DROP FUNCTION require_curation_block_filters();
-- require_contiguous_order는 성분·의견 등 다른 도메인도 사용하므로 유지한다.
