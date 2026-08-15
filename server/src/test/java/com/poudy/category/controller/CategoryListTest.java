package com.poudy.category.controller;

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
@DisplayName("카테고리 조회")
class CategoryListTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("전체 카테고리를 계층 구조와 제품 수로 조회한다")
    void findsCategoriesWithProductCounts() throws Exception {
        mockMvc.perform(get("/api/categories")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2)).andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.items[0].name").value("스킨케어"))
                .andExpect(jsonPath("$.items[0].productCount").value(4))
                .andExpect(jsonPath("$.items[0].children.length()").value(2))
                .andExpect(jsonPath("$.items[0].children[0].id").value(2))
                .andExpect(jsonPath("$.items[0].children[0].name").value("스킨/토너"))
                .andExpect(jsonPath("$.items[0].children[0].productCount").value(3))
                .andExpect(jsonPath("$.items[0].children[1].id").value(3))
                .andExpect(jsonPath("$.items[0].children[1].name").value("에센스/세럼/앰플"))
                .andExpect(jsonPath("$.items[0].children[1].productCount").value(1))
                .andExpect(jsonPath("$.items[1].id").value(13)).andExpect(jsonPath("$.items[1].name").value("선케어"))
                .andExpect(jsonPath("$.items[1].productCount").value(1))
                .andExpect(jsonPath("$.items[1].children.length()").value(1))
                .andExpect(jsonPath("$.items[1].children[0].id").value(14))
                .andExpect(jsonPath("$.items[1].children[0].name").value("선크림"))
                .andExpect(jsonPath("$.items[1].children[0].productCount").value(1));
    }
}
