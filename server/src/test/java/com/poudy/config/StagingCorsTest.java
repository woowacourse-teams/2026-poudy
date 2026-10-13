package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.ClientOrigins;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;

@DisplayName("staging CORS 설정")
class StagingCorsTest {

    private final ClientOrigins stagingOrigins = stagingOrigins();

    @ParameterizedTest
    @ValueSource(strings = {"https://pr-1.preview.poudy.site", "https://pr-617.preview.poudy.site"})
    @DisplayName("staging 배포와 같은 prod,staging 프로필에서 PR preview 오리진을 허용한다")
    void allowsPreviewOrigin(String origin) {
        assertThat(stagingOrigins.isAllowedOrigin(origin)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://poudy-staging.vercel.app",
            "https://preview.poudy.site",
            "https://pr-1.preview.poudy.site.attacker.com"
    })
    @DisplayName("staging 배포와 같은 prod,staging 프로필에서 PR preview 가 아닌 오리진은 허용하지 않는다")
    void rejectsOtherOrigins(String origin) {
        assertThat(stagingOrigins.isAllowedOrigin(origin)).isFalse();
    }

    private static ClientOrigins stagingOrigins() {
        SpringApplication application = new SpringApplication(EmptyConfiguration.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        try (ConfigurableApplicationContext context = application.run(
            "--spring.profiles.active=prod,staging",
            "--CLIENT_DOMAIN="
        )) {
            List<String> origins = Binder.get(context.getEnvironment())
                .bind("poudy.cors.allowed-origins", Bindable.listOf(String.class))
                .orElse(List.of());
            return ClientOrigins.from(origins);
        }
    }

    @Configuration(proxyBeanMethods = false)
    static class EmptyConfiguration {
    }
}
