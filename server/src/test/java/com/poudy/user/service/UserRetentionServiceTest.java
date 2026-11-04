package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.user.domain.WithdrawnUserPurge;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

@DisplayName("탈퇴 회원 보관 기간 정리")
class UserRetentionServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-04T18:40:00Z"), ZoneOffset.UTC);

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PendingImageRepository pendingImageRepository = mock(PendingImageRepository.class);

    @Test
    @DisplayName("탈퇴한 지 30일이 지난 회원을 지우고, 지운 회원의 프로필 이미지만 지울 대상으로 넣는다")
    void deletesUsersWithdrawnBeforeCutoff() {
        OffsetDateTime cutoff = OffsetDateTime.parse("2026-09-04T18:40:00Z");
        UUID imageId = UUID.randomUUID();
        given(userRepository.deleteWithdrawnBefore(cutoff)).willReturn(new WithdrawnUserPurge(1, List.of(imageId)));

        new UserRetentionService(userRepository, pendingImageRepository, CLOCK, Duration.ofDays(30)).purgeExpired();

        InOrder order = inOrder(userRepository, pendingImageRepository);
        order.verify(userRepository).deleteWithdrawnBefore(cutoff);
        order.verify(pendingImageRepository).discard(List.of(imageId), ImagePurpose.PROFILE);
    }

    @Test
    @DisplayName("보관 기간이 0 이하면 시작하지 않는다")
    void rejectsNonPositiveMaxAge() {
        assertThatThrownBy(() -> new UserRetentionService(userRepository, pendingImageRepository, CLOCK, Duration.ZERO))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
