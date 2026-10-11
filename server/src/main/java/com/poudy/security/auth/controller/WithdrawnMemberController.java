package com.poudy.security.auth.controller;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.SocialMembers;
import com.poudy.security.session.LoginSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인증", description = "로그인 세션 API")
@RestController
@RequestMapping("/api/auth/withdrawn")
public class WithdrawnMemberController {

    private final SocialMembers socialMembers;
    private final LoginSession loginSession;

    public WithdrawnMemberController(SocialMembers socialMembers, LoginSession loginSession) {
        this.socialMembers = socialMembers;
        this.loginSession = loginSession;
    }

    @Operation(summary = "탈퇴 계정 복구 요청", description = "탈퇴한 계정으로 방금 소셜 로그인한 사람이 복구를 요청한다. 복구 여부는 관리자가 정한다.")
    @ApiResponse(responseCode = "204", description = "복구 요청 접수")
    @PostMapping("/restore")
    public ResponseEntity<Void> requestRestore(HttpServletRequest request) {
        long withdrawnMemberId = loginSession.releaseWithdrawnMember(request)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND));
        socialMembers.requestRestore(withdrawnMemberId);
        return ResponseEntity.noContent().build();
    }
}
