package com.poudy.security.auth.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제공자별 앱 토큰 확인")
class ProviderTokenVerifiersTest {

    private final ProviderTokenVerifiers verifiers = new ProviderTokenVerifiers(
        List.of(verifierOf(OAuthProvider.KAKAO), verifierOf(OAuthProvider.GOOGLE))
    );

    @Test
    @DisplayName("토큰의 제공자에 맞는 확인 방법으로 계정을 읽는다")
    void verifiesWithProviderVerifier() {
        assertThat(verifiers.verify(OAuthProvider.KAKAO, "token").provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(verifiers.verify(OAuthProvider.GOOGLE, "token").provider()).isEqualTo(OAuthProvider.GOOGLE);
    }

    private static ProviderTokenVerifier verifierOf(OAuthProvider provider) {
        return new ProviderTokenVerifier() {
            @Override
            public OAuthProvider provider() {
                return provider;
            }

            @Override
            public OAuthAccount verify(String token) {
                return new OAuthAccount(provider, token, "member@example.com", true);
            }
        };
    }
}
