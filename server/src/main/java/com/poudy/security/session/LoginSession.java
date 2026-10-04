package com.poudy.security.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
public class LoginSession {

    private static final String SIGNED_IN_AT = LoginSession.class.getName() + ".signedInAt";

    private final Duration idleTimeout;
    private final Duration absoluteTimeout;
    private final Clock clock;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder
        .getContextHolderStrategy();
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    public LoginSession(
        @Value("${poudy.auth.web-session.idle-timeout}") Duration idleTimeout,
        @Value("${poudy.auth.web-session.absolute-timeout}") Duration absoluteTimeout,
        Clock clock,
        SecurityContextRepository securityContextRepository
    ) {
        this.idleTimeout = idleTimeout;
        this.absoluteTimeout = absoluteTimeout;
        this.clock = clock;
        this.securityContextRepository = securityContextRepository;
    }

    public void signIn(long memberId, HttpServletRequest request, HttpServletResponse response) {
        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(new LoginMember(memberId).toAuthentication());
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        HttpSession session = request.getSession();
        session.setMaxInactiveInterval(Math.toIntExact(idleTimeout.toSeconds()));
        session.setAttribute(SIGNED_IN_AT, clock.instant());
    }

    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        logoutHandler.logout(request, response, null);
    }

    public void expireIfOverdue(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        if (session.getAttribute(SIGNED_IN_AT) instanceof Instant signedInAt
            && !clock.instant().isBefore(signedInAt.plus(absoluteTimeout))) {
            session.invalidate();
        }
    }
}
