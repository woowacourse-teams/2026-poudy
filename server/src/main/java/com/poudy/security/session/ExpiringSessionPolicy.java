package com.poudy.security.session;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

public abstract class ExpiringSessionPolicy implements SessionPolicy {

    private static final String EXPIRES_AT = ExpiringSessionPolicy.class.getName() + ".expiresAt";

    private final Duration idleTimeout;
    private final Duration absoluteTimeout;
    private final Clock clock;

    protected ExpiringSessionPolicy(Duration idleTimeout, Duration absoluteTimeout, Clock clock) {
        this.idleTimeout = idleTimeout;
        this.absoluteTimeout = absoluteTimeout;
        this.clock = clock;
    }

    @Override
    public void start(HttpSession session) {
        session.setMaxInactiveInterval(Math.toIntExact(idleTimeout.toSeconds()));
        session.setAttribute(EXPIRES_AT, clock.instant().plus(absoluteTimeout));
    }

    @Override
    public void refresh(HttpSession session, HttpServletResponse response) {
        if (session.getAttribute(EXPIRES_AT) instanceof Instant expiresAt && !clock.instant().isBefore(expiresAt)) {
            session.invalidate();
        }
    }
}
