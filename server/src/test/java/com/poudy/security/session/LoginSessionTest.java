package com.poudy.security.session;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
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
    private static final long MEMBER_ID = 7L;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("로그인하면 회원 ID만 가진 인증을 세션에 저장하고 비활동 만료를 하루로 둔다")
    void signsIn() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        sessionAt(SIGNED_IN_AT).signIn(MEMBER_ID, request, new MockHttpServletResponse());

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

        sessionAt(SIGNED_IN_AT.plus(ABSOLUTE)).expireIfOverdue(request);

        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("7일이 지나기 전에는 세션을 유지한다")
    void keepsSessionBeforeAbsoluteTimeout() {
        MockHttpServletRequest request = signedInRequest();
        MockHttpSession session = (MockHttpSession) request.getSession();

        sessionAt(SIGNED_IN_AT.plus(ABSOLUTE).minusSeconds(1)).expireIfOverdue(request);

        assertThat(session.isInvalid()).isFalse();
    }

    @Test
    @DisplayName("로그인하지 않은 세션은 건드리지 않는다")
    void ignoresSessionWithoutSignIn() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);

        sessionAt(SIGNED_IN_AT.plus(Duration.ofDays(365))).expireIfOverdue(request);

        assertThat(session.isInvalid()).isFalse();
    }

    private MockHttpServletRequest signedInRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionAt(SIGNED_IN_AT).signIn(MEMBER_ID, request, new MockHttpServletResponse());
        return request;
    }

    private LoginSession sessionAt(Instant now) {
        return new LoginSession(
            IDLE,
            ABSOLUTE,
            Clock.fixed(now, ZoneOffset.UTC),
            new HttpSessionSecurityContextRepository()
        );
    }
}
