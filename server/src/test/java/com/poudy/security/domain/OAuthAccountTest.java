package com.poudy.security.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("소셜 계정")
class OAuthAccountTest {

    @Test
    @DisplayName("인증된 이메일은 앞뒤 공백을 지우고 소문자로 정규화한다")
    void normalizesVerifiedEmail() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.GOOGLE, "sub", "  Member@Example.COM ", true);

        assertThat(account.verifiedEmail()).isEqualTo("member@example.com");
    }

    @Test
    @DisplayName("등록 ID에 맞는 제공자로 응답을 해석해 만든다")
    void createsFromProviderResponse() {
        OAuthAccount account = OAuthAccount.from(
            "google",
            Map.of("sub", "1098765", "email", "Member@Gmail.com", "email_verified", true)
        );

        assertThat(account.provider()).isEqualTo(OAuthProvider.GOOGLE);
        assertThat(account.providerId()).isEqualTo("1098765");
        assertThat(account.verifiedEmail()).isEqualTo("member@gmail.com");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("이메일이 없으면 인증된 이메일로 보지 않는다")
    void rejectsMissingEmail(String email) {
        OAuthAccount account = new OAuthAccount(OAuthProvider.GOOGLE, "sub", email, true);

        assertThatThrownBy(account::verifiedEmail).isInstanceOf(UnverifiedOAuthEmailException.class);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("제공자 식별자가 없으면 만들지 않는다")
    void rejectsMissingProviderId(String providerId) {
        assertThatThrownBy(() -> new OAuthAccount(OAuthProvider.KAKAO, providerId, "member@example.com", true))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
