package com.poudy.security.login.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.security.domain.AppLoginFailedException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

@DisplayName("앱 구글 ID 토큰 확인")
class GoogleAppTokenVerifierTest {

    private final JwtDecoder idTokens = mock(JwtDecoder.class);
    private final GoogleAppTokenVerifier verifier = new GoogleAppTokenVerifier(idTokens);

    @Test
    @DisplayName("검증된 구글 ID 토큰의 클레임으로 계정을 만든다")
    void readsGoogleAccount() {
        given(idTokens.decode("google-token")).willReturn(
            Jwt.withTokenValue("google-token")
                .header("alg", "RS256")
                .claims(
                    claims -> claims.putAll(Map.of("sub", "sub-1", "email", "member@gmail.com", "email_verified", true))
                )
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build()
        );

        OAuthAccount account = verifier.verify("google-token");

        assertThat(account.provider()).isEqualTo(OAuthProvider.GOOGLE);
        assertThat(account.providerId()).isEqualTo("sub-1");
        assertThat(account.verifiedEmail()).isEqualTo("member@gmail.com");
    }

    @Test
    @DisplayName("검증에 실패한 구글 ID 토큰은 로그인 실패로 본다")
    void rejectsInvalidGoogleToken() {
        given(idTokens.decode("forged")).willThrow(new BadJwtException("invalid audience"));

        assertThatThrownBy(() -> verifier.verify("forged")).isInstanceOf(AppLoginFailedException.class);
    }
}
