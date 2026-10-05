package com.poudy.security.login.web;

import com.poudy.security.ClientOrigins;
import com.poudy.security.session.LoginSession;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.oauth2.client.OAuth2LoginConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Component;

@Component
public class WebLoginConfigurer {

    public static final String AUTHORIZATION_BASE_URI = "/api/oauth2/authorization";
    private static final String REDIRECTION_BASE_URI = "/api/login/oauth2/code/*";
    private static final String UNSERVED_LOGIN_PAGE = "/login";

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final ClientOrigins clientOrigins;
    private final LoginSession loginSession;
    private final WebLoginHandler webLoginHandler;

    public WebLoginConfigurer(
        ClientRegistrationRepository clientRegistrationRepository,
        ClientOrigins clientOrigins,
        LoginSession loginSession,
        WebLoginHandler webLoginHandler
    ) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.clientOrigins = clientOrigins;
        this.loginSession = loginSession;
        this.webLoginHandler = webLoginHandler;
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
                            clientOrigins,
                            loginSession
                        )
                    )
            )
            .redirectionEndpoint(endpoint -> endpoint.baseUri(REDIRECTION_BASE_URI))
            .authorizedClientRepository(new DiscardingAuthorizedClientRepository())
            .successHandler(webLoginHandler)
            .failureHandler(webLoginHandler);
    }
}
