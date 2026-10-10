package com.poudy.security.session;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.apache.catalina.Session;
import org.apache.catalina.session.StandardManager;
import org.apache.catalina.session.StandardSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@DisplayName("배포로 종료할 때 저장하는 세션의 유예")
class PersistedSessionGraceTest {

    private static final Instant STOPPED_AT = Instant.parse("2026-10-10T00:00:00Z");
    private static final int IDLE_SECONDS = 600;

    @Test
    @DisplayName("비활동 만료까지 5분이 안 남은 세션은 5분 늘린다")
    void extendsSessionAboutToIdleOut() {
        StandardSession session = sessionAccessedBefore(Duration.ofMinutes(8));

        grace().extend(new Session[] {session});

        assertThat(session.getMaxInactiveInterval()).isEqualTo(IDLE_SECONDS + 300);
    }

    @Test
    @DisplayName("비활동 만료가 막 지난 세션도 5분 늘린다")
    void extendsSessionJustIdledOut() {
        StandardSession session = sessionAccessedBefore(Duration.ofMinutes(11));

        grace().extend(new Session[] {session});

        assertThat(session.getMaxInactiveInterval()).isEqualTo(IDLE_SECONDS + 300);
    }

    @Test
    @DisplayName("비활동 만료까지 5분 이상 남은 세션은 그대로 둔다")
    void keepsSessionWithEnoughTime() {
        StandardSession session = sessionAccessedBefore(Duration.ofMinutes(1));

        grace().extend(new Session[] {session});

        assertThat(session.getMaxInactiveInterval()).isEqualTo(IDLE_SECONDS);
    }

    @Test
    @DisplayName("비활동 만료가 없는 세션은 그대로 둔다")
    void keepsSessionWithoutIdleTimeout() {
        StandardSession session = sessionAccessedBefore(Duration.ofDays(30));
        session.setMaxInactiveInterval(-1);

        grace().extend(new Session[] {session});

        assertThat(session.getMaxInactiveInterval()).isEqualTo(-1);
    }

    private StandardSession sessionAccessedBefore(Duration elapsed) {
        StandardSession session = new StandardSession(new StandardManager());
        session.setValid(true);
        session.setCreationTime(STOPPED_AT.minus(elapsed).toEpochMilli());
        session.setMaxInactiveInterval(IDLE_SECONDS);
        return session;
    }

    private PersistedSessionGrace grace() {
        Clock clock = Clock.fixed(STOPPED_AT, ZoneOffset.UTC);
        LoginSession loginSession = new LoginSession(
            Duration.ofDays(1),
            Duration.ofDays(7),
            Duration.ofHours(1),
            Duration.ofHours(12),
            clock,
            new HttpSessionSecurityContextRepository()
        );
        return new PersistedSessionGrace(loginSession, clock);
    }
}
