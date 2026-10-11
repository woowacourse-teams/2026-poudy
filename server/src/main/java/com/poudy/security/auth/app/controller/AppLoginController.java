package com.poudy.security.auth.app.controller;

import com.poudy.exception.GlobalExceptionHandler;
import com.poudy.security.auth.SocialLogin;
import com.poudy.security.auth.app.ProviderTokenVerifiers;
import com.poudy.security.auth.app.controller.dto.AppLoginRequest;
import com.poudy.security.auth.app.controller.dto.AppLoginResponse;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginChannel;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인증", description = "로그인 세션 API")
@RestController
@RequestMapping("/api/auth")
public class AppLoginController {

    private static final String PROVIDER_PROPERTY = "provider";

    private final SocialLogin socialLogin;
    private final ProviderTokenVerifiers tokenVerifiers;

    public AppLoginController(SocialLogin socialLogin, ProviderTokenVerifiers tokenVerifiers) {
        this.socialLogin = socialLogin;
        this.tokenVerifiers = tokenVerifiers;
    }

    @Operation(summary = "앱 소셜 로그인", description = "앱이 네이티브 SDK로 받은 카카오 접근 토큰이나 구글 ID 토큰을 확인해 앱 세션을 발급한다. "
        + "status 는 웹 로그인 콜백의 status 와 같다.")
    @ApiResponse(responseCode = "200", description = "로그인 처리 완료")
    @PostMapping("/{provider:kakao|google}/app-login")
    public ResponseEntity<AppLoginResponse> login(
        @Parameter(schema = @Schema(allowableValues = {"kakao", "google"})) @PathVariable String provider,
        @Valid @RequestBody AppLoginRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        OAuthProvider tokenProvider = OAuthProvider.from(provider);
        LoginStatus status = socialLogin.login(
            () -> tokenVerifiers.verify(tokenProvider, request.token()),
            LoginChannel.APP,
            httpRequest,
            httpResponse
        );
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(new AppLoginResponse(status));
    }

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ResponseEntity<ProblemDetail> handleEmailAlreadyRegistered(EmailAlreadyRegisteredException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
        problem.setProperty(GlobalExceptionHandler.CODE_PROPERTY, exception.code());
        problem.setProperty(PROVIDER_PROPERTY, exception.registeredProvider());
        return ResponseEntity.badRequest().body(problem);
    }
}
