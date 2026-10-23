package com.poudy.ingredient.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.poudy.exception.ErrorCode;
import java.util.List;
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
@DisplayName("성분 상세 조회")
class IngredientDetailTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("성분 정보와 배합 목적, 제외 성분군, 제품 수, 출처를 조회한다")
    void findsIngredientDetail() throws Exception {
        mockMvc.perform(get("/api/ingredients/9")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(9))
            .andExpect(jsonPath("$.koreanName").value("리날룰")).andExpect(jsonPath("$.englishName").value("Linalool"))
            .andExpect(jsonPath("$.formulationRoles[0].id").value("PERFUMING"))
            .andExpect(jsonPath("$.formulationRoles[0].code").value("PERFUMING"))
            .andExpect(jsonPath("$.formulationRoles[0].name").value("향료"))
            .andExpect(jsonPath("$.skinEffects").isEmpty())
            .andExpect(jsonPath("$.groupCodes[0]").value("FRAGRANCE_ALLERGENS"))
            .andExpect(jsonPath("$.productCount").value(1))
            .andExpect(jsonPath("$.products").isEmpty())
            .andExpect(jsonPath("$.infoSources[0]").value("대한화장품협회 성분사전 「리날룰」"))
            .andExpect(jsonPath("$.infoSources.length()").value(4)).andExpect(jsonPath("$.effectSources").isEmpty())
            .andExpect(jsonPath("$.updatedAt").value("2026-08-13T08:50:49.068+09:00"));
    }

    @Test
    @DisplayName("피부 작용 태그와 제품이 없는 경우를 실제 데이터대로 조회한다")
    void findsSkinEffectsAndEmptyRelations() throws Exception {
        mockMvc.perform(get("/api/ingredients/2")).andExpect(status().isOk())
            .andExpect(jsonPath("$.formulationRoles").isEmpty())
            .andExpect(jsonPath("$.skinEffects[0].id").value("ANTIOXIDANT_RELATED"))
            .andExpect(jsonPath("$.skinEffects[0].code").value("ANTIOXIDANT_RELATED"))
            .andExpect(jsonPath("$.skinEffects[0].name").value("항산화 관련"))
            .andExpect(jsonPath("$.groupCodes").isEmpty()).andExpect(jsonPath("$.productCount").value(0))
            .andExpect(jsonPath("$.infoSources.length()").value(3))
            .andExpect(jsonPath("$.effectSources.length()").value(3));
    }

    @Test
    @Transactional
    @DisplayName("포함 제품을 요청한 개수만큼 기본 제품 목록과 같은 순서로 반환하고 전체 개수는 유지한다")
    void includesRequestedProducts() throws Exception {
        jdbc.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select pc.id, 9, 999 from product_component pc
            where not exists (select 1 from product_ingredient pi
                where pi.component_id = pc.id and pi.ingredient_id = 9)
            """);
        String list = mockMvc.perform(get("/api/products").param("includeIngredientIds", "9").param("size", "3"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Integer> expected = JsonPath.read(list, "$.items[*].id");
        assertThat(expected).hasSize(3);
        for (int size : List.of(0, 1, 3, 20)) {
            String detail = mockMvc.perform(get("/api/ingredients/9").param("productSize", String.valueOf(size)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            List<Integer> actual = JsonPath.read(detail, "$.products[*].id");
            Number total = JsonPath.read(detail, "$.productCount");
            assertThat(actual).hasSize((int) Math.min(size, total.longValue()));
            if (size == 3) {
                assertThat(actual).isEqualTo(expected);
            }
        }
    }

    @Test
    @DisplayName("제품이 없으면 제품 미리보기도 빈 배열이다")
    void noProducts() throws Exception {
        mockMvc.perform(get("/api/ingredients/2").param("productSize", "3"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.products").isEmpty())
            .andExpect(jsonPath("$.productCount").value(0));
    }

    @Test
    @DisplayName("제품 미리보기 크기가 범위 밖이거나 정수가 아니면 거절한다")
    void rejectsInvalidProductSize() throws Exception {
        for (String value : List.of("-1", "21", "1.5", "invalid")) {
            mockMvc.perform(get("/api/ingredients/9").param("productSize", value)).andExpect(status().isBadRequest());
        }
    }

    @Test
    @DisplayName("존재하지 않는 성분이면 404를 반환한다")
    void rejectsUnknownIngredient() throws Exception {
        mockMvc.perform(get("/api/ingredients/999999")).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value(ErrorCode.INGREDIENT_NOT_FOUND.name()));
    }
}
