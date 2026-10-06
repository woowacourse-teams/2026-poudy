package com.poudy.security.auth.oauth;

import com.poudy.security.ClientOrigins;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.oauth2.client.OAuth2LoginConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Component;

@Component
public class OAuthLoginConfigurer {

    public static final String AUTHORIZATION_BASE_URI = "/api/oauth2/authorization";
    private static final String REDIRECTION_BASE_URI = "/api/login/oauth2/code/*";
    private static final String UNSERVED_LOGIN_PAGE = "/login";

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final ClientOrigins clientOrigins;
    private final OAuthLoginHandler oauthLoginHandler;

    public OAuthLoginConfigurer(
        ClientRegistrationRepository clientRegistrationRepository,
        ClientOrigins clientOrigins,
        OAuthLoginHandler oauthLoginHandler
    ) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.clientOrigins = clientOrigins;
        this.oauthLoginHandler = oauthLoginHandler;
    }

    public void configure(OAuth2LoginConfigurer<HttpSecurity> login) {
        login
            .loginPage(UNSERVED_LOGIN_PAGE)
            .authorizationEndpoint(
                endpoint -> endpoint
                    .baseUri(AUTHORIZATION_BASE_URI)
                    .authorizationRequestResolver(
                        new RegisteredProviderRequestResolver(
                            clientRegistrationRepository,
                            AUTHORIZATION_BASE_URI,
                            clientOrigins
                        )
                    )
            )
            .redirectionEndpoint(endpoint -> endpoint.baseUri(REDIRECTION_BASE_URI))
            .authorizedClientRepository(new DiscardingAuthorizedClientRepository())
            .successHandler(oauthLoginHandler)
            .failureHandler(oauthLoginHandler);
    }
}
