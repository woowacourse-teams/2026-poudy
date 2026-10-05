package com.poudy.security.session;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.login.admin.AdminSessionPolicy;
import com.poudy.security.login.web.WebSessionPolicy;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@DisplayName("로그인 세션")
class LoginSessionTest {

    private static final Instant SIGNED_IN_AT = Instant.parse("2026-10-03T00:00:00Z");
    private static final Duration IDLE = Duration.ofDays(1);
    private static final Duration ABSOLUTE = Duration.ofDays(7);
    private static final Duration ADMIN_IDLE = Duration.ofHours(1);
    private static final Duration ADMIN_ABSOLUTE = Duration.ofHours(12);
    private static final long MEMBER_ID = 7L;
    private static final String PREVIEW = "https://pr-111.preview.poudy.site";
    private static final String STATE = "state-1";

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("로그인하면 회원 ID만 가진 인증을 세션에 저장하고 비활동 만료를 하루로 둔다")
    void signsIn() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        sessionAt(SIGNED_IN_AT).signIn(MEMBER_ID, LoginChannel.WEB, request, new MockHttpServletResponse());

        SecurityContext context = (SecurityContext) request.getSession()
            .getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertThat(context.getAuthentication().getPrincipal()).isEqualTo(new LoginMember(MEMBER_ID));
        assertThat(request.getSession().getMaxInactiveInterval()).isEqualTo(IDLE.toSeconds());
    }

    @Test
    @DisplayName("로그아웃하면 세션과 인증을 버린다")
    void signsOut() {
        MockHttpServletRequest request = signedInRequest();
        MockHttpSession session = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT).signOut(request, new MockHttpServletResponse());

        assertThat(session.isInvalid()).isTrue();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("로그인하고 7일이 지나면 세션을 버린다")
    void expiresAfterAbsoluteTimeout() {
        MockHttpServletRequest request = signedInRequest();
        MockHttpSession session = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT.plus(ABSOLUTE)).refresh(request, new MockHttpServletResponse());

        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("7일이 지나기 전에는 세션을 유지한다")
    void keepsSessionBeforeAbsoluteTimeout() {
        MockHttpServletRequest request = signedInRequest();
        MockHttpSession session = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT.plus(ABSOLUTE).minusSeconds(1)).refresh(request, new MockHttpServletResponse());

        assertThat(session.isInvalid()).isFalse();
    }

    @Test
    @DisplayName("로그인하지 않은 세션은 건드리지 않는다")
    void ignoresSessionWithoutSignIn() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);

        sessionAt(SIGNED_IN_AT.plus(Duration.ofDays(365))).refresh(request, new MockHttpServletResponse());

        assertThat(session.isInvalid()).isFalse();
    }

    @Test
    @DisplayName("탈퇴 회원을 맡겨 두면 로그인하지 않은 새 세션에 두고, 한 번 꺼내면 다시 꺼낼 수 없다")
    void holdsWithdrawnMemberOnce() {
        MockHttpServletRequest request = signedInRequest();
        MockHttpSession signedInSession = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT).holdWithdrawnMember(MEMBER_ID, request, new MockHttpServletResponse());

        assertThat(signedInSession.isInvalid()).isTrue();
        assertThat(request.getSession().getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
            .isNull();
        assertThat(sessionAt(SIGNED_IN_AT).releaseWithdrawnMember(request)).contains(MEMBER_ID);
        assertThat(sessionAt(SIGNED_IN_AT).releaseWithdrawnMember(request)).isEmpty();
    }

    @Test
    @DisplayName("맡겨 둔 복귀 오리진은 같은 state의 콜백에서 한 번만 꺼낼 수 있다")
    void takesReturnOriginOnce() {
        MockHttpServletRequest start = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).rememberReturnOrigin(PREVIEW, STATE, start);
        MockHttpServletRequest callback = callbackOf(start, STATE);

        assertThat(sessionAt(SIGNED_IN_AT).takeReturnOrigin(callback)).contains(PREVIEW);
        assertThat(sessionAt(SIGNED_IN_AT).takeReturnOrigin(callback)).isEmpty();
    }

    @Test
    @DisplayName("state가 다르거나 없는 콜백은 복귀 오리진을 꺼내지 못하고 남겨 둔다")
    void keepsReturnOriginForOtherState() {
        MockHttpServletRequest start = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).rememberReturnOrigin(PREVIEW, STATE, start);

        assertThat(sessionAt(SIGNED_IN_AT).takeReturnOrigin(callbackOf(start, "other-state"))).isEmpty();
        assertThat(sessionAt(SIGNED_IN_AT).takeReturnOrigin(callbackOf(start, null))).isEmpty();
        assertThat(sessionAt(SIGNED_IN_AT).takeReturnOrigin(callbackOf(start, STATE))).contains(PREVIEW);
    }

    @Test
    @DisplayName("복귀 오리진을 잊으면 꺼낼 수 없고, 세션이 없으면 만들지 않는다")
    void forgetsReturnOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).forgetReturnOrigin(request);
        assertThat(request.getSession(false)).isNull();

        sessionAt(SIGNED_IN_AT).rememberReturnOrigin(PREVIEW, STATE, request);
        sessionAt(SIGNED_IN_AT).forgetReturnOrigin(request);

        assertThat(sessionAt(SIGNED_IN_AT).takeReturnOrigin(callbackOf(request, STATE))).isEmpty();
    }

    @Test
    @DisplayName("탈퇴 회원을 맡겨 둔 세션에서 다른 계정으로 로그인하면 맡겨 둔 탈퇴 회원을 버린다")
    void dropsWithdrawnMemberOnSignIn() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).holdWithdrawnMember(MEMBER_ID, request, new MockHttpServletResponse());

        sessionAt(SIGNED_IN_AT).signIn(MEMBER_ID + 1, LoginChannel.WEB, request, new MockHttpServletResponse());

        assertThat(sessionAt(SIGNED_IN_AT).releaseWithdrawnMember(request)).isEmpty();
    }

    @Test
    @DisplayName("관리자로 로그인하면 기존 세션을 버리고 관리자 인증만 가진 새 세션을 비활동 1시간으로 둔다")
    void signsInAdmin() {
        MockHttpServletRequest request = signedInRequest();
        MockHttpSession memberSession = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT).signInAdmin("admin", request, new MockHttpServletResponse());

        SecurityContext context = (SecurityContext) request.getSession()
            .getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertThat(memberSession.isInvalid()).isTrue();
        assertThat(context.getAuthentication().getPrincipal()).isEqualTo(new LoginAdmin("admin"));
        assertThat(context.getAuthentication().getAuthorities()).extracting(Object::toString)
            .containsExactly("ROLE_ADMIN");
        assertThat(request.getSession().getMaxInactiveInterval()).isEqualTo(ADMIN_IDLE.toSeconds());
    }

    @Test
    @DisplayName("관리자 세션은 로그인하고 12시간이 지나면 버린다")
    void expiresAdminSessionAfterAbsoluteTimeout() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).signInAdmin("admin", request, new MockHttpServletResponse());
        MockHttpSession session = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT.plus(ADMIN_ABSOLUTE).minusSeconds(1)).refresh(request, new MockHttpServletResponse());
        assertThat(session.isInvalid()).isFalse();

        sessionAt(SIGNED_IN_AT.plus(ADMIN_ABSOLUTE)).refresh(request, new MockHttpServletResponse());
        assertThat(session.isInvalid()).isTrue();
    }

    private MockHttpServletRequest callbackOf(MockHttpServletRequest start, String state) {
        MockHttpServletRequest callback = new MockHttpServletRequest();
        callback.setSession(start.getSession());
        if (state != null) {
            callback.setParameter("state", state);
        }
        return callback;
    }

    @Test
    @DisplayName("웹 세션은 쿠키 수명을 늘리지 않는다")
    void doesNotExtendWebSessionCookie() {
        MockHttpServletRequest request = signedInRequest();
        ((MockHttpSession) request.getSession()).setNew(false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        sessionAt(SIGNED_IN_AT.plus(Duration.ofHours(1))).refresh(request, response);

        assertThat(response.getHeader("Set-Cookie")).isNull();
    }

    private MockHttpServletRequest signedInRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).signIn(MEMBER_ID, LoginChannel.WEB, request, new MockHttpServletResponse());
        return request;
    }

    private LoginSession sessionAt(Instant now) {
        return new LoginSession(
            List.of(
                new WebSessionPolicy(IDLE, ABSOLUTE, Clock.fixed(now, ZoneOffset.UTC)),
                new AdminSessionPolicy(ADMIN_IDLE, ADMIN_ABSOLUTE, Clock.fixed(now, ZoneOffset.UTC))
            ),
            new HttpSessionSecurityContextRepository()
        );
    }
}
