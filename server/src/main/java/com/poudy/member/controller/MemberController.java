package com.poudy.member.controller;

import com.poudy.member.controller.dto.MemberResponse;
import com.poudy.member.service.MemberService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "회원", description = "로그인한 회원 API")
@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @Operation(summary = "내 정보 조회", description = "로그인한 회원 정보와 초기 정보 입력 완료 여부를 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/me")
    public ResponseEntity<MemberResponse> findMe(
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(MemberResponse.from(memberService.findById(loginMember.id())));
    }
}
