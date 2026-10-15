package com.poudy.security.auth.controller;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.auth.controller.dto.WithdrawnAccountResponse;
import com.poudy.security.domain.SocialUsers;
import com.poudy.security.session.LoginSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인증", description = "로그인 세션 API")
@RestController
@RequestMapping("/api/auth/withdrawn")
public class WithdrawnUserController {

    private final SocialUsers socialUsers;
    private final LoginSession loginSession;

    public WithdrawnUserController(SocialUsers socialUsers, LoginSession loginSession) {
        this.socialUsers = socialUsers;
        this.loginSession = loginSession;
    }

    @Operation(summary = "탈퇴 계정 조회", description = "탈퇴한 계정으로 방금 소셜 로그인한 사람에게 이메일, 제공자, 탈퇴 시각과 복구를 요청할 수 있는 기한을 알려 준다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<WithdrawnAccountResponse> findWithdrawn(HttpServletRequest request) {
        long withdrawnUserId = loginSession.findWithdrawnUser(request)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND));
        return ResponseEntity.ok(WithdrawnAccountResponse.from(socialUsers.findWithdrawn(withdrawnUserId)));
    }

    @Operation(summary = "탈퇴 계정 복구 요청", description = "탈퇴한 계정으로 방금 소셜 로그인한 사람이 복구를 요청한다. 복구 여부는 관리자가 정한다.")
    @ApiResponse(responseCode = "204", description = "복구 요청 접수")
    @PostMapping("/restore")
    public ResponseEntity<Void> requestRestore(HttpServletRequest request) {
        long withdrawnUserId = loginSession.releaseWithdrawnUser(request)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND));
        socialUsers.requestRestore(withdrawnUserId);
        return ResponseEntity.noContent().build();
    }
}
