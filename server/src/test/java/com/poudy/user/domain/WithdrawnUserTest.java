package com.poudy.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.WithdrawnAccount;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("탈퇴 회원")
class WithdrawnUserTest {

    @Test
    @DisplayName("탈퇴 시각에 보관 기간을 더한 시각까지 복구를 요청할 수 있다")
    void restorableUntilRetentionEnds() {
        OffsetDateTime withdrawnAt = OffsetDateTime.parse("2026-10-05T14:00:00+09:00");

        WithdrawnAccount account = new WithdrawnUser(OAuthProvider.KAKAO, "user@example.com", withdrawnAt)
            .keptFor(Duration.ofDays(30));

        assertThat(account).isEqualTo(
            new WithdrawnAccount(
                OAuthProvider.KAKAO,
                "user@example.com",
                withdrawnAt,
                OffsetDateTime.parse("2026-11-04T14:00:00+09:00")
            )
        );
    }
}
