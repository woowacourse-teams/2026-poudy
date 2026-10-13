package com.poudy.security.auth.admin.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.auth.admin.ratelimit.AdminLoginRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
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
            "",
            "secret-test",
            "\"$2a$10$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW\"",
            "\\$2a\\$10\\$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW",
            "a$10$HiIu.Bhtz5V3lguUE38YZei4ONOGoLHp6R/SKBLfHCVxI7y02LsmW"
    })
    @DisplayName("비밀번호 해시가 비었거나 BCrypt 형식이 아니면 시작은 하되 어떤 비밀번호도 일치하지 않는다")
    void rejectsLoginWithoutValidHash(String hash) {
        AdminLoginService service = new AdminLoginService("admin-test", hash, rateLimiter);

        assertThat(service.matches("admin-test", "secret-test", "203.0.113.1")).isFalse();
        assertThat(service.matches("admin-test", hash, "203.0.113.1")).isFalse();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
            HASH,
            "$2y$10$4TczwLRuQVuUvLCGB..QjuoWttFpWtpfOuGwgyavSYWaXQZuE9OIm"
    })
    @DisplayName("BCrypt 해시와 비밀번호가 일치하면 로그인한다")
    void matchesBcryptHash(String hash) {
        AdminLoginService service = new AdminLoginService("admin-test", hash, rateLimiter);

        assertThat(service.matches("admin-test", "secret-test", "203.0.113.1")).isTrue();
    }
}
