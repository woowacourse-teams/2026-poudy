package com.poudy.member.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.member.repository.MemberRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("탈퇴 회원 보관 기간 정리")
class MemberRetentionServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-04T18:40:00Z"), ZoneOffset.UTC);

    private final MemberRepository memberRepository = mock(MemberRepository.class);

    @Test
    @DisplayName("탈퇴한 지 30일이 지난 회원을 지운다")
    void deletesMembersWithdrawnBeforeCutoff() {
        new MemberRetentionService(memberRepository, CLOCK, Duration.ofDays(30)).purgeExpired();

        verify(memberRepository).deleteWithdrawnBefore(OffsetDateTime.parse("2026-09-04T18:40:00Z"));
    }

    @Test
    @DisplayName("보관 기간이 0 이하면 시작하지 않는다")
    void rejectsNonPositiveMaxAge() {
        assertThatThrownBy(() -> new MemberRetentionService(memberRepository, CLOCK, Duration.ZERO))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
