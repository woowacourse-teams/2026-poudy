package com.poudy.security.login.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("앱 소셜 계정 읽기")
class AppSocialAccountReaderTest {

    private final AppSocialAccountReader reader = new AppSocialAccountReader(
        List.of(verifierOf(OAuthProvider.KAKAO), verifierOf(OAuthProvider.GOOGLE))
    );

    @Test
    @DisplayName("토큰의 제공자에 맞는 확인 방법으로 계정을 읽는다")
    void readsWithProviderVerifier() {
        assertThat(reader.read(new AppLoginCredential(OAuthProvider.KAKAO, "token")).provider())
            .isEqualTo(OAuthProvider.KAKAO);
        assertThat(reader.read(new AppLoginCredential(OAuthProvider.GOOGLE, "token")).provider())
            .isEqualTo(OAuthProvider.GOOGLE);
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
