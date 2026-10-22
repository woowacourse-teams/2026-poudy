package com.poudy.pushtoken.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.pushtoken.repository.PushTokenRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("푸시 토큰 보관 기간 정리")
class PushTokenRetentionServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-21T18:50:00Z"), ZoneOffset.UTC);

    private final PushTokenRepository pushTokenRepository = mock(PushTokenRepository.class);

    @Test
    @DisplayName("마지막으로 등록한 지 1년이 지난 토큰을 지운다")
    void deletesTokensRegisteredBeforeCutoff() {
        new PushTokenRetentionService(pushTokenRepository, CLOCK, Duration.ofDays(365)).purgeExpired();

        verify(pushTokenRepository).deleteRegisteredBefore(OffsetDateTime.parse("2025-10-21T18:50:00Z"));
    }

    @Test
    @DisplayName("보관 기간이 0 이하면 시작하지 않는다")
    void rejectsNonPositiveMaxAge() {
        assertThatThrownBy(() -> new PushTokenRetentionService(pushTokenRepository, CLOCK, Duration.ZERO))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
