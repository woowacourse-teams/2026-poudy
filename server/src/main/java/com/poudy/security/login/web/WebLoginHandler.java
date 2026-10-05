package com.poudy.security.login.web;

import com.poudy.exception.ErrorCode;
import com.poudy.security.ClientOrigins;
import com.poudy.security.login.SocialLogin;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class WebLoginHandler implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private static final String LOGIN_CALLBACK_PATH = "/login/callback";

    private static final Logger log = LoggerFactory.getLogger(WebLoginHandler.class);

    private final SocialLogin socialLogin;
    private final WebSocialAccountReader webAccounts;
    private final LoginSession loginSession;
    private final ClientOrigins clientOrigins;

    public WebLoginHandler(
        SocialLogin socialLogin,
        WebSocialAccountReader webAccounts,
        LoginSession loginSession,
        ClientOrigins clientOrigins
    ) {
        this.socialLogin = socialLogin;
        this.webAccounts = webAccounts;
        this.loginSession = loginSession;
        this.clientOrigins = clientOrigins;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    )
        throws IOException {
        response.sendRedirect(
            socialLogin.login(
                webAccounts,
                new WebLoginCredential((OAuth2AuthenticationToken) authentication),
                responderFor(request),
                request,
                response
            )
        );
    }

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    )
        throws IOException {
        log.info("Social login failed: {}", exception.getMessage());
        response.sendRedirect(responderFor(request).failedBy(ErrorCode.OAUTH_LOGIN_FAILED));
    }

    private WebLoginResponder responderFor(HttpServletRequest request) {
        return new WebLoginResponder(
            loginSession.takeReturnOrigin(request).orElseGet(clientOrigins::defaultOrigin) + LOGIN_CALLBACK_PATH
        );
    }
}
