package com.poudy.product.search.service;

import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** 자료 생성은 적재기가 소유한다. 새 서버는 누락된 자료로 빈 검색 결과를 제공하지 않는다. */
@Component
public class ProductSearchIndexReadiness implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    public ProductSearchIndexReadiness(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        Boolean missing = jdbc.queryForObject("""
            select exists (select 1 from product p join brand b on b.id=p.brand_id
              cross join lateral (values ('PRODUCT_NAME',p.product_name),('BRAND_NAME',b.korean_name),
                                         ('BRAND_ENGLISH_NAME',b.english_name)) expected(field,source)
              where expected.source is not null and not exists (
                select 1 from product_search_name n where n.product_id=p.id and n.field=expected.field
                  and n.kind='DIRECT' and n.analysis_version=? and n.source_text=expected.source))
            """, Boolean.class, ProductSearchAnalyzer.VERSION);
        if (Boolean.TRUE.equals(missing)) {
            throw new IllegalStateException("상품 검색 자료가 없거나 이전 버전입니다. Java 분석기로 검색 자료를 생성한 뒤 서버를 시작하세요.");
        }
    }
}
