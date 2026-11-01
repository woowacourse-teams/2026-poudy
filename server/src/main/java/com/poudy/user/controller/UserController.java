package com.poudy.user.controller;

import com.poudy.security.session.LoginMember;
import com.poudy.security.session.LoginSession;
import com.poudy.user.controller.dto.ProfileImageUploadResponse;
import com.poudy.user.controller.dto.UserProfileRequest;
import com.poudy.user.controller.dto.UserResponse;
import com.poudy.user.domain.User;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
        return ResponseEntity.ok(responseOf(userService.findById(loginMember.id())));
    }

    @Operation(summary = "내 프로필 수정", description = "성별, 나이대, 피부 타입, 민감성 피부 여부는 보낸 값으로 저장하고, 보내지 않거나 null로 보내면 비운다. 프로필 이미지는 보내지 않으면 그대로 두고, 새 이미지 ID를 보내면 바꾸고, null로 보내면 지운다.")
    @ApiResponse(responseCode = "200", description = "저장 성공")
    @PatchMapping("/me/profile")
    public ResponseEntity<UserResponse> updateMyProfile(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody UserProfileRequest request
    ) {
        return ResponseEntity.ok(
            responseOf(
                userService.updateProfile(
                    loginMember.id(),
                    request.gender(),
                    request.ageRange(),
                    request.skinType(),
                    request.sensitiveSkin(),
                    request.profileImageId().sent(),
                    request.profileImageId().imageId()
                )
            )
        );
    }

    @Operation(summary = "프로필 이미지 업로드", description = "JPEG, PNG, HEIC 이미지를 검증·재인코딩해 24시간 동안 임시 저장한다. 프로필 수정에 이 ID를 보내야 프로필 이미지가 된다.")
    @ApiResponse(responseCode = "201", description = "이미지 업로드 완료")
    @PostMapping(path = "/me/profile-image", consumes = "multipart/form-data")
    public ResponseEntity<ProfileImageUploadResponse> uploadProfileImage(@RequestPart("image") MultipartFile image) {
        return ResponseEntity.status(201).body(new ProfileImageUploadResponse(userService.uploadProfileImage(image)));
    }

    private UserResponse responseOf(User user) {
        return UserResponse.from(user, userService.profileImageUrlOf(user).orElse(null));
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
