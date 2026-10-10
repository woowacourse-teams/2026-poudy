package com.poudy.member.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.member.controller.dto.AdminRestoreRequestPageResponse;
import com.poudy.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 회원", description = "탈퇴 회원 복구 요청 조회와 복구 API")
@RestController
@RequestMapping("/api/admin/members")
public class AdminMemberController {

    private final MemberService memberService;

    public AdminMemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @Operation(summary = "복구 요청 목록 조회", description = "복구를 요청한 탈퇴 회원을 요청한 순서대로 조회한다.")
    @ApiResponse(responseCode = "200", description = "복구 요청 목록 조회 성공")
    @GetMapping("/restore-requests")
    public ResponseEntity<AdminRestoreRequestPageResponse> findRestoreRequests(
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            AdminRestoreRequestPageResponse.from(
                memberService.findRestoreRequests(pagination.page(), pagination.size()),
                pagination
            )
        );
    }

    @Operation(summary = "탈퇴 회원 복구", description = "복구를 요청한 탈퇴 회원을 되살려 다시 로그인할 수 있게 한다.")
    @ApiResponse(responseCode = "204", description = "복구 성공")
    @PostMapping("/{memberId}/restore")
    public ResponseEntity<Void> restore(@PathVariable long memberId) {
        memberService.restore(memberId);
        return ResponseEntity.noContent().build();
    }
}
