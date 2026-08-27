package com.poudy.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "poudy.cors.allowed-origins=")
@AutoConfigureMockMvc
@DisplayName("오리진을 비워 둔 CORS 설정")
class CorsDisabledTest {

    private static final String ORIGIN = "http://localhost:3000";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("사전 요청에 허용 헤더를 주지 않는다")
    void omitsAllowHeaderOnPreflight() throws Exception {
        mockMvc.perform(
            options("/api/products")
                .header(HttpHeaders.ORIGIN, ORIGIN)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
        )
            .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    @DisplayName("조회 응답에 허용 헤더를 주지 않는다")
    void omitsAllowHeader() throws Exception {
        mockMvc.perform(get("/api/products").header(HttpHeaders.ORIGIN, ORIGIN))
            .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
