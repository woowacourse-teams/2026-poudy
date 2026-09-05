package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.poudy.feedback.repository.S3FeedbackImageRepository;
import java.io.IOException;
import java.lang.reflect.Method;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;

@DisplayName("의견 이미지 조정 스케줄")
class FeedbackImageReconcilerTest {

    private static final Instant NOW = Instant.parse("2026-09-02T00:00:00Z");

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withBean(S3FeedbackImageRepository.class, () -> mock(S3FeedbackImageRepository.class))
        .withBean("feedbackClock", Clock.class, () -> Clock.fixed(NOW, ZoneOffset.UTC))
        .withUserConfiguration(FeedbackImageReconciler.class);

    @Test
    @DisplayName("claim 조정은 최초 1분 후 실행하고 이후 5분 간격으로 실행한다")
    void schedulesClaimReconciliationEveryFiveMinutes() throws NoSuchMethodException, IOException {
        Method method = FeedbackImageReconciler.class.getDeclaredMethod("reconcileClaims");
        Scheduled scheduled = method.getAnnotation(Scheduled.class);

        assertThat(scheduled.fixedDelayString())
            .isEqualTo("${poudy.feedback.image-reconciliation.claim-interval:PT5M}");
        assertThat(scheduled.initialDelayString())
            .isEqualTo("${poudy.feedback.image-reconciliation.claim-initial-delay:PT1M}");

        PropertySource<?> properties = new YamlPropertySourceLoader()
            .load("application", new ClassPathResource("application.yml"))
            .getFirst();
        assertThat(properties.getProperty("poudy.feedback.image-reconciliation.claim-interval"))
            .isEqualTo("PT5M");
    }

    @Test
    @DisplayName("기본 개발 환경에서는 이미지 정리 스케줄러를 만들지 않는다")
    void disablesReconciliationByDefault() {
        contextRunner.run(context -> assertThat(context).doesNotHaveBean(FeedbackImageReconciler.class));
    }

    @Test
    @DisplayName("운영 설정에서 이미지 정리 스케줄러를 활성화한다")
    void enablesReconciliationForProductionConfiguration() throws IOException {
        PropertySource<?> defaults = loadProperties("application.yml");
        PropertySource<?> production = loadProperties("application-prod.yml");

        assertThat(defaults.getProperty("poudy.feedback.image-reconciliation.enabled")).isEqualTo(false);
        assertThat(production.getProperty("poudy.feedback.image-reconciliation.enabled")).isEqualTo(true);
        contextRunner
            .withPropertyValues("poudy.feedback.image-reconciliation.enabled=true")
            .run(context -> assertThat(context).hasSingleBean(FeedbackImageReconciler.class));
    }

    private static PropertySource<?> loadProperties(String resource) throws IOException {
        return new YamlPropertySourceLoader()
            .load(resource, new ClassPathResource(resource))
            .getFirst();
    }
}
