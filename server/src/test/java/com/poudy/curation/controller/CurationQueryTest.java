package com.poudy.curation.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("큐레이션 조회")
class CurationQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("게시 중인 큐레이션 목록을 ID 오름차순으로 반환한다")
    void findsPublishedCurationsSortedById() throws Exception {
        mockMvc.perform(get("/api/curations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(2)))
            .andExpect(jsonPath("$.items[*].id", contains(4, 12)))
            .andExpect(jsonPath("$.items[1].title").value("환절기 장벽 케어"))
            .andExpect(jsonPath("$.items[1].description").value("환절기를 위한 제품 모음"))
            .andExpect(jsonPath("$.items[1].imageUrl").value("https://cdn.example.com/curations/12/main.png"));
    }

    @Test
    @DisplayName("큐레이션 상세의 이미지와 카테고리를 편집 순서대로 반환한다")
    void findsCurationDetail() throws Exception {
        mockMvc.perform(get("/api/curations/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(12L))
            .andExpect(jsonPath("$.description").value("환절기에 피부 장벽 관리가 필요한 이유와 제품 선택 기준"))
            .andExpect(
                jsonPath(
                    "$.imageUrls",
                    contains(
                        "https://cdn.example.com/curations/12/main.png",
                        "https://cdn.example.com/curations/12/description-1.png"
                    )
                )
            )
            .andExpect(jsonPath("$.categories[*].id", contains(13, 1)))
            .andExpect(jsonPath("$.categories[*].name", contains("선케어", "스킨케어")));
    }

    @Test
    @DisplayName("큐레이션 제품을 등록 순서와 제품 목록 표현으로 반환한다")
    void findsCurationProductsKeepingEditorialOrder() throws Exception {
        mockMvc.perform(get("/api/curations/12/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(15, 10, 7, 1)))
            .andExpect(jsonPath("$.items[0].name").value("PH 컨디션 토너"))
            .andExpect(jsonPath("$.items[0].brandName").value("나 브랜드"))
            .andExpect(jsonPath("$.items[0].imageUrl").value("https://cdn.example.com/products/15.png"))
            .andExpect(jsonPath("$.items[0].price").value(15000L))
            .andExpect(jsonPath("$.items[0].volumeValue").value(150))
            .andExpect(jsonPath("$.items[0].volumeUnit").value("ml"))
            .andExpect(jsonPath("$.items[0].moistureLevel").isNumber())
            .andExpect(jsonPath("$.items[0].oilLevel").isNumber());
    }

    @Test
    @DisplayName("대분류나 소분류로 필터링해도 큐레이션 제품 순서를 유지한다")
    void filtersProductsKeepingEditorialOrder() throws Exception {
        mockMvc.perform(get("/api/curations/12/products").param("categoryId", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(15, 7, 1)));

        mockMvc.perform(get("/api/curations/12/products").param("categoryId", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(15, 1)));
    }

    @Test
    @DisplayName("존재하지 않는 카테고리 ID는 빈 제품 목록을 반환한다")
    void returnsEmptyProductsForUnknownCategory() throws Exception {
        mockMvc.perform(get("/api/curations/12/products").param("categoryId", "999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @ParameterizedTest
    @ValueSource(longs = {20L, 30L, 999L})
    @DisplayName("조회할 수 없는 큐레이션 상세와 제품은 404를 반환한다")
    void rejectsUnavailableCuration(Long curationId) throws Exception {
        mockMvc.perform(get("/api/curations/{curationId}", curationId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value(ErrorCode.CURATION_NOT_FOUND.name()));

        mockMvc.perform(get("/api/curations/{curationId}/products", curationId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value(ErrorCode.CURATION_NOT_FOUND.name()));
    }
}
