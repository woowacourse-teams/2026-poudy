package com.poudy.productrequest.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import com.poudy.productrequest.service.ProductRequestService;
import com.poudy.productrequest.service.ProductRequestService.ProductRequestPage;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
@DisplayName("관리자 제품 등록 요청 API")
class AdminProductRequestControllerTest {

    private static final String PATH = "/api/admin/product-requests";
    private static final UUID REQUEST_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductRequestService productRequestService;

    @Test
    @DisplayName("상태로 제품 등록 요청 목록을 조회한다")
    void findsFilteredRequests() throws Exception {
        ProductRequest request = request();
        given(productRequestService.findAll(ProductRequestStatus.RECEIVED, 0, 20))
            .willReturn(new ProductRequestPage(List.of(request), 1));

        mockMvc.perform(get(PATH).queryParam("status", "RECEIVED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].requestId").value(REQUEST_ID.toString()))
            .andExpect(jsonPath("$.items[0].status").value("RECEIVED"))
            .andExpect(jsonPath("$.pagination.totalElements").value(1));
    }

    @Test
    @DisplayName("제품 등록 요청 상세를 조회한다")
    void findsRequestById() throws Exception {
        ProductRequest request = request();
        given(productRequestService.findById(REQUEST_ID)).willReturn(request);

        mockMvc.perform(get(PATH + "/{requestId}", REQUEST_ID))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.requestId").value(REQUEST_ID.toString()))
            .andExpect(jsonPath("$.productName").value("제품"))
            .andExpect(jsonPath("$.statusChangedAt").value("2026-09-15T09:00:00Z"));
    }

    @Test
    @DisplayName("제품 등록 요청 상태를 변경한다")
    void changesStatus() throws Exception {
        ProductRequest request = request();
        ProductRequest completed = request.changeStatus(
            ProductRequestStatus.COMPLETED,
            Clock.fixed(Instant.parse("2026-09-15T10:00:00Z"), ZoneOffset.UTC)
        );
        given(productRequestService.changeStatus(REQUEST_ID, ProductRequestStatus.COMPLETED)).willReturn(completed);

        mockMvc.perform(
            patch(PATH + "/{requestId}/status", REQUEST_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\"}")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.completedAt").value("2026-09-15T10:00:00Z"));

        verify(productRequestService).changeStatus(REQUEST_ID, ProductRequestStatus.COMPLETED);
    }

    private static ProductRequest request() {
        OffsetDateTime requestedAt = OffsetDateTime.parse("2026-09-15T09:00:00Z");
        return new ProductRequest(
            REQUEST_ID,
            "제품",
            "브랜드",
            requestedAt,
            ProductRequestStatus.RECEIVED,
            requestedAt,
            null
        );
    }
}
