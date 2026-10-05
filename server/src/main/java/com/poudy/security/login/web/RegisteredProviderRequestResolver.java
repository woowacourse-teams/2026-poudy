package com.poudy.security.login.web;

import com.poudy.security.ClientOrigins;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Supplier;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

public class RegisteredProviderRequestResolver implements OAuth2AuthorizationRequestResolver {

    public static final String RETURN_ORIGIN_PARAMETER = "returnOrigin";

    private static final String PROMPT = "prompt";
    private static final String SELECT_ACCOUNT = "select_account";

    private final DefaultOAuth2AuthorizationRequestResolver resolver;
    private final ClientOrigins clientOrigins;
    private final LoginSession loginSession;

    public RegisteredProviderRequestResolver(
        ClientRegistrationRepository clientRegistrationRepository,
        String authorizationBaseUri,
        ClientOrigins clientOrigins,
        LoginSession loginSession
    ) {
        this.clientOrigins = clientOrigins;
        this.loginSession = loginSession;
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
        return rememberingReturnOrigin(request, () -> resolver.resolve(request));
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(
        @NonNull HttpServletRequest request,
        @NonNull String clientRegistrationId
    ) {
        return rememberingReturnOrigin(request, () -> resolver.resolve(request, clientRegistrationId));
    }

    private @Nullable OAuth2AuthorizationRequest rememberingReturnOrigin(
        HttpServletRequest request,
        Supplier<OAuth2AuthorizationRequest> resolution
    ) {
        OAuth2AuthorizationRequest authorization = registeredOnly(resolution);
        if (authorization != null) {
            rememberReturnOrigin(request, authorization.getState());
        }
        return authorization;
    }

    private @Nullable OAuth2AuthorizationRequest registeredOnly(Supplier<OAuth2AuthorizationRequest> resolution) {
        try {
            return resolution.get();
        } catch (IllegalArgumentException unregisteredProvider) {
            return null;
        }
    }

    private void rememberReturnOrigin(HttpServletRequest request, String state) {
        clientOrigins.trustedOrigin(request.getParameter(RETURN_ORIGIN_PARAMETER)).ifPresentOrElse(
            origin -> loginSession.rememberReturnOrigin(origin, state, request),
            () -> loginSession.forgetReturnOrigin(request)
        );
    }
}
