package com.poudy.security.auth.loadtest.controller;

import com.poudy.security.auth.SocialLogin;
import com.poudy.security.auth.app.controller.dto.AppLoginResponse;
import com.poudy.security.auth.loadtest.LoadTestSecret;
import com.poudy.security.auth.loadtest.controller.dto.LoadTestLoginRequest;
import com.poudy.security.domain.LoginStatus;
import com.poudy.security.session.LoginChannel;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("staging")
@ConditionalOnProperty(prefix = "poudy.loadtest", name = "secret")
@RequestMapping("/api/auth/load-test-login")
public class LoadTestLoginController {

    public static final String SECRET_HEADER = "X-Poudy-Load-Test-Secret";

    private final SocialLogin socialLogin;
    private final LoadTestSecret secret;

    public LoadTestLoginController(SocialLogin socialLogin, @Value("${poudy.loadtest.secret}") String secret) {
        this.socialLogin = socialLogin;
        this.secret = new LoadTestSecret(secret);
    }

    @PostMapping
    public ResponseEntity<AppLoginResponse> login(
        @RequestHeader(value = SECRET_HEADER, required = false) String presentedSecret,
        @Valid @RequestBody LoadTestLoginRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        secret.verify(presentedSecret);
        LoginStatus status = socialLogin.login(request::account, LoginChannel.APP, httpRequest, httpResponse);
        return ResponseEntity.ok(new AppLoginResponse(status));
    }
}
