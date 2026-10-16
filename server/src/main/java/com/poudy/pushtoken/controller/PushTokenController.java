package com.poudy.pushtoken.controller;

import com.poudy.pushtoken.controller.dto.PushTokenEnabledRequest;
import com.poudy.pushtoken.controller.dto.PushTokenRequest;
import com.poudy.pushtoken.controller.dto.PushTokenResponse;
import com.poudy.pushtoken.service.PushTokenService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "푸시 알림", description = "앱 푸시 토큰 API")
@RestController
@RequestMapping("/api/push-tokens")
public class PushTokenController {

    private final PushTokenService pushTokenService;

    public PushTokenController(PushTokenService pushTokenService) {
        this.pushTokenService = pushTokenService;
    }

    @Operation(summary = "푸시 토큰 등록", description = "로그인하지 않아도 등록한다. 회원 세션이면 토큰을 그 회원과 잇고, "
        + "아니면 잇지 않은 토큰으로 둔다. 이미 있는 토큰은 마지막 등록의 로그인 상태를 따르고 알림 설정은 그대로 둔다. "
        + "새 토큰은 알림을 켠 상태로 등록한다.")
    @ApiResponse(responseCode = "200", description = "등록 성공. 토큰의 알림 설정을 돌려준다.")
    @PostMapping
    public ResponseEntity<PushTokenResponse> registerPushToken(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody PushTokenRequest request
    ) {
        boolean enabled = pushTokenService.register(request.token(), userIdOf(loginMember));
        return ResponseEntity.ok(new PushTokenResponse(enabled));
    }

    @Operation(summary = "푸시 알림 설정 변경", description = "토큰의 알림을 켜거나 끈다. 없는 토큰이면 그 설정으로 등록한다. "
        + "회원 연결은 등록과 같이 이 요청의 로그인 상태를 따른다.")
    @ApiResponse(responseCode = "204", description = "변경 성공")
    @PutMapping("/enabled")
    public ResponseEntity<Void> changePushTokenEnabled(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody PushTokenEnabledRequest request
    ) {
        pushTokenService.changeEnabled(request.token(), userIdOf(loginMember), request.enabled());
        return ResponseEntity.noContent().build();
    }

    private Long userIdOf(LoginMember loginMember) {
        if (loginMember == null) {
            return null;
        }
        return loginMember.id();
    }
}
