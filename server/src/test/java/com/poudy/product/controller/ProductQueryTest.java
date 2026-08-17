package com.poudy.product.controller;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import com.poudy.excludecode.domain.ExcludeCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제품 조회")
class ProductQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("검색과 필터 결과를 정렬하고 페이지 정보 및 전체 결과 브랜드와 함께 반환한다")
    void findsProductPage() throws Exception {
        mockMvc.perform(
                get("/api/products")
                        .param("keyword", "토너")
                        .param("brandIds", "3")
                        .param("sort", "PRICE_ASC")
                        .param("page", "0")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(15L))
                .andExpect(jsonPath("$.items[0].name").value("PH 컨디션 토너"))
                .andExpect(jsonPath("$.items[0].brand.id").value(3L))
                .andExpect(jsonPath("$.items[0].price").value(15000L))
                .andExpect(jsonPath("$.pagination.totalElements").value(2L))
                .andExpect(jsonPath("$.pagination.hasNext").value(true))
                .andExpect(jsonPath("$.brands.length()").value(1))
                .andExpect(jsonPath("$.brands[0].id").value(3L));
    }

    @Test
    @DisplayName("목록과 같은 조건으로 제품 개수를 반환한다")
    void countsProducts() throws Exception {
        mockMvc.perform(get("/api/products/count").param("keyword", "토너").param("brandIds", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2L));
    }

    @Test
    @DisplayName("제품명 검색 제안을 실제 제품으로 반환한다")
    void suggestsProducts() throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", "블랙"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(1, 7, 10)))
                .andExpect(jsonPath("$.items[0].brandName").value("다 브랜드"));
    }

    @Test
    @DisplayName("제품 상세를 연관 도메인과 파생 정보로 반환한다")
    void findsProductDetail() throws Exception {
        mockMvc.perform(get("/api/products/15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(15L))
                .andExpect(jsonPath("$.brand.id").value(3L))
                .andExpect(jsonPath("$.categories[0].id").value(1L))
                .andExpect(jsonPath("$.categories[0].child.id").value(2L))
                .andExpect(jsonPath("$.variants.length()").value(2))
                .andExpect(jsonPath("$.variants[0].price").value(15000L))
                .andExpect(jsonPath("$.variants[1].price").value(23000L))
                .andExpect(jsonPath("$.ingredients[*].id").value(containsInAnyOrder(20, 9)))
                .andExpect(
                        jsonPath("$.freeOfCodes").value(
                                org.hamcrest.Matchers.not(
                                        org.hamcrest.Matchers.hasItem(ExcludeCode.FRAGRANCE_ALLERGENS.name()))))
                .andExpect(
                        jsonPath("$.freeOfCodes").value(
                                org.hamcrest.Matchers.hasItem(ExcludeCode.SULFATES.name())))
                .andExpect(jsonPath("$.updatedAt").value("2026-08-13T08:28:29.301Z"));
    }

    @Test
    @DisplayName("존재하지 않는 제품 상세는 404를 반환한다")
    void rejectsUnknownProduct() throws Exception {
        mockMvc.perform(get("/api/products/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.PRODUCT_NOT_FOUND.name()));
    }
}
