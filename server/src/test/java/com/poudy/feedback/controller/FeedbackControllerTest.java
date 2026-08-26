package com.poudy.feedback.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.InfrastructureException;
import com.poudy.exception.TooManyRequestsException;
import com.poudy.feedback.notification.FeedbackNotifier;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.repository.S3FeedbackRepository;
import com.poudy.feedback.service.FeedbackImageUploadService;
import com.poudy.feedback.service.FeedbackRateLimiter;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("의견 API")
class FeedbackControllerTest {

    private static final String PATH = "/api/feedback";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private S3FeedbackRepository feedbackRepository;

    @MockitoBean
    private S3FeedbackImageRepository imageRepository;

    @MockitoBean
    private FeedbackNotifier feedbackNotifier;

    @MockitoBean
    private FeedbackRateLimiter rateLimiter;

    @MockitoBean
    private FeedbackImageUploadService imageUploadService;

    @Test
    @DisplayName("유효한 의견을 등록하면 본문 없이 204를 반환한다")
    void submitsFeedback() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .header("X-Real-IP", "203.0.113.7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "DATA_CORRECTION",
                                  "content": "제품 정보가 실제 패키지와 달라요.",
                                  "path": "/products/12345"
                                }
                                """))
                .andExpect(status().isNoContent());

        verify(feedbackRepository).save(any());
        verify(feedbackNotifier).notify(any());
        verify(rateLimiter).requireAllowed("203.0.113.7");
    }

    @Test
    @DisplayName("유효한 이미지 배치를 업로드하면 요청 순서의 ID와 201을 반환한다")
    void uploadsFeedbackImages() throws Exception {
        UUID first = UUID.fromString("8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf");
        UUID second = UUID.fromString("6cacd90d-880d-4a6c-a921-7fb0a85b80d3");
        given(
                imageUploadService
                        .upload(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyString()))
                .willReturn(List.of(first, second));
        MockMultipartFile firstFile = new MockMultipartFile("images", "first.png", "image/png", new byte[] {1});
        MockMultipartFile secondFile = new MockMultipartFile("images", "second.jpg", "image/jpeg", new byte[] {2});

        mockMvc.perform(
                multipart(PATH + "/images")
                        .file(firstFile)
                        .file(secondFile)
                        .header("X-Real-IP", "203.0.113.7"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageIds[0]").value(first.toString()))
                .andExpect(jsonPath("$.imageIds[1]").value(second.toString()));

        verify(imageUploadService)
                .upload(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.eq("203.0.113.7"));
    }

    @Test
    @DisplayName("이미지 파트가 없는 업로드 요청을 거절한다")
    void rejectsMissingImagePart() throws Exception {
        mockMvc.perform(multipart(PATH + "/images"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_FEEDBACK_IMAGE"));

        verify(imageUploadService, never()).upload(any(), anyString());
    }

    @Test
    @DisplayName("정의하지 않은 의견 유형을 거절한다")
    void rejectsUnknownType() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "QUESTION",
                                  "content": "이 의견은 충분히 긴 내용입니다.",
                                  "path": "/"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("중복 이미지 ID를 외부 저장소 호출 전에 거절한다")
    void rejectsDuplicateImageIds() throws Exception {
        String imageId = "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf";

        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "OTHER",
                                  "content": "중복 이미지 ID를 거절하는 충분히 긴 의견입니다.",
                                  "path": "/",
                                  "imageIds": ["%s", "%s"]
                                }
                                """.formatted(imageId, imageId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_FEEDBACK_IMAGE_ID"));

        verify(imageRepository, never()).resolve(any(), any());
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("형식이 잘못된 이미지 ID를 이미지 ID 오류로 거절한다")
    void rejectsMalformedImageId() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "OTHER",
                                  "content": "형식이 잘못된 이미지 ID를 거절하는 의견입니다.",
                                  "path": "/",
                                  "imageIds": ["not-a-uuid"]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_FEEDBACK_IMAGE_ID"));

        verify(imageRepository, never()).resolve(any(), any());
    }

    @Test
    @DisplayName("null 이미지 ID를 이미지 ID 오류로 거절한다")
    void rejectsNullImageId() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "OTHER",
                                  "content": "null 이미지 ID를 거절하는 충분히 긴 의견입니다.",
                                  "path": "/",
                                  "imageIds": [null]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_FEEDBACK_IMAGE_ID"));

        verify(imageRepository, never()).resolve(any(), any());
    }

    @Test
    @DisplayName("공백을 제외하고 10자보다 짧은 의견을 거절한다")
    void rejectsShortContentAfterStripping() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "OTHER",
                                  "content": "짧 은 의 견 입 니 다",
                                  "path": "/"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("S3 저장에 실패하면 500을 반환하고 Discord를 호출하지 않는다")
    void returnsServerErrorWhenStorageFails() throws Exception {
        willThrow(new InfrastructureException("S3 실패")).given(feedbackRepository).save(any());

        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "BUG_REPORT",
                                  "content": "기능 버튼을 눌러도 화면이 바뀌지 않아요.",
                                  "path": "/products"
                                }
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));

        verify(feedbackNotifier, never()).notify(any());
    }

    @Test
    @DisplayName("Discord 알림에 실패해도 204를 반환한다")
    void keepsSuccessWhenNotificationFails() throws Exception {
        willThrow(new RuntimeException("Discord 실패")).given(feedbackNotifier).notify(any());

        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "IMPROVEMENT",
                                  "content": "검색 결과를 더 빠르게 보고 싶어요.",
                                  "path": "/products"
                                }
                                """))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("요청 제한을 넘으면 외부 호출 없이 429와 Retry-After를 반환한다")
    void rejectsTooManyRequests() throws Exception {
        willThrow(new TooManyRequestsException(Duration.ofSeconds(30)))
                .given(rateLimiter)
                .requireAllowed(anyString());

        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "OTHER",
                                  "content": "검색 결과를 더 빠르게 보고 싶어요.",
                                  "path": "/products"
                                }
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "30"))
                .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"));

        verify(feedbackRepository, never()).save(any());
        verify(feedbackNotifier, never()).notify(any());
    }
}
