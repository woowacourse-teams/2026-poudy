package com.poudy.security.auth.oauth;

import com.poudy.exception.ErrorCode;
import com.poudy.security.ClientOrigins;
import com.poudy.security.auth.SocialLogin;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.session.LoginChannel;
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
public class OAuthLoginHandler implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private static final String LOGIN_CALLBACK_PATH = "/login/callback";

    private static final Logger log = LoggerFactory.getLogger(OAuthLoginHandler.class);

    private final SocialLogin socialLogin;
    private final ClientOrigins clientOrigins;

    public OAuthLoginHandler(
        SocialLogin socialLogin,
        ClientOrigins clientOrigins
    ) {
        this.socialLogin = socialLogin;
        this.clientOrigins = clientOrigins;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    )
        throws IOException {
        OAuthLoginStart start = OAuthLoginStart.takeFrom(request);
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        response.sendRedirect(loginRedirect(token, start.channel(), callbackOf(start), request, response));
    }

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    )
        throws IOException {
        log.info("Social login failed: {}", exception.getMessage());
        response.sendRedirect(callbackOf(OAuthLoginStart.takeFrom(request)).failedBy(ErrorCode.OAUTH_LOGIN_FAILED));
    }

    private String loginRedirect(
        OAuth2AuthenticationToken token,
        LoginChannel channel,
        LoginCallbackUrl callback,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        try {
            return callback.succeeded(socialLogin.login(() -> accountOf(token), channel, request, response));
        } catch (RuntimeException exception) {
            return callback.failed(exception);
        }
    }

    private LoginCallbackUrl callbackOf(OAuthLoginStart start) {
        return new LoginCallbackUrl(start.returnOriginOr(clientOrigins.defaultOrigin()) + LOGIN_CALLBACK_PATH);
    }

    private OAuthAccount accountOf(OAuth2AuthenticationToken token) {
        return OAuthAccount.from(token.getAuthorizedClientRegistrationId(), token.getPrincipal().getAttributes());
    }
}
