package com.poudy.productrequest.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.TooManyRequestsException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.service.ProductRequestService;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제품 등록 요청 API")
class ProductRequestControllerTest {

    private static final String PATH = "/api/product-requests";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductRequestService productRequestService;

    @Test
    @DisplayName("유효한 요청을 정규화해 접수하고 빈 본문으로 202를 반환한다")
    void acceptsNormalizedRequestWithEmptyBody() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .header("X-Real-IP", "203.0.113.8")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productName":"  제품 이름  ","brandName":" 브랜드 이름 "}
                                """))
                .andExpect(status().isAccepted())
                .andExpect(content().string(""));

        ArgumentCaptor<String> productName = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> brandName = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> clientAddress = ArgumentCaptor.forClass(String.class);
        verify(productRequestService).submit(productName.capture(), brandName.capture(), clientAddress.capture());
        org.assertj.core.api.Assertions.assertThat(productName.getValue()).isEqualTo("  제품 이름  ");
        org.assertj.core.api.Assertions.assertThat(brandName.getValue()).isEqualTo(" 브랜드 이름 ");
        org.assertj.core.api.Assertions.assertThat(clientAddress.getValue()).isEqualTo("203.0.113.8");
    }

    @Test
    @DisplayName("브랜드명을 생략할 수 있다")
    void acceptsMissingBrandName() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productName":"제품"}
                                """))
                .andExpect(status().isAccepted());
    }

    @Test
    @DisplayName("공백 제품명은 외부 흐름을 호출하지 않고 INVALID_REQUEST_BODY로 거절한다")
    void rejectsBlankProductName() throws Exception {
        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productName":"   "}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        verify(productRequestService, never()).submit(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("경계 길이를 넘는 제품명과 브랜드명은 거절한다")
    void rejectsTooLongNames() throws Exception {
        String body = """
                {"productName":"%s","brandName":"%s"}
                """.formatted(
                "가".repeat(ProductRequest.MAX_PRODUCT_NAME_LENGTH + 1),
                "나".repeat(ProductRequest.MAX_BRAND_NAME_LENGTH + 1));

        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    @DisplayName("잘못된 JSON은 INVALID_REQUEST_BODY로 거절한다")
    void rejectsMalformedJson() throws Exception {
        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content("{\"productName\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    @DisplayName("요청 제한을 넘으면 429와 Retry-After를 반환한다")
    void rejectsTooManyRequests() throws Exception {
        willThrow(new TooManyRequestsException(Duration.ofSeconds(30)))
                .given(productRequestService)
                .submit(anyString(), any(), anyString());

        mockMvc.perform(
                post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productName":"제품"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "30"))
                .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"));
    }
}
