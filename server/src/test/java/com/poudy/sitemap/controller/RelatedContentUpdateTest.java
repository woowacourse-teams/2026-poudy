package com.poudy.sitemap.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("연관 콘텐츠 변경의 수정일 전파")
class RelatedContentUpdateTest {

    private static final LocalDateTime OLD = LocalDateTime.of(2026, 1, 1, 0, 0);

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetHistory() {
        jdbc.update("update ingredient set updated_at = ?", OLD);
        jdbc.update("update product set updated_at = ?", OLD);
        jdbc.update("update brand set updated_at = ?", OLD);
        jdbc.update("update category set updated_at = ?", OLD);
        jdbc.update("update curation set updated_at = ?", OLD);
    }

    @Test
    @DisplayName("용량 옵션 가격만 바뀌어도 제품과 목록 집계의 기준일이 갱신된다")
    void variantPriceTouchesProduct() {
        jdbc.update("update product_variant set price = price + 1 where product_id = 1");

        assertThat(updatedAt("product", 1)).isAfter(OLD);
        assertThat(jdbc.queryForObject("""
            select greatest(b.updated_at, max(p.updated_at)) from brand b
            left join product p on p.brand_id = b.id where b.id = 1 group by b.id
            """, LocalDateTime.class)).isAfter(OLD);
        assertThat(updatedAt("product", 15)).isEqualTo(OLD);
    }

    @Test
    @DisplayName("출처 추가와 삭제는 성분 및 그 성분을 사용하는 제품에 반영된다")
    void sourceInsertAndDeleteTouchIngredientAndProducts() {
        Long id = jdbc.queryForObject("""
            insert into ingredient_source(ingredient_id, type, content)
            values (9, 'INFO', '수정일 전파 검증 자료') returning id
            """, Long.class);
        assertThat(updatedAt("ingredient", 9)).isAfter(OLD);
        Long productId = jdbc.queryForObject("""
            select pc.product_id from product_component pc join product_ingredient pi on pi.component_id = pc.id
            where pi.ingredient_id = 9 limit 1
            """, Long.class);
        assertThat(updatedAt("product", productId)).isAfter(OLD);

        resetHistory();
        jdbc.update("delete from ingredient_source where id = ?", id);
        assertThat(updatedAt("ingredient", 9)).isAfter(OLD);
        assertThat(updatedAt("product", productId)).isAfter(OLD);
    }

    @Test
    @DisplayName("태그 정의 변경도 관련 성분의 수정일에 반영된다")
    void tagDefinitionTouchesIngredients() {
        jdbc.update("update tag set name = name || ' 변경' where code = 'PERFUMING'");
        assertThat(updatedAt("ingredient", 9)).isAfter(OLD);
    }

    @Test
    @DisplayName("실제 값이 같은 재적재나 수정일만의 이력 복원은 다른 콘텐츠를 갱신하지 않는다")
    void noOpDoesNotCreateUpdates() {
        jdbc.update("update ingredient_source set content = content where ingredient_id = 9");
        jdbc.update("update ingredient set updated_at = ? where id = 9", OLD.plusDays(1));
        assertThat(updatedAt("product", 1)).isEqualTo(OLD);
        assertThat(updatedAt("ingredient", 9)).isEqualTo(OLD.plusDays(1));
    }

    @Test
    @DisplayName("브랜드를 옮기면 이전 브랜드와 새 브랜드의 목록도 갱신된다")
    void moveTouchesBothDirectories() {
        jdbc.update("update product set brand_id = 2 where id = 1");
        assertThat(updatedAt("brand", 1)).isAfter(OLD);
        assertThat(updatedAt("brand", 2)).isAfter(OLD);
    }

    @Test
    @DisplayName("큐레이션 본문 변경은 적재자가 수정일을 지정하지 않아도 기록된다")
    void curationContentTouchesOwnTimestamp() {
        jdbc.update("update curation set title = title || ' 변경' where id = 12");
        assertThat(updatedAt("curation", 12)).isAfter(OLD);
    }

    @Test
    @DisplayName("추천 대상의 가격 변경은 추천 페이지에도 반영되며 순환 참조가 있어도 종료된다")
    void targetPriceTouchesRecommendingPageWithoutRecursion() {
        jdbc.update("""
            insert into product_similarity(component_id, similar_component_id, similarity_score)
            select source.id, target.id, 0.9 from product_component source, product_component target
            where (source.product_id = 7 and target.product_id = 1)
               or (source.product_id = 1 and target.product_id = 7)
            on conflict do nothing
            """);
        resetHistory();
        jdbc.update("update product_variant set price = price + 1 where product_id = 1");
        assertThat(updatedAt("product", 1)).isAfter(OLD);
        assertThat(updatedAt("product", 7)).isAfter(OLD);
        assertThat(updatedAt("product", 15)).isEqualTo(OLD);
    }

    @Test
    @DisplayName("한 SQL에서 여러 근거가 바뀌어도 같은 부모 제품은 한 번만 갱신한다")
    void bulkSourcesTouchParentOncePerStatement() {
        Long before = jdbc.queryForObject("""
            select n_tup_upd from pg_stat_xact_user_tables where relid = 'product'::regclass
            """, Long.class);
        int sources = jdbc.update("update ingredient_source set content = content || ' 변경' where ingredient_id = 9");
        assertThat(sources).isGreaterThan(1);
        Long after = jdbc.queryForObject("""
            select n_tup_upd from pg_stat_xact_user_tables where relid = 'product'::regclass
            """, Long.class);
        assertThat(after - before).isEqualTo(1L);
    }

    private LocalDateTime updatedAt(String table, long id) {
        return jdbc.queryForObject("select updated_at from " + table + " where id = ?", LocalDateTime.class, id);
    }
}
