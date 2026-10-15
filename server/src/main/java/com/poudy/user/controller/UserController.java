package com.poudy.user.controller;

import com.poudy.security.session.LoginMember;
import com.poudy.security.session.LoginSession;
import com.poudy.user.controller.dto.UserProfileRequest;
import com.poudy.user.controller.dto.UserResponse;
import com.poudy.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
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
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final LoginSession loginSession;

    public UserController(UserService userService, LoginSession loginSession) {
        this.userService = userService;
        this.loginSession = loginSession;
    }

    @Operation(summary = "내 정보 조회", description = "로그인한 회원 정보와 프로필을 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> findMe(
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        return ResponseEntity.ok(UserResponse.from(userService.findById(loginMember.id())));
    }

    @Operation(summary = "내 프로필 수정", description = "성별, 나이대, 피부 타입, 민감성 피부 여부 중 고른 것만 저장하고 고르지 않은 것은 비운다.")
    @ApiResponse(responseCode = "200", description = "저장 성공")
    @PatchMapping("/me/profile")
    public ResponseEntity<UserResponse> updateMyProfile(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody UserProfileRequest request
    ) {
        return ResponseEntity.ok(
            UserResponse.from(
                userService.updateProfile(
                    loginMember.id(),
                    request.gender(),
                    request.ageRange(),
                    request.skinType(),
                    request.sensitiveSkin()
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
        userService.withdraw(loginMember.id());
        loginSession.signOut(request, response);
        return ResponseEntity.noContent().build();
    }
}
