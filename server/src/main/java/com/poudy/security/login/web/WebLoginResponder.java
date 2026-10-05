package com.poudy.security.login.web;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.login.LoginResponder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.util.UriComponentsBuilder;

public record WebLoginResponder(String loginCallback) implements LoginResponder<String> {

    private static final String ERROR_PARAMETER = "error";
    private static final String PROVIDER_PARAMETER = "provider";
    private static final String STATUS_PARAMETER = "status";

    private static final Logger log = LoggerFactory.getLogger(WebLoginResponder.class);

    @Override
    public String succeeded(SocialLoginResult result) {
        return UriComponentsBuilder.fromUriString(loginCallback)
            .queryParam(STATUS_PARAMETER, result.status().name())
            .toUriString();
    }

    @Override
    public String failed(RuntimeException exception) {
        if (exception instanceof EmailAlreadyRegisteredException alreadyRegistered) {
            return failure(alreadyRegistered.code())
                .queryParam(PROVIDER_PARAMETER, alreadyRegistered.registeredProvider().name())
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
        return UriComponentsBuilder.fromUriString(loginCallback).queryParam(ERROR_PARAMETER, code.name());
    }
}
