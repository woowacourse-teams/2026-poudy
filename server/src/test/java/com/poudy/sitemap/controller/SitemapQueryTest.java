package com.poudy.sitemap.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("사이트맵 수정일 조회")
class SitemapQueryTest {

    private static final String OLD = "2026-01-01T00:00:00+09:00";
    private static final String SEEDED = "2026-08-13T08:28:29.301+09:00";
    private static final String LATEST = "2026-09-01T10:00:00+09:00";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUpdatedAt() {
        jdbc.update("update category set updated_at = '2026-01-01 00:00:00'");
        jdbc.update("update brand set updated_at = '2026-01-01 00:00:00'");
        jdbc.update("update curation set updated_at = '2026-01-01 00:00:00'");
        jdbc.update("update ingredient set updated_at = '2026-01-01 00:00:00'");
        jdbc.update("update product set updated_at = '2026-09-01 10:00:00' where id = 15");
    }

    @Test
    @DisplayName("카테고리는 자기 행과 하위 카테고리까지의 제품 중 가장 늦은 수정 시각을 쓴다")
    void findsCategoryUpdates() throws Exception {
        mockMvc.perform(get("/api/sitemap")).andExpect(status().isOk())
            .andExpect(jsonPath("$.categories[*].id").value(contains(1, 2, 3, 13, 14)))
            .andExpect(jsonPath("$.categories[*].updatedAt").value(contains(LATEST, LATEST, SEEDED, SEEDED, SEEDED)));
    }

    @Test
    @DisplayName("브랜드는 자기 행과 제품 중 가장 늦은 수정 시각을 쓰고 제품이 없으면 자기 행의 시각을 쓴다")
    void findsBrandUpdates() throws Exception {
        mockMvc.perform(get("/api/sitemap")).andExpect(status().isOk())
            .andExpect(jsonPath("$.brands[*].id").value(contains(1, 2, 3)))
            .andExpect(jsonPath("$.brands[*].updatedAt").value(contains(SEEDED, OLD, LATEST)));
    }

    @Test
    @DisplayName("게시된 큐레이션만 담고 블록에 담긴 제품의 수정 시각을 반영한다")
    void findsPublishedCurationUpdates() throws Exception {
        mockMvc.perform(get("/api/sitemap")).andExpect(status().isOk())
            .andExpect(jsonPath("$.curations[*].id").value(contains(4, 12)))
            .andExpect(jsonPath("$.curations[*].updatedAt").value(contains(OLD, LATEST)));
    }

    @Test
    @DisplayName("JSONB 일반 제품 참조의 변경을 반영하고 누락 제품은 수정일을 덮지 않는다")
    void readsUpdatedPlainProductReferences() throws Exception {
        jdbc.update("""
            update curation set blocks = jsonb_build_array(blocks -> 4 || '{"productIds":[15,999999]}'::jsonb)
            where id = 12
            """);
        // 과거 시점의 블록 구성을 재현한다. 새 콘텐츠 쓰기의 자동 수정일은 별도 테스트한다.
        jdbc.update("update curation set updated_at = '2026-01-01 00:00:00' where id = 12");
        mockMvc.perform(get("/api/sitemap")).andExpect(status().isOk())
            .andExpect(jsonPath("$.curations[*].id").value(contains(4, 12)))
            .andExpect(jsonPath("$.curations[*].updatedAt").value(contains(OLD, LATEST)));
    }

    @Test
    @DisplayName("제품에 쓰인 성분만 담고 연결 제품이 더 최근이면 제품 수정일을 쓴다")
    void findsUsedIngredientUpdates() throws Exception {
        Integer used = jdbc.queryForObject(
            "select count(distinct ingredient_id) from product_ingredient",
            Integer.class
        );

        mockMvc.perform(get("/api/sitemap")).andExpect(status().isOk())
            .andExpect(jsonPath("$.ingredients.length()").value(is(used)))
            .andExpect(jsonPath("$.ingredients[?(@.id == 9)].updatedAt").value(contains(LATEST)));
    }

    @Test
    @DisplayName("성분 자체가 연결 제품보다 더 최근이면 성분 수정일을 쓴다")
    void usesNewerIngredientTimestamp() throws Exception {
        jdbc.update("update ingredient set updated_at = '2026-10-01 00:00:00' where id = 9");
        mockMvc.perform(get("/api/sitemap")).andExpect(status().isOk())
            .andExpect(
                jsonPath("$.ingredients[?(@.id == 9)].updatedAt")
                    .value(contains("2026-10-01T00:00:00+09:00"))
            );
    }

}
