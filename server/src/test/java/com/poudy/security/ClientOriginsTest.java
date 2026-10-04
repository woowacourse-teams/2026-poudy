package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

@DisplayName("프론트 오리진")
class ClientOriginsTest {

    @Test
    @DisplayName("와일드카드가 아닌 첫 오리진에 경로를 붙인다")
    void buildsUrlOnFirstExactOrigin() {
        ClientOrigins clientOrigins = ClientOrigins.from(
            List.of(" ", " https://*.preview.example.com ", " https://app.example.com ", "http://localhost:3000")
        );

        assertThat(clientOrigins.clientUrl("/login/callback")).isEqualTo("https://app.example.com/login/callback");
    }

    @Test
    @DisplayName("오리진이 없으면 같은 오리진의 경로를 돌려준다")
    void buildsSameOriginUrlWithoutOrigins() {
        assertThat(ClientOrigins.from(List.of()).clientUrl("/login/callback")).isEqualTo("/login/callback");
    }

    @Test
    @DisplayName("설정한 오리진과 패턴에 맞는 오리진만 허용한다")
    void allowsConfiguredOrigins() {
        ClientOrigins clientOrigins = ClientOrigins
            .from(List.of("https://app.example.com", "https://*.preview.example.com"));

        assertThat(clientOrigins.isAllowedOrigin("https://app.example.com")).isTrue();
        assertThat(clientOrigins.isAllowedOrigin("https://pr-3.preview.example.com")).isTrue();
        assertThat(clientOrigins.isAllowedOrigin("https://app.example.com.evil.com")).isFalse();
        assertThat(clientOrigins.isAllowedOrigin("null")).isFalse();
        assertThat(clientOrigins.isAllowedOrigin(null)).isFalse();
    }

    @Test
    @DisplayName("오리진이 없으면 아무 오리진도 허용하지 않고 CORS 설정도 만들지 않는다")
    void closesCorsWithoutOrigins() {
        ClientOrigins clientOrigins = ClientOrigins.from(List.of());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");

        assertThat(clientOrigins.isAllowedOrigin("https://app.example.com")).isFalse();
        assertThat(clientOrigins.corsConfigurationSource().getCorsConfiguration(request)).isNull();
    }
}
