package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("탈퇴 회원 보관 기간 정리")
class UserRetentionServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-04T18:40:00Z"), ZoneOffset.UTC);

    private final UserRepository userRepository = mock(UserRepository.class);

    @Test
    @DisplayName("탈퇴한 지 30일이 지난 회원을 지운다")
    void deletesUsersWithdrawnBeforeCutoff() {
        new UserRetentionService(userRepository, CLOCK, Duration.ofDays(30)).purgeExpired();

        verify(userRepository).deleteWithdrawnBefore(OffsetDateTime.parse("2026-09-04T18:40:00Z"));
    }

    @Test
    @DisplayName("보관 기간이 0 이하면 시작하지 않는다")
    void rejectsNonPositiveMaxAge() {
        assertThatThrownBy(() -> new UserRetentionService(userRepository, CLOCK, Duration.ZERO))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
