package com.poudy.excludecode.controller;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
@DisplayName("제외 성분군 조회")
class ExcludeCodeQueryTest {

    private static final int CODE_COUNT = 6;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @Transactional
    @DisplayName("DB에 새 성분군을 추가하면 목록·제품 상세·필터에 반영한다")
    void reflectsNewDatabaseCode() throws Exception {
        jdbc.update(
            "insert into exclude_code (code, display_name, description) values (?, ?, ?)",
            "AAA_CUSTOM",
            "새 성분군",
            "DB에서 추가한 성분군"
        );
        jdbc.update(
            "insert into exclude_code_ingredient (exclude_code, ingredient_id, display_order) values (?, ?, ?)",
            "AAA_CUSTOM",
            9L,
            0
        );

        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(7))
            .andExpect(jsonPath("$.items[0].code").value("AAA_CUSTOM"))
            .andExpect(jsonPath("$.items[0].name").value("새 성분군"))
            .andExpect(jsonPath("$.items[0].description").value("DB에서 추가한 성분군"));
        mockMvc.perform(get("/api/products/15")).andExpect(status().isOk())
            .andExpect(jsonPath("$.excludeGroups[0].name").value("새 성분군"))
            .andExpect(jsonPath("$.excludeGroups[0].contains").value(true));
        mockMvc.perform(get("/api/products").param("excludeCodes", "AAA_CUSTOM"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", not(hasItem(15))));
    }

    @Test
    @DisplayName("성분군 전체를 DB 코드 순서대로 반환한다")
    void findsEveryExcludeCodeInCodeOrder() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(CODE_COUNT))
            .andExpect(jsonPath("$.items[0].code").value("CYCLIC_SILICONES"))
            .andExpect(jsonPath("$.items[1].code").value("DRYING_ALCOHOLS"))
            .andExpect(jsonPath("$.items[2].code").value("FRAGRANCE_ALLERGENS"))
            .andExpect(jsonPath("$.items[3].code").value("HARSH_PRESERVATIVES"))
            .andExpect(jsonPath("$.items[4].code").value("SULFATES"))
            .andExpect(jsonPath("$.items[5].code").value("SYNTHETIC_COLORANTS"));
    }

    @Test
    @DisplayName("성분군마다 표시 이름과 설명을 채워 반환한다")
    void findsDisplayNameAndDescription() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[3].name").value("자극성 방부제"))
            .andExpect(jsonPath("$.items[3].description").value("자극을 유발할 수 있는 방부제 성분을 제외합니다."))
            .andExpect(jsonPath("$.items[*].name", everyItem(not(blankOrNullString()))))
            .andExpect(jsonPath("$.items[*].description", everyItem(not(blankOrNullString()))));
    }

    @Test
    @DisplayName("성분군에 속한 성분을 데이터 순서대로 실제 성분 데이터로 채운다")
    void findsResolvedIngredients() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[3].ingredients.length()").value(10))
            .andExpect(jsonPath("$.items[3].ingredients[0].id").value(213))
            .andExpect(jsonPath("$.items[3].ingredients[0].koreanName").value("메틸파라벤"))
            .andExpect(jsonPath("$.items[3].ingredients[7].id").value(3551))
            .andExpect(jsonPath("$.items[3].ingredients[7].koreanName").value("페녹시에탄올"))
            .andExpect(jsonPath("$.items[3].ingredients[7].englishName").value("Phenoxyethanol"))
            .andExpect(jsonPath("$.items[3].ingredients[9].koreanName").value("디엠디엠하이단토인"))
            .andExpect(jsonPath("$.items[2].ingredients[0].koreanName").value("리날룰"))
            .andExpect(jsonPath("$.items[4].ingredients[0].koreanName").value("소듐라우레스설페이트"))
            .andExpect(jsonPath("$.items[0].ingredients[3].koreanName").value("사이클로헥사실록세인"))
            .andExpect(jsonPath("$.items[5].ingredients.length()").value(84));
    }

    @Test
    @DisplayName("성분이 비어 있는 성분군은 없다")
    void findsNoEmptyExcludeCode() throws Exception {
        mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].ingredients[0].id", hasSize(CODE_COUNT)));
    }
}
