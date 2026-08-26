package com.poudy.brand.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("브랜드 조회")
class BrandListTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("전체 브랜드를 이름순으로 제품 수와 함께 조회한다")
    void findsBrandsWithProductCounts() throws Exception {
        mockMvc.perform(get("/api/brands")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[*].name").value(contains("가 브랜드", "나 브랜드", "다 브랜드")))
                .andExpect(jsonPath("$.items[*].englishName").value(everyItem(nullValue())))
                .andExpect(jsonPath("$.items[*].imageUrl").value(everyItem(nullValue())))
                .andExpect(jsonPath("$.items[0].id").value(2))
                .andExpect(jsonPath("$.items[0].productCount").value(0))
                .andExpect(jsonPath("$.items[1].id").value(3))
                .andExpect(jsonPath("$.items[1].productCount").value(2))
                .andExpect(jsonPath("$.items[2].id").value(1))
                .andExpect(jsonPath("$.items[2].productCount").value(3));
    }
}
