package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SocialSignIn;
import com.poudy.security.domain.SocialSignInResult;
import com.poudy.security.domain.UnverifiedOAuthEmailException;
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
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@DisplayName("소셜 로그인 처리")
class OAuthLoginHandlersTest {

    private static final String CLIENT_ORIGIN = "https://poudy.example.com";
    private static final String REDIRECT_URI = CLIENT_ORIGIN + "/login/callback";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-03T00:00:00Z"), ZoneOffset.UTC);

    private final SocialSignIn socialSignIn = mock(SocialSignIn.class);
    private final SecurityConfig securityConfig = new SecurityConfig();
    private final LoginSession loginSession = new LoginSession(
        Duration.ofDays(1),
        Duration.ofDays(7),
        CLOCK,
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
        given(socialSignIn.signIn(any())).willReturn(SocialSignInResult.signedIn(7L));

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        ArgumentCaptor<OAuthAccount> account = ArgumentCaptor.forClass(OAuthAccount.class);
        verify(socialSignIn).signIn(account.capture());
        assertThat(account.getValue().provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(account.getValue().providerId()).isEqualTo("4321");
        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI);
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
        willThrow(new EmailAlreadyRegisteredException(OAuthProvider.GOOGLE)).given(socialSignIn).signIn(any());

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
        willThrow(new UnverifiedOAuthEmailException()).given(socialSignIn).signIn(any());

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
        securityConfig.oauthLoginFailureHandler(ClientOrigins.from(List.of(CLIENT_ORIGIN))).onAuthenticationFailure(
            request,
            response,
            new OAuth2AuthenticationException(new OAuth2Error("access_denied"))
        );

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_LOGIN_FAILED");
    }

    @Test
    @DisplayName("프론트 오리진이 없으면 같은 오리진의 콜백으로 보낸다")
    void redirectsToSameOriginWithoutClientOrigin() throws Exception {
        given(socialSignIn.signIn(any())).willReturn(SocialSignInResult.signedIn(7L));

        successHandlerFor(List.of()).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo("/login/callback");
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
        willThrow(new QueryTimeoutException("statement timeout")).given(socialSignIn).signIn(any());

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?error=OAUTH_LOGIN_FAILED");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("탈퇴한 계정이면 로그인시키지 않고 탈퇴 회원만 세션에 둔 채 탈퇴 안내로 보낸다")
    void holdsWithdrawnMember() throws Exception {
        given(socialSignIn.signIn(any())).willReturn(SocialSignInResult.withdrawn(7L));

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?withdrawn=true");
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
        given(socialSignIn.signIn(any())).willReturn(SocialSignInResult.restoreRequested(7L));

        successHandlerFor(List.of(CLIENT_ORIGIN)).onAuthenticationSuccess(request, response, kakaoToken());

        assertThat(response.getRedirectedUrl()).isEqualTo(REDIRECT_URI + "?withdrawn=true&restoreRequested=true");
        assertThat(session.isInvalid()).isTrue();
        assertThat(loginSession.releaseWithdrawnMember(request)).isEmpty();
    }

    private AuthenticationSuccessHandler successHandlerFor(List<String> clientOrigins) {
        return securityConfig.oauthLoginSuccessHandler(socialSignIn, loginSession, ClientOrigins.from(clientOrigins));
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
