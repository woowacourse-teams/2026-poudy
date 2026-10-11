package com.poudy.security.auth.oauth;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.LoginStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.util.UriComponentsBuilder;

public final class LoginCallbackUrl {

    private static final Logger log = LoggerFactory.getLogger(LoginCallbackUrl.class);

    private final String loginCallback;

    public LoginCallbackUrl(String loginCallback) {
        this.loginCallback = loginCallback;
    }

    public String succeeded(LoginStatus status) {
        return LoginCallbackParameter.STATUS.addTo(callback(), status).toUriString();
    }

    public String failed(RuntimeException exception) {
        if (exception instanceof EmailAlreadyRegisteredException alreadyRegistered) {
            return LoginCallbackParameter.PROVIDER
                .addTo(failure(alreadyRegistered.code()), alreadyRegistered.registeredProvider())
                .toUriString();
        }
        if (exception instanceof RuleViolationException ruleViolation) {
            return failure(ruleViolation.code()).toUriString();
        }
        log.error("Social login could not be completed", exception);
        return failedBy(ErrorCode.OAUTH_LOGIN_FAILED);
    }

    public String failedBy(ErrorCode code) {
        return failure(code).toUriString();
    }

    private UriComponentsBuilder failure(ErrorCode code) {
        return LoginCallbackParameter.ERROR.addTo(callback(), code);
    }

    private UriComponentsBuilder callback() {
        return UriComponentsBuilder.fromUriString(loginCallback);
    }
}
