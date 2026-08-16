package com.poudy.brand.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
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
                .andExpect(jsonPath("$.items.length()").value(15))
                .andExpect(
                        jsonPath("$.items[*].name")
                                .value(
                                        contains(
                                                "닥터지",
                                                "달바",
                                                "리쥬란",
                                                "메디큐브",
                                                "바이오더마",
                                                "브링그린",
                                                "비플레인",
                                                "센텔리안24",
                                                "셀퓨전씨",
                                                "아누아",
                                                "아비브",
                                                "아이소이",
                                                "에스네이처",
                                                "에스트라",
                                                "제로이드")))
                .andExpect(jsonPath("$.items[*].englishName").value(everyItem(equalTo(""))))
                .andExpect(jsonPath("$.items[*].imageUrl").value(everyItem(equalTo(""))))
                .andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.items[0].productCount").value(3))
                .andExpect(jsonPath("$.items[1].id").value(9))
                .andExpect(jsonPath("$.items[1].productCount").value(0))
                .andExpect(jsonPath("$.items[8].id").value(3))
                .andExpect(jsonPath("$.items[8].productCount").value(2))
                .andExpect(jsonPath("$.items[14].id").value(4))
                .andExpect(jsonPath("$.items[14].productCount").value(0));
    }
}
