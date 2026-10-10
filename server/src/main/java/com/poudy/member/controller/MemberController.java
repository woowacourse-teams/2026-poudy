package com.poudy.member.controller;

import com.poudy.member.controller.dto.MemberProfileRequest;
import com.poudy.member.controller.dto.MemberResponse;
import com.poudy.member.service.MemberService;
import com.poudy.security.session.LoginMember;
import com.poudy.security.session.LoginSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "회원", description = "로그인한 회원 API")
@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;
    private final LoginSession loginSession;

    public MemberController(MemberService memberService, LoginSession loginSession) {
        this.memberService = memberService;
        this.loginSession = loginSession;
    }

    @Operation(summary = "내 정보 조회", description = "로그인한 회원 정보와 초기 정보를 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/me")
    public ResponseEntity<MemberResponse> findMe(
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(MemberResponse.from(memberService.findById(loginMember.id())));
    }

    @Operation(summary = "내 초기 정보 저장", description = "성별, 나이대, 피부 타입 중 고른 것만 저장하고 고르지 않은 것은 비운다. 나중에 바꿀 때도 쓴다.")
    @ApiResponse(responseCode = "200", description = "저장 성공")
    @PatchMapping("/me/profile")
    public ResponseEntity<MemberResponse> updateMyProfile(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody MemberProfileRequest request
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(
                MemberResponse.from(
                    memberService.updateProfile(
                        loginMember.id(),
                        request.gender(),
                        request.ageRange(),
                        request.skinType()
                    )
                )
            );
    }

    @Operation(summary = "회원 탈퇴", description = "회원 정보를 지우고 로그인 세션을 끝낸다.")
    @ApiResponse(responseCode = "204", description = "탈퇴 성공")
    @DeleteMapping("/me")
    public ResponseEntity<Void> withdraw(
        @AuthenticationPrincipal LoginMember loginMember,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        memberService.withdraw(loginMember.id());
        loginSession.signOut(request, response);
        return ResponseEntity.noContent().build();
    }
}
