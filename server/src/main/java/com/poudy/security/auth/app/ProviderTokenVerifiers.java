package com.poudy.security.auth.app;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ProviderTokenVerifiers {

    private final Map<OAuthProvider, ProviderTokenVerifier> verifiers;

    public ProviderTokenVerifiers(List<ProviderTokenVerifier> verifiers) {
        this.verifiers = verifiers.stream()
            .collect(Collectors.toMap(ProviderTokenVerifier::provider, Function.identity()));
    }

    public OAuthAccount verify(OAuthProvider provider, String token) {
        return verifiers.get(provider).verify(token);
    }
}
