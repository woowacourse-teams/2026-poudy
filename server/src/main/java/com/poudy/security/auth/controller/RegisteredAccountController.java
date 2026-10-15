package com.poudy.security.auth.controller;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.auth.controller.dto.RegisteredAccountResponse;
import com.poudy.security.session.LoginSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인증", description = "로그인 세션 API")
@RestController
@RequestMapping("/api/auth/registered-account")
public class RegisteredAccountController {

    private final LoginSession loginSession;

    public RegisteredAccountController(LoginSession loginSession) {
        this.loginSession = loginSession;
    }

    @Operation(summary = "이미 가입한 계정 조회", description = "웹 소셜 로그인이 이메일 중복으로 실패한 사람에게 그 이메일과 먼저 가입한 제공자를 알려 준다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<RegisteredAccountResponse> findRegisteredAccount(HttpServletRequest request) {
        return ResponseEntity.ok(
            loginSession.findRegisteredAccount(request)
                .map(RegisteredAccountResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.REGISTERED_ACCOUNT_NOT_FOUND))
        );
    }
}
