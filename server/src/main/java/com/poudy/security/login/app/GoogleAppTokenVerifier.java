package com.poudy.security.login.app;

import com.poudy.security.domain.AppLoginFailedException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.util.Collection;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class GoogleAppTokenVerifier implements ProviderTokenVerifier {

    private static final String JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final List<String> ISSUERS = List.of("accounts.google.com", "https://accounts.google.com");

    private final JwtDecoder idTokens;

    @Autowired
    public GoogleAppTokenVerifier(
        @Value("${spring.security.oauth2.client.registration.google.client-id}") String clientId
    ) {
        this(idTokenDecoder(clientId));
    }

    public GoogleAppTokenVerifier(JwtDecoder idTokens) {
        this.idTokens = idTokens;
    }

    public static OAuth2TokenValidator<Jwt> idTokenValidator(String clientId) {
        return new DelegatingOAuth2TokenValidator<>(
            new JwtTimestampValidator(),
            new JwtClaimValidator<Object>(JwtClaimNames.ISS, issuer -> ISSUERS.contains(String.valueOf(issuer))),
            new JwtClaimValidator<Object>(JwtClaimNames.AUD, audience -> includes(audience, clientId))
        );
    }

    @Override
    public OAuthProvider provider() {
        return OAuthProvider.GOOGLE;
    }

    @Override
    public OAuthAccount verify(String token) {
        try {
            return OAuthProvider.GOOGLE.parseAccount(idTokens.decode(token).getClaims());
        } catch (JwtException rejected) {
            throw new AppLoginFailedException();
        }
    }

    private static JwtDecoder idTokenDecoder(String clientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(JWK_SET_URI)
            .restOperations(new RestTemplate(TimeoutRequestFactory.create()))
            .build();
        decoder.setJwtValidator(idTokenValidator(clientId));
        return decoder;
    }

    private static boolean includes(Object audience, String clientId) {
        if (audience instanceof Collection<?> audiences) {
            return audiences.contains(clientId);
        }
        return clientId.equals(audience);
    }
}
