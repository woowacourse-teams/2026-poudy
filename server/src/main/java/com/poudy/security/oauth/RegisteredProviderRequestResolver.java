package com.poudy.security.oauth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Supplier;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

public class RegisteredProviderRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final String PROMPT = "prompt";
    private static final String SELECT_ACCOUNT = "select_account";

    private final DefaultOAuth2AuthorizationRequestResolver resolver;

    public RegisteredProviderRequestResolver(
        ClientRegistrationRepository clientRegistrationRepository,
        String authorizationBaseUri
    ) {
        this.resolver = new DefaultOAuth2AuthorizationRequestResolver(
            clientRegistrationRepository,
            authorizationBaseUri
        );
        this.resolver.setAuthorizationRequestCustomizer(
            request -> request.additionalParameters(parameters -> parameters.put(PROMPT, SELECT_ACCOUNT))
        );
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(@NonNull HttpServletRequest request) {
        return registeredOnly(() -> resolver.resolve(request));
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(
        @NonNull HttpServletRequest request,
        @NonNull String clientRegistrationId
    ) {
        return registeredOnly(() -> resolver.resolve(request, clientRegistrationId));
    }

    private @Nullable OAuth2AuthorizationRequest registeredOnly(Supplier<OAuth2AuthorizationRequest> resolution) {
        try {
            return resolution.get();
        } catch (IllegalArgumentException unregisteredProvider) {
            return null;
        }
    }
}
