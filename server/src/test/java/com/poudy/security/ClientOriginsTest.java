package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;

@DisplayName("프론트 오리진")
class ClientOriginsTest {

    @Test
    @DisplayName("와일드카드가 아닌 첫 오리진을 기본 오리진으로 쓴다")
    void usesFirstExactOriginAsDefault() {
        ClientOrigins clientOrigins = ClientOrigins.from(
            List.of(" ", " https://*.preview.example.com ", " https://app.example.com ", "http://localhost:3000")
        );

        assertThat(clientOrigins.defaultOrigin()).isEqualTo("https://app.example.com");
    }

    @Test
    @DisplayName("오리진이 없으면 같은 오리진을 뜻하는 빈 기본 오리진을 돌려준다")
    void usesSameOriginWithoutOrigins() {
        assertThat(ClientOrigins.from(List.of()).defaultOrigin()).isEmpty();
    }

    @Test
    @DisplayName("허용한 오리진과 정확히 같은 형태의 값만 믿는다")
    void trustsAllowedBareOrigin() {
        ClientOrigins clientOrigins = ClientOrigins
            .from(List.of("https://staging-app.poudy.site", "https://*.preview.poudy.site"));

        assertThat(clientOrigins.trustedOrigin("https://pr-111.preview.poudy.site"))
            .contains("https://pr-111.preview.poudy.site");
        assertThat(clientOrigins.trustedOrigin("https://staging-app.poudy.site"))
            .contains("https://staging-app.poudy.site");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://evil.com",
            "https://pr-111.preview.poudy.site.evil.com",
            "http://pr-111.preview.poudy.site",
            "//pr-111.preview.poudy.site",
            "https://evil.com@pr-111.preview.poudy.site",
            "https://pr-111.preview.poudy.site/other",
            "https://pr-111.preview.poudy.site?next=evil",
            "https://pr-111.preview.poudy.site#evil",
            "https://evil.com/.preview.poudy.site",
            "https://evil.com?.preview.poudy.site",
            "https://evil.com#.preview.poudy.site",
            "https://[",
            "null",
            ""
    })
    @DisplayName("허용하지 않았거나 오리진 형태가 아닌 값은 믿지 않는다")
    void distrustsUntrustedOrNonOriginValues(String candidate) {
        ClientOrigins clientOrigins = ClientOrigins
            .from(List.of("https://staging-app.poudy.site", "https://*.preview.poudy.site"));

        assertThat(clientOrigins.trustedOrigin(candidate)).isEmpty();
    }

    @Test
    @DisplayName("허용 오리진이 없는 운영 설정에서는 어떤 값도 믿지 않는다")
    void distrustsEverythingWithoutOrigins() {
        assertThat(ClientOrigins.from(List.of()).trustedOrigin("https://pr-111.preview.poudy.site")).isEmpty();
        assertThat(ClientOrigins.from(List.of()).trustedOrigin(null)).isEmpty();
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
