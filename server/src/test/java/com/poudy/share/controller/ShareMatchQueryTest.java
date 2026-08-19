package com.poudy.share.controller;

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
@DisplayName("공유 텍스트 제품 식별")
class ShareMatchQueryTest {

    private static final String PATH = "/api/products/share-matches";
    private static final String TAIL = " 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/9ADBye4bKEJUpl";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("제품 하나로 확정하면 제품 ID 를 반환한다")
    void matchesSharedProduct() throws Exception {
        String text = "[단독기획] 다 브랜드 블랙 스네일 토너 150ml 기획 (+30ml 리필)" + TAIL;

        mockMvc.perform(get(PATH).param("text", text))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCHED"))
                .andExpect(jsonPath("$.productId").value(1L))
                .andExpect(jsonPath("$.keyword").doesNotExist());
    }

    @Test
    @DisplayName("기획명이 붙어 바로 찾지 못해도 축약 재검색으로 확정한다")
    void matchesAfterShortening() throws Exception {
        String text = "[1+1] 다 브랜드 블랙스네일 레티놀 콜라겐 마스크 100ml 기획" + TAIL;

        mockMvc.perform(get(PATH).param("text", text))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCHED"))
                .andExpect(jsonPath("$.productId").value(7L));
    }

    @Test
    @DisplayName("확정하지 못하면 검색에 넘길 검색어를 반환한다")
    void returnsKeywordWhenNotFound() throws Exception {
        String text = "[기획] 가 브랜드 브라이트닝 필링젤 기획 120ml" + TAIL;

        mockMvc.perform(get(PATH).param("text", text))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_FOUND"))
                .andExpect(jsonPath("$.keyword").value("브라이트닝 필링젤"))
                .andExpect(jsonPath("$.productId").doesNotExist());
    }

    @Test
    @DisplayName("공유 링크가 없으면 거절한다")
    void rejectsTextWithoutLink() throws Exception {
        mockMvc.perform(get(PATH).param("text", "다 브랜드 블랙 스네일 토너 150ml"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    @DisplayName("정제 후 제품명이 남지 않으면 거절한다")
    void rejectsShareWithoutProductName() throws Exception {
        mockMvc.perform(get(PATH).param("text", "https://oy.run/9ADBye4bKEJUpl"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    @DisplayName("빈 텍스트를 거절한다")
    void rejectsBlankText() throws Exception {
        mockMvc.perform(get(PATH).param("text", " "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }
}
