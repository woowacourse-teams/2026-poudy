package com.poudy.security.auth.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.security.auth.admin.ratelimit.AdminLoginRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("관리자 로그인 서비스")
class AdminLoginServiceTest {

    private static final String HASH = "$2a$10$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW";

    private final AdminLoginRateLimiter rateLimiter = new AdminLoginRateLimiter(
        5,
        Duration.ofMinutes(1),
        Clock.systemUTC()
    );

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
            "secret-test",
            "\"$2a$10$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW\"",
            "\\$2a\\$10\\$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW",
            "a$10$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW"
    })
    @DisplayName("비밀번호 해시가 BCrypt 형식이 아니면 시작하지 않는다")
    void rejectsMalformedHash(String hash) {
        assertThatThrownBy(() -> new AdminLoginService("admin-test", hash, rateLimiter))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
            HASH,
            "$2y$10$yrqYDjG.0RRYwcnB1m3FR.u5J4aY8jCkJcV/GAQQyzLJQbF1Sx9Te",
            ""
    })
    @DisplayName("BCrypt 해시와 설정하지 않은 빈 값은 받는다")
    void acceptsBcryptHashOrEmpty(String hash) {
        assertThatNoException().isThrownBy(() -> new AdminLoginService("admin-test", hash, rateLimiter));
    }

    @Test
    @DisplayName("해시를 설정하지 않으면 어떤 비밀번호도 일치하지 않는다")
    void rejectsLoginWithoutHash() {
        AdminLoginService service = new AdminLoginService("admin-test", "", rateLimiter);

        assertThat(service.matches("admin-test", "", "203.0.113.1")).isFalse();
        assertThat(service.matches("admin-test", "secret-test", "203.0.113.1")).isFalse();
    }
}
