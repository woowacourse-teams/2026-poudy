package com.poudy.storage.controller;

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
@DisplayName("보관함 조회")
class StorageQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("요청한 순서대로 존재하는 실제 제품만 반환한다")
    void findsStoredProducts() throws Exception {
        mockMvc.perform(get("/api/storage").param("productIds", "15,999,1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(15L))
                .andExpect(jsonPath("$.items[0].name").value("PH 컨디션 토너"))
                .andExpect(jsonPath("$.items[1].id").value(1L))
                .andExpect(jsonPath("$.items[1].name").value("블랙 스네일 토너"));
    }
}
