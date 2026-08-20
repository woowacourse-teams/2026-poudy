package com.poudy.brand.controller;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("브랜드 상세 조회")
class BrandDetailTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("브랜드 정보와 이 브랜드 제품이 속한 카테고리별 제품 수를 조회한다")
    void findsBrandDetail() throws Exception {
        mockMvc.perform(get("/api/brands/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("다 브랜드"))
                .andExpect(jsonPath("$.englishName").value(""))
                .andExpect(jsonPath("$.imageUrl").value(""))
                .andExpect(jsonPath("$.categories[*].id").value(contains(1, 13)))
                .andExpect(jsonPath("$.categories[0].name").value("스킨케어"))
                .andExpect(jsonPath("$.categories[0].productCount").value(2))
                .andExpect(jsonPath("$.categories[0].children[*].id").value(contains(2, 3)))
                .andExpect(jsonPath("$.categories[0].children[*].productCount").value(contains(1, 1)))
                .andExpect(jsonPath("$.categories[1].name").value("선케어"))
                .andExpect(jsonPath("$.categories[1].productCount").value(1))
                .andExpect(jsonPath("$.categories[1].children[*].id").value(contains(14)));
    }

    @Test
    @DisplayName("제품이 없는 브랜드는 빈 카테고리 목록을 반환한다")
    void findsBrandWithoutProducts() throws Exception {
        mockMvc.perform(get("/api/brands/2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.categories").isEmpty());
    }

    @Test
    @DisplayName("브랜드 ID가 정수가 아니면 400을 반환한다")
    void rejectsInvalidBrandId() throws Exception {
        mockMvc.perform(get("/api/brands/not-a-number")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    @DisplayName("존재하지 않는 브랜드이면 404를 반환한다")
    void rejectsUnknownBrand() throws Exception {
        mockMvc.perform(get("/api/brands/999999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.BRAND_NOT_FOUND.name()));
    }
}
