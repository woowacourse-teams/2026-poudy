package com.poudy.security.auth.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

@DisplayName("구글 ID 토큰 검사")
class GoogleIdTokenValidatorTest {

    private static final String CLIENT_ID = "web-client.apps.googleusercontent.com";

    private final OAuth2TokenValidator<Jwt> validator = GoogleAppTokenVerifier.idTokenValidator(CLIENT_ID);

    @Test
    @DisplayName("구글이 우리 웹 클라이언트에 발급한 토큰은 통과시킨다")
    void acceptsTokenForOurClient() {
        assertThat(validator.validate(idToken("https://accounts.google.com", CLIENT_ID)).hasErrors()).isFalse();
        assertThat(validator.validate(idToken("accounts.google.com", CLIENT_ID)).hasErrors()).isFalse();
    }

    @Test
    @DisplayName("다른 클라이언트에 발급한 토큰은 거절한다")
    void rejectsTokenForOtherClient() {
        assertThat(
            validator.validate(idToken("https://accounts.google.com", "other.apps.googleusercontent.com")).hasErrors()
        )
            .isTrue();
    }

    @Test
    @DisplayName("구글이 아닌 곳에서 발급한 토큰은 거절한다")
    void rejectsTokenFromOtherIssuer() {
        assertThat(validator.validate(idToken("https://issuer.example.com", CLIENT_ID)).hasErrors()).isTrue();
    }

    private Jwt idToken(String issuer, String audience) {
        return Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .claim("iss", issuer)
            .audience(List.of(audience))
            .subject("sub-1")
            .issuedAt(Instant.now().minusSeconds(10))
            .expiresAt(Instant.now().plusSeconds(300))
            .build();
    }
}
