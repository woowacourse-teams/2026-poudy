package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.lang.reflect.Method;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;

@DisplayName("의견 이미지 조정 스케줄")
class FeedbackImageReconcilerTest {

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
}
