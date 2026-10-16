package com.poudy.pushtoken.controller;

import com.poudy.pushtoken.controller.dto.PushTokenRequest;
import com.poudy.pushtoken.service.PushTokenService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "푸시 알림", description = "앱 푸시 토큰 API")
@RestController
public class PushTokenController {

    private final PushTokenService pushTokenService;

    public PushTokenController(PushTokenService pushTokenService) {
        this.pushTokenService = pushTokenService;
    }

    @Operation(summary = "푸시 토큰 등록", description = "로그인하지 않아도 등록한다. 회원 세션이면 토큰을 그 회원과 잇고, "
        + "아니면 잇지 않은 토큰으로 둔다. 이미 있는 토큰은 마지막 등록의 로그인 상태를 따른다.")
    @ApiResponse(responseCode = "204", description = "등록 성공")
    @PostMapping("/api/push-tokens")
    public ResponseEntity<Void> registerPushToken(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody PushTokenRequest request
    ) {
        if (loginMember == null) {
            pushTokenService.registerAnonymous(request.token());
            return ResponseEntity.noContent().build();
        }
        pushTokenService.registerForUser(request.token(), loginMember.id());
        return ResponseEntity.noContent().build();
    }
}
