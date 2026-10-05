package com.poudy.security.login.app;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.login.SocialAccountReader;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class AppSocialAccountReader implements SocialAccountReader<AppLoginCredential> {

    private final Map<OAuthProvider, ProviderTokenVerifier> verifiers;

    public AppSocialAccountReader(List<ProviderTokenVerifier> verifiers) {
        this.verifiers = verifiers.stream()
            .collect(Collectors.toMap(ProviderTokenVerifier::provider, Function.identity()));
    }

    @Override
    public OAuthAccount read(AppLoginCredential credential) {
        return verifiers.get(credential.provider()).verify(credential.value());
    }
}
