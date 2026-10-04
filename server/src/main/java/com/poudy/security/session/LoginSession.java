package com.poudy.security.session;

import com.poudy.security.domain.SocialSignInResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
public class LoginSession {

    private static final String EXPIRES_AT = LoginSession.class.getName() + ".expiresAt";
    private static final String WITHDRAWN_MEMBER_ID = LoginSession.class.getName() + ".withdrawnMemberId";
    private static final Duration WITHDRAWN_HOLD_TIMEOUT = Duration.ofMinutes(10);

    private final Duration idleTimeout;
    private final Duration absoluteTimeout;
    private final Duration adminIdleTimeout;
    private final Duration adminAbsoluteTimeout;
    private final Clock clock;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder
        .getContextHolderStrategy();
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    public LoginSession(
        @Value("${poudy.auth.web-session.idle-timeout}") Duration idleTimeout,
        @Value("${poudy.auth.web-session.absolute-timeout}") Duration absoluteTimeout,
        @Value("${poudy.auth.admin-session.idle-timeout}") Duration adminIdleTimeout,
        @Value("${poudy.auth.admin-session.absolute-timeout}") Duration adminAbsoluteTimeout,
        Clock clock,
        SecurityContextRepository securityContextRepository
    ) {
        this.idleTimeout = idleTimeout;
        this.absoluteTimeout = absoluteTimeout;
        this.adminIdleTimeout = adminIdleTimeout;
        this.adminAbsoluteTimeout = adminAbsoluteTimeout;
        this.clock = clock;
        this.securityContextRepository = securityContextRepository;
    }

    public void applySignInResult(SocialSignInResult result, HttpServletRequest request, HttpServletResponse response) {
        switch (result.status()) {
            case SIGNED_IN -> signIn(result.memberId(), request, response);
            case WITHDRAWN -> holdWithdrawnMember(result.memberId(), request, response);
            case RESTORE_REQUESTED -> signOut(request, response);
        }
    }

    public void signIn(long memberId, HttpServletRequest request, HttpServletResponse response) {
        saveAuthentication(
            new LoginMember(memberId).toAuthentication(),
            idleTimeout,
            absoluteTimeout,
            request,
            response
        );
        request.getSession().removeAttribute(WITHDRAWN_MEMBER_ID);
    }

    public void signInAdmin(String username, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        saveAuthentication(
            new LoginAdmin(username).toAuthentication(),
            adminIdleTimeout,
            adminAbsoluteTimeout,
            request,
            response
        );
    }

    public void holdWithdrawnMember(long memberId, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        HttpSession session = request.getSession();
        session.setMaxInactiveInterval(Math.toIntExact(WITHDRAWN_HOLD_TIMEOUT.toSeconds()));
        session.setAttribute(WITHDRAWN_MEMBER_ID, memberId);
    }

    public Optional<Long> releaseWithdrawnMember(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(WITHDRAWN_MEMBER_ID) instanceof Long memberId)) {
            return Optional.empty();
        }
        session.removeAttribute(WITHDRAWN_MEMBER_ID);
        return Optional.of(memberId);
    }

    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        logoutHandler.logout(request, response, null);
    }

    public void expireIfOverdue(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        if (session.getAttribute(EXPIRES_AT) instanceof Instant expiresAt && !clock.instant().isBefore(expiresAt)) {
            session.invalidate();
        }
    }

    private void saveAuthentication(
        Authentication authentication,
        Duration idleTimeout,
        Duration absoluteTimeout,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        HttpSession session = request.getSession();
        session.setMaxInactiveInterval(Math.toIntExact(idleTimeout.toSeconds()));
        session.setAttribute(EXPIRES_AT, clock.instant().plus(absoluteTimeout));
    }
}
