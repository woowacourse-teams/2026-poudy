package com.poudy.admin.controller;

import com.poudy.admin.controller.dto.AdminLoginRequest;
import com.poudy.admin.service.AdminLoginService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자", description = "관리자 인증 API")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminLoginService adminLoginService;

    public AdminController(AdminLoginService adminLoginService) {
        this.adminLoginService = adminLoginService;
    }

    @Operation(summary = "관리자 로그인", description = "관리자 계정을 확인한다.")
    @ApiResponse(responseCode = "200", description = "로그인 성공")
    @ApiResponse(responseCode = "401", description = "아이디 또는 비밀번호가 일치하지 않음")
    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody AdminLoginRequest request) {
        if (!adminLoginService.login(request.username(), request.password())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok().build();
    }
}
