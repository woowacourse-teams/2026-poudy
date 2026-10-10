package com.poudy.security.controller;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialSignIn;
import com.poudy.security.session.LoginSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인증", description = "로그인 세션 API")
@RestController
@RequestMapping("/api/auth/signup")
public class SignupController {

    private final SocialSignIn socialSignIn;
    private final LoginSession loginSession;

    public SignupController(SocialSignIn socialSignIn, LoginSession loginSession) {
        this.socialSignIn = socialSignIn;
        this.loginSession = loginSession;
    }

    @Operation(summary = "회원가입", description = "처음 소셜 로그인한 사람이 만 14세 이상임을 확인하고 가입한다. 가입하면 바로 로그인한다.")
    @ApiResponse(responseCode = "204", description = "가입 성공")
    @PostMapping
    public ResponseEntity<Void> signUp(HttpServletRequest request, HttpServletResponse response) {
        OAuthAccount account = loginSession.releaseSignup(request)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SIGNUP_ACCOUNT_NOT_FOUND));
        long memberId = socialSignIn.signUp(account);
        loginSession.signIn(memberId, request, response);
        return ResponseEntity.noContent().build();
    }
}
