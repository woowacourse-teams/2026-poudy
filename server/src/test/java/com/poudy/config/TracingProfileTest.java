package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@DisplayName("트레이스 프로필 설정")
class TracingProfileTest {

    @Test
    @DisplayName("staging 배포와 같은 prod,staging 프로필은 모든 요청을 샘플링해 로컬 Alloy 로 내보낸다")
    void stagingExportsTraces() {
        try (ConfigurableApplicationContext context = run("prod,staging")) {
            Environment environment = context.getEnvironment();
            assertThat(environment.getProperty("management.tracing.export.enabled", Boolean.class)).isTrue();
            assertThat(environment.getProperty("management.tracing.sampling.probability", Double.class))
                .isEqualTo(1.0);
            assertThat(environment.getProperty("management.opentelemetry.tracing.export.otlp.endpoint"))
                .isEqualTo("http://127.0.0.1:4318/v1/traces");
            assertThat(environment.getProperty("jdbc.datasource-proxy.enabled", Boolean.class)).isTrue();
            assertThat(environment.getProperty("jdbc.datasource-proxy.include-parameter-values", Boolean.class))
                .isFalse();
        }
    }

    @Test
    @DisplayName("운영 프로필은 트레이스를 내보내지 않고 SQL 프록시도 켜지 않는다")
    void productionDoesNotExportTraces() {
        try (ConfigurableApplicationContext context = run("prod")) {
            Environment environment = context.getEnvironment();
            assertThat(environment.getProperty("management.tracing.export.enabled", Boolean.class)).isFalse();
            assertThat(environment.getProperty("management.tracing.sampling.probability", Double.class))
                .isZero();
            assertThat(environment.getProperty("management.opentelemetry.tracing.export.otlp.endpoint")).isNull();
            assertThat(environment.getProperty("jdbc.datasource-proxy.enabled", Boolean.class)).isFalse();
            assertThat(environment.getProperty("management.otlp.metrics.export.enabled", Boolean.class)).isFalse();
        }
    }

    private static ConfigurableApplicationContext run(String profiles) {
        SpringApplication application = new SpringApplication(EmptyConfiguration.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        return application.run("--spring.profiles.active=" + profiles, "--CLIENT_DOMAIN=");
    }

    @Configuration(proxyBeanMethods = false)
    static class EmptyConfiguration {
    }
}
