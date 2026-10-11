package com.poudy.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.profiles.include=staging")
@AutoConfigureMockMvc
@DisplayName("staging CORS 설정")
class StagingCorsTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"https://pr-1.preview.poudy.site", "https://pr-617.preview.poudy.site"})
    @DisplayName("PR preview 오리진의 조회 응답에 허용 헤더를 준다")
    void allowsPreviewOrigin(String origin) throws Exception {
        mockMvc.perform(get("/api/products").header(HttpHeaders.ORIGIN, origin))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://poudy-staging.vercel.app",
            "https://preview.poudy.site",
            "https://pr-1.preview.poudy.site.attacker.com"
    })
    @DisplayName("PR preview 가 아닌 오리진에는 허용 헤더를 주지 않는다")
    void omitsOtherOrigins(String origin) throws Exception {
        mockMvc.perform(get("/api/products").header(HttpHeaders.ORIGIN, origin))
            .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
