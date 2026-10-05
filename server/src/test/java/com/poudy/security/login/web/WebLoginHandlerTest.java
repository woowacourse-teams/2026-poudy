package com.poudy.security.login.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.security.ClientOrigins;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialMemberLogin;
import com.poudy.security.domain.UnverifiedOAuthEmailException;
import com.poudy.security.login.SocialLogin;
import com.poudy.security.login.admin.AdminSessionPolicy;
import com.poudy.security.session.LoginMember;
import com.poudy.security.session.LoginSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@DisplayName("소셜 로그인 처리")
class WebLoginHandlerTest {

    private static final String CLIENT_ORIGIN = "https://poudy.example.com";
    private static final String REDIRECT_URI = CLIENT_ORIGIN + "/login/callback";
    private static final String STATE = "state-1";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-03T00:00:00Z"), ZoneOffset.UTC);

    private final SocialMemberLogin socialMemberLogin = mock(SocialMemberLogin.class);
    private final LoginSession loginSession = new LoginSession(
        List.of(
            new WebSessionPolicy(Duration.ofDays(1), Duration.ofDays(7), CLOCK),
            new AdminSessionPolicy(Duration.ofHours(1), Duration.ofHours(12), CLOCK)
        ),
        new HttpSessionSecurityContextRepository()
    );
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("로그인에 성공하면 회원 ID만 세션에 남기고 프론트로 보낸다")
    void signsInMember() throws Exception {
        given(socialMemberLogin.login(any())).willReturn(new SocialLoginResult(7L, LoginStatus.SIGNED_IN));

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        ArgumentCaptor<OAuthAccount> account = ArgumentCaptor.forClass(OAuthAccount.class);
        verify(socialMemberLogin).login(account.capture());
        assertThat(account.getValue().provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(account.getValue().providerId()).isEqualTo("4321");
        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?status=SIGNED_IN");
        SecurityContext context = (SecurityContext) request.getSession()
            .getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertThat(context.getAuthentication().getPrincipal()).isEqualTo(new LoginMember(7L));
        assertThat(request.getSession().getMaxInactiveInterval()).isEqualTo(Duration.ofDays(1).toSeconds());
    }

    @Test
    @DisplayName("다른 제공자로 가입한 이메일이면 세션을 버리고 오류 코드와 기존 제공자를 붙여 보낸다")
    void rejectsDuplicateEmail() throws Exception {
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);
        willThrow(new EmailAlreadyRegisteredException(OAuthProvider.GOOGLE)).given(socialMemberLogin).login(any());

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl())
            .isEqualTo(REDIRECT_URI + "?error=MEMBER_EMAIL_ALREADY_REGISTERED&provider=GOOGLE");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("인증되지 않은 이메일이면 세션을 버리고 오류 코드를 붙여 보낸다")
    void rejectsUnverifiedEmail() throws Exception {
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);
        willThrow(new UnverifiedOAuthEmailException()).given(socialMemberLogin).login(any());

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_EMAIL_NOT_VERIFIED");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("제공자 응답에 식별자가 없으면 로그인 실패로 보낸다")
    void rejectsUnreadableAccount() throws Exception {
        OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
            new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("OAUTH2_USER"),
                Map.of("sub", "", "email", "member@gmail.com"),
                "email"
            ),
            AuthorityUtils.createAuthorityList("OAUTH2_USER"),
            "google"
        );

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, token);

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_LOGIN_FAILED");
    }

    @Test
    @DisplayName("제공자 인증에 실패하면 로그인 실패로 보낸다")
    void redirectsFailure() throws Exception {
        handlerFor(ClientOrigins.from(List.of(CLIENT_ORIGIN)))
            .onAuthenticationFailure(
                request,
                response,
                new OAuth2AuthenticationException(new OAuth2Error("access_denied"))
            );

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_LOGIN_FAILED");
    }

    @Test
    @DisplayName("프론트 오리진이 없으면 같은 오리진의 콜백으로 보낸다")
    void redirectsToSameOriginWithoutClientOrigin() throws Exception {
        given(socialMemberLogin.login(any())).willReturn(new SocialLoginResult(7L, LoginStatus.SIGNED_IN));

        successHandlerFor(List.of()).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo("/login/callback?status=SIGNED_IN");
    }

    @Test
    @DisplayName("가입 처리 중 예상하지 못한 오류가 나면 먼저 저장된 제공자 인증까지 버리고 로그인 실패로 보낸다")
    void discardsProviderAuthenticationOnUnexpectedFailure() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(
            HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
            new SecurityContextImpl(kakaoToken())
        );
        request.setSession(session);
        willThrow(new QueryTimeoutException("statement timeout")).given(socialMemberLogin).login(any());

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_LOGIN_FAILED");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("탈퇴한 계정이면 로그인시키지 않고 탈퇴 회원만 세션에 둔 채 탈퇴 안내로 보낸다")
    void holdsWithdrawnMember() throws Exception {
        given(socialMemberLogin.login(any())).willReturn(new SocialLoginResult(7L, LoginStatus.WITHDRAWN));

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?status=WITHDRAWN");
        assertThat(request.getSession().getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
            .isNull();
        assertThat(loginSession.releaseWithdrawnMember(request)).contains(7L);
    }

    @Test
    @DisplayName("이미 복구를 요청한 탈퇴 계정이면 세션에 아무것도 두지 않고 복구 요청 중 안내로 보낸다")
    void redirectsRestoreRequestedMember() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(
            HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
            new SecurityContextImpl(kakaoToken())
        );
        request.setSession(session);
        given(socialMemberLogin.login(any())).willReturn(new SocialLoginResult(7L, LoginStatus.RESTORE_REQUESTED));

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?status=RESTORE_REQUESTED");
        assertThat(session.isInvalid()).isTrue();
        assertThat(loginSession.releaseWithdrawnMember(request)).isEmpty();
    }

    @Test
    @DisplayName("preview에서 시작한 로그인에 성공하면 그 preview의 콜백으로 보낸다")
    void returnsToPreviewOnSuccess() throws Exception {
        rememberPreview();
        given(socialMemberLogin.login(any())).willReturn(new SocialLoginResult(7L, LoginStatus.SIGNED_IN));
        successHandlerFor(previewOrigins()).onAuthenticationSuccess(request, response, kakaoToken());
        assertThat(response.getRedirectedUrl())
            .isEqualTo("https://pr-111.preview.poudy.site/login/callback?status=SIGNED_IN");
    }

    @Test
    @DisplayName("preview에서 시작한 로그인을 제공자가 거절하면 그 preview의 콜백으로 보낸다")
    void returnsToPreviewOnProviderFailure() throws Exception {
        rememberPreview();
        handlerFor(ClientOrigins.from(previewOrigins()))
            .onAuthenticationFailure(
                request,
                response,
                new OAuth2AuthenticationException(new OAuth2Error("access_denied"))
            );
        assertThat(response.getRedirectedUrl())
            .isEqualTo("https://pr-111.preview.poudy.site/login/callback?error=OAUTH_LOGIN_FAILED");
    }

    @Test
    @DisplayName("로그인 실패로 세션을 버려도 preview의 콜백으로 보낸다")
    void returnsToPreviewEvenWhenSignInInvalidatesSession() throws Exception {
        rememberPreview();
        MockHttpSession session = (MockHttpSession) request.getSession();
        willThrow(new UnverifiedOAuthEmailException()).given(socialMemberLogin).login(any());
        successHandlerFor(previewOrigins()).onAuthenticationSuccess(request, response, kakaoToken());
        assertThat(session.isInvalid()).isTrue();
        assertThat(response.getRedirectedUrl())
            .isEqualTo("https://pr-111.preview.poudy.site/login/callback?error=OAUTH_EMAIL_NOT_VERIFIED");
    }

    @Test
    @DisplayName("탈퇴 계정으로 세션을 바꿔도 preview의 콜백으로 보낸다")
    void returnsWithdrawnMemberToPreviewAfterReplacingSession() throws Exception {
        rememberPreview();
        given(socialMemberLogin.login(any())).willReturn(new SocialLoginResult(7L, LoginStatus.WITHDRAWN));
        successHandlerFor(previewOrigins()).onAuthenticationSuccess(request, response, kakaoToken());
        assertThat(response.getRedirectedUrl())
            .isEqualTo("https://pr-111.preview.poudy.site/login/callback?status=WITHDRAWN");
        assertThat(loginSession.releaseWithdrawnMember(request)).contains(7L);
    }

    @Test
    @DisplayName("다른 state의 콜백이면 preview가 아니라 기본 콜백으로 보낸다")
    void ignoresReturnOriginOfOtherState() throws Exception {
        rememberPreview();
        request.setParameter("state", "other-state");
        handlerFor(ClientOrigins.from(previewOrigins()))
            .onAuthenticationFailure(
                request,
                response,
                new OAuth2AuthenticationException(new OAuth2Error("authorization_request_not_found"))
            );
        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_LOGIN_FAILED");
    }

    private List<String> previewOrigins() {
        return List.of(CLIENT_ORIGIN, "https://*.preview.poudy.site");
    }

    private void rememberPreview() {
        loginSession.rememberReturnOrigin("https://pr-111.preview.poudy.site", STATE, request);
        request.setParameter("state", STATE);
    }

    private WebLoginHandler successHandlerFor(List<String> clientOrigins) {
        return handlerFor(ClientOrigins.from(clientOrigins));
    }

    private WebLoginHandler handlerFor(ClientOrigins clientOrigins) {
        return new WebLoginHandler(
            new SocialLogin(socialMemberLogin, loginSession),
            new WebSocialAccountReader(),
            loginSession,
            clientOrigins
        );
    }

    private OAuth2AuthenticationToken kakaoToken() {
        return new OAuth2AuthenticationToken(
            new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("OAUTH2_USER"),
                Map.of(
                    "id",
                    4321L,
                    "kakao_account",
                    Map.of("email", "member@kakao.com", "is_email_valid", true, "is_email_verified", true)
                ),
                "id"
            ),
            AuthorityUtils.createAuthorityList("OAUTH2_USER"),
            "kakao"
        );
    }

}
