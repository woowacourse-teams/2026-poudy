package com.poudy.security.auth.admin.controller;

import com.poudy.security.auth.admin.controller.dto.AdminLoginRequest;
import com.poudy.security.auth.admin.controller.dto.AdminSessionResponse;
import com.poudy.security.auth.admin.service.AdminLoginService;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자", description = "관리자 인증 API")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminLoginService adminLoginService;
    private final LoginSession loginSession;

    public AdminController(AdminLoginService adminLoginService, LoginSession loginSession) {
        this.adminLoginService = adminLoginService;
        this.loginSession = loginSession;
    }

    @Operation(summary = "관리자 로그인", description = "관리자 계정을 확인하고 관리자 세션을 발급한다. 관리자 API는 이 세션 쿠키로 호출한다.")
    @ApiResponse(responseCode = "200", description = "로그인 성공")
    @ApiResponse(responseCode = "401", description = "아이디 또는 비밀번호가 일치하지 않음")
    @PostMapping("/login")
    public ResponseEntity<Void> login(
        @Valid @RequestBody AdminLoginRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        if (!adminLoginService.matches(request.username(), request.password())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        loginSession.signInAdmin(request.username(), httpRequest, httpResponse);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "관리자 세션 확인", description = "관리자 화면이 그리기 전에 관리자 세션이 있는지 확인한다.")
    @ApiResponse(responseCode = "200", description = "관리자 세션 있음")
    @GetMapping("/me")
    public ResponseEntity<AdminSessionResponse> findMe(@AuthenticationPrincipal LoginAdmin loginAdmin) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(AdminSessionResponse.from(loginAdmin));
    }
}
