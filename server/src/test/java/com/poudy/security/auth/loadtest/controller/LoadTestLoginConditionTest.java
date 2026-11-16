package com.poudy.security.auth.loadtest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.poudy.security.auth.SocialLogin;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

@DisplayName("부하 시험 로그인 활성 조건")
class LoadTestLoginConditionTest {

    private static final String SECRET = "poudy.loadtest.secret=0123456789abcdef0123456789abcdef";

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withBean(SocialLogin.class, () -> mock(SocialLogin.class))
        .withUserConfiguration(LoadTestLoginController.class);

    @Test
    @DisplayName("staging 프로필에 비밀값이 있을 때만 열린다")
    void opensOnStagingWithSecret() {
        runner.withPropertyValues("spring.profiles.active=prod,staging", SECRET)
            .run(context -> assertThat(context).hasSingleBean(LoadTestLoginController.class));
    }

    @Test
    @DisplayName("운영 프로필에서는 비밀값이 있어도 열리지 않는다")
    void staysClosedOnProduction() {
        runner.withPropertyValues("spring.profiles.active=prod", SECRET)
            .run(context -> assertThat(context).doesNotHaveBean(LoadTestLoginController.class));
    }

    @Test
    @DisplayName("staging 이어도 비밀값이 없으면 열리지 않는다")
    void staysClosedWithoutSecret() {
        runner.withPropertyValues("spring.profiles.active=prod,staging")
            .run(context -> assertThat(context).doesNotHaveBean(LoadTestLoginController.class));
    }

    @Test
    @DisplayName("staging 에 약한 비밀값을 두면 기동하지 않는다")
    void failsOnWeakSecret() {
        runner.withPropertyValues("spring.profiles.active=prod,staging", "poudy.loadtest.secret=")
            .run(context -> assertThat(context).hasFailed());
    }
}
