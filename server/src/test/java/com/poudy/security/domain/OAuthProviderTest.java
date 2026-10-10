package com.poudy.security.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("소셜 로그인 제공자")
class OAuthProviderTest {

    @Test
    @DisplayName("등록 ID로 제공자를 찾는다")
    void findsProviderByRegistrationId() {
        assertThat(OAuthProvider.from("kakao")).isEqualTo(OAuthProvider.KAKAO);
        assertThat(OAuthProvider.from("google")).isEqualTo(OAuthProvider.GOOGLE);
    }

    @Test
    @DisplayName("카카오 회원번호와 유효하고 인증된 이메일을 읽는다")
    void readsKakaoAccount() {
        OAuthAccount account = OAuthProvider.KAKAO.parseAccount(
            Map.of(
                "id",
                4_321_987_654L,
                "kakao_account",
                Map.of("email", "Member@Kakao.com", "is_email_valid", true, "is_email_verified", true)
            )
        );

        assertThat(account.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(account.providerId()).isEqualTo("4321987654");
        assertThat(account.verifiedEmail()).isEqualTo("member@kakao.com");
    }

    @Test
    @DisplayName("카카오 이메일이 유효하지 않으면 인증된 이메일로 보지 않는다")
    void rejectsInvalidKakaoEmail() {
        OAuthAccount account = OAuthProvider.KAKAO.parseAccount(
            Map.of(
                "id",
                1L,
                "kakao_account",
                Map.of("email", "member@kakao.com", "is_email_valid", false, "is_email_verified", true)
            )
        );

        assertThatThrownBy(account::verifiedEmail).isInstanceOf(UnverifiedOAuthEmailException.class);
    }

    @Test
    @DisplayName("카카오 계정 정보가 없으면 인증된 이메일로 보지 않는다")
    void rejectsMissingKakaoAccount() {
        OAuthAccount account = OAuthProvider.KAKAO.parseAccount(Map.of("id", 1L));

        assertThatThrownBy(account::verifiedEmail).isInstanceOf(UnverifiedOAuthEmailException.class);
    }

    @Test
    @DisplayName("카카오 회원번호가 없으면 계정을 만들지 않는다")
    void rejectsMissingKakaoId() {
        assertThatThrownBy(() -> OAuthProvider.KAKAO.parseAccount(Map.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("구글 sub와 인증된 이메일을 읽는다")
    void readsGoogleAccount() {
        OAuthAccount account = OAuthProvider.GOOGLE.parseAccount(
            Map.of("sub", "1098765", "email", "member@gmail.com", "email_verified", true)
        );

        assertThat(account.provider()).isEqualTo(OAuthProvider.GOOGLE);
        assertThat(account.providerId()).isEqualTo("1098765");
        assertThat(account.verifiedEmail()).isEqualTo("member@gmail.com");
    }

    @Test
    @DisplayName("구글 이메일이 인증되지 않았으면 인증된 이메일로 보지 않는다")
    void rejectsUnverifiedGoogleEmail() {
        OAuthAccount account = OAuthProvider.GOOGLE.parseAccount(
            Map.of("sub", "1098765", "email", "member@gmail.com", "email_verified", false)
        );

        assertThatThrownBy(account::verifiedEmail).isInstanceOf(UnverifiedOAuthEmailException.class);
    }
}
