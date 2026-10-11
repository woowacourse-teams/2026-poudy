package com.poudy.member.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SocialLoginResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원")
class MemberTest {

    @Test
    @DisplayName("탈퇴하지 않은 회원은 로그인한다")
    void signsInActiveMember() {
        SocialLoginResult result = memberOf(MemberStatus.ACTIVE).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.SIGNED_IN);
        assertThat(result.memberId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("탈퇴한 회원은 로그인하지 않고 탈퇴 회원임을 알린다")
    void reportsWithdrawnMember() {
        SocialLoginResult result = memberOf(MemberStatus.WITHDRAWN).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.WITHDRAWN);
        assertThat(result.memberId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원은 로그인하지 않고 복구 요청 중임을 알린다")
    void reportsRestoreRequestedMember() {
        SocialLoginResult result = memberOf(MemberStatus.RESTORE_REQUESTED).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.RESTORE_REQUESTED);
        assertThat(result.memberId()).isEqualTo(1L);
    }

    private Member memberOf(MemberStatus status) {
        return new Member(1L, OAuthProvider.KAKAO, "member@example.com", null, null, null, status);
    }
}
