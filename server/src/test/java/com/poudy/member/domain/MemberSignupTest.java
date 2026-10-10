package com.poudy.member.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.UnverifiedOAuthEmailException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원 가입 정보")
class MemberSignupTest {

    @Test
    @DisplayName("소셜 계정의 인증된 이메일을 정규화해 담는다")
    void holdsVerifiedEmail() {
        MemberSignup signup = MemberSignup
            .from(new OAuthAccount(OAuthProvider.KAKAO, "4321", " Member@Kakao.com ", true));

        assertThat(signup.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(signup.providerId()).isEqualTo("4321");
        assertThat(signup.email()).isEqualTo("member@kakao.com");
    }

    @Test
    @DisplayName("인증되지 않은 이메일의 소셜 계정으로는 만들지 않는다")
    void rejectsUnverifiedEmail() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@gmail.com", false);

        assertThatThrownBy(() -> MemberSignup.from(account)).isInstanceOf(UnverifiedOAuthEmailException.class);
    }
}
