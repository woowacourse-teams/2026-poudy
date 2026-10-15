package com.poudy.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SocialLoginResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원")
class UserTest {

    @Test
    @DisplayName("탈퇴하지 않은 회원은 로그인한다")
    void signsInActiveUser() {
        SocialLoginResult result = userOf(UserStatus.ACTIVE).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.SIGNED_IN);
        assertThat(result.userId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("탈퇴한 회원은 로그인하지 않고 탈퇴 회원임을 알린다")
    void reportsWithdrawnUser() {
        SocialLoginResult result = userOf(UserStatus.WITHDRAWN).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.WITHDRAWN);
        assertThat(result.userId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원은 로그인하지 않고 복구 요청 중임을 알린다")
    void reportsRestoreRequestedUser() {
        SocialLoginResult result = userOf(UserStatus.RESTORE_REQUESTED).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.RESTORE_REQUESTED);
        assertThat(result.userId()).isEqualTo(1L);
    }

    private User userOf(UserStatus status) {
        return new User(1L, OAuthProvider.KAKAO, "user@example.com", null, null, null, null, status);
    }
}
