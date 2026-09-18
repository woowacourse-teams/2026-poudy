package com.poudy.feedback.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.service.FeedbackService;
import com.poudy.feedback.service.FeedbackService.FeedbackPage;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("관리자 피드백 API")
class AdminFeedbackControllerTest {

    private static final String PATH = "/api/admin/feedbacks";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeedbackService feedbackService;

    @Test
    @DisplayName("상태와 유형으로 피드백 목록을 조회한다")
    void findsFilteredFeedbacks() throws Exception {
        Feedback feedback = feedback();
        given(feedbackService.findAll(FeedbackStatus.RECEIVED, FeedbackSubjectType.BUG_REPORT, 1, 20))
            .willReturn(new FeedbackPage(List.of(feedback), 1));

        mockMvc.perform(
            get(PATH)
                .queryParam("status", "RECEIVED")
                .queryParam("type", "BUG_REPORT")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].feedbackId").value(feedback.id().toString()))
            .andExpect(jsonPath("$.items[0].status").value("RECEIVED"))
            .andExpect(jsonPath("$.pagination.totalElements").value(1));
    }

    @Test
    @DisplayName("피드백 상세를 조회한다")
    void findsFeedbackById() throws Exception {
        Feedback feedback = feedback();
        given(feedbackService.findById(feedback.id())).willReturn(feedback);

        mockMvc.perform(get(PATH + "/{feedbackId}", feedback.id()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.feedbackId").value(feedback.id().toString()))
            .andExpect(jsonPath("$.content").value(feedback.content().value()))
            .andExpect(jsonPath("$.statusChangedAt").value("2026-08-23T12:34:56Z"));
    }

    @Test
    @DisplayName("제품 정보 정정 요청은 대상 제품 정보와 함께 조회한다")
    void findsProductCorrection() throws Exception {
        Feedback feedback = new Feedback(
            UUID.randomUUID(),
            new ProductCorrection(1L, "블랙 스네일 토너"),
            new FeedbackContent("전성분 표기가 실제 패키지와 달라요."),
            OffsetDateTime.parse("2026-08-23T12:34:56Z")
        );
        given(feedbackService.findById(feedback.id())).willReturn(feedback);

        mockMvc.perform(get(PATH + "/{feedbackId}", feedback.id()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.type").value("PRODUCT_CORRECTION"))
            .andExpect(jsonPath("$.path").isEmpty())
            .andExpect(jsonPath("$.productId").value(1L))
            .andExpect(jsonPath("$.productName").value("블랙 스네일 토너"));
    }

    @Test
    @DisplayName("피드백 상태를 변경한다")
    void changesStatus() throws Exception {
        Feedback feedback = feedback();
        given(feedbackService.changeStatus(feedback.id(), FeedbackStatus.IN_PROGRESS)).willReturn(feedback);

        mockMvc.perform(
            patch(PATH + "/{feedbackId}/status", feedback.id())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_PROGRESS\"}")
        )
            .andExpect(status().isOk());

        verify(feedbackService).changeStatus(feedback.id(), FeedbackStatus.IN_PROGRESS);
    }

    private static Feedback feedback() {
        return new Feedback(
            UUID.randomUUID(),
            new ServiceFeedback(FeedbackType.BUG_REPORT, FeedbackPath.from("/products/1")),
            new FeedbackContent("충분히 긴 피드백 내용입니다."),
            OffsetDateTime.parse("2026-08-23T12:34:56Z")
        );
    }
}
