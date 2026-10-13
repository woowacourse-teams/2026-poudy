package com.poudy.security.auth.oauth;

import com.poudy.security.ClientOrigins;
import com.poudy.security.session.LoginChannel;
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
    public static final String CHANNEL_PARAMETER = "channel";
    public static final String APP_CHANNEL = "app";

    private static final String PROMPT = "prompt";
    private static final String SELECT_ACCOUNT = "select_account";

    private final DefaultOAuth2AuthorizationRequestResolver resolver;
    private final ClientOrigins clientOrigins;

    public RegisteredProviderRequestResolver(
        ClientRegistrationRepository clientRegistrationRepository,
        String authorizationBaseUri,
        ClientOrigins clientOrigins
    ) {
        this.clientOrigins = clientOrigins;
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
        return rememberingLoginStart(request, () -> resolver.resolve(request));
    }

    @Override
    public @Nullable OAuth2AuthorizationRequest resolve(
        @NonNull HttpServletRequest request,
        @NonNull String clientRegistrationId
    ) {
        return rememberingLoginStart(request, () -> resolver.resolve(request, clientRegistrationId));
    }

    private @Nullable OAuth2AuthorizationRequest rememberingLoginStart(
        HttpServletRequest request,
        Supplier<OAuth2AuthorizationRequest> resolution
    ) {
        OAuth2AuthorizationRequest authorization = registeredOnly(resolution);
        if (authorization != null) {
            loginStartOf(request, authorization.getState()).rememberIn(request);
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

    private OAuthLoginStart loginStartOf(HttpServletRequest request, String state) {
        return new OAuthLoginStart(
            state,
            clientOrigins.trustedOrigin(request.getParameter(RETURN_ORIGIN_PARAMETER)).orElse(null),
            channelOf(request)
        );
    }

    private LoginChannel channelOf(HttpServletRequest request) {
        if (APP_CHANNEL.equals(request.getParameter(CHANNEL_PARAMETER))) {
            return LoginChannel.APP;
        }
        return LoginChannel.WEB;
    }
}
