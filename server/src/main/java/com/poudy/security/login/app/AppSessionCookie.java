package com.poudy.security.login.app;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AppSessionCookie {

    private static final String EXTENDED_AT = AppSessionCookie.class.getName() + ".extendedAt";
    private static final Duration EXTEND_INTERVAL = Duration.ofDays(1);
    private static final String ROOT_PATH = "/";

    private final String name;
    private final Duration maxAge;
    private final boolean secure;
    private final String sameSite;
    private final Clock clock;

    public AppSessionCookie(
        @Value("${server.servlet.session.cookie.name:JSESSIONID}") String name,
        @Value("${server.servlet.session.cookie.max-age}") Duration maxAge,
        @Value("${server.servlet.session.cookie.secure}") boolean secure,
        @Value("${server.servlet.session.cookie.same-site}") String sameSite,
        Clock clock
    ) {
        this.name = name;
        this.maxAge = maxAge;
        this.secure = secure;
        this.sameSite = sameSite;
        this.clock = clock;
    }

    public void extend(HttpSession session, HttpServletResponse response) {
        Instant now = clock.instant();
        if (session.isNew() || recentlyExtended(session, now)) {
            return;
        }
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            ResponseCookie.from(name, session.getId())
                .path(ROOT_PATH)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .maxAge(maxAge)
                .build()
                .toString()
        );
        session.setAttribute(EXTENDED_AT, now);
    }

    private boolean recentlyExtended(HttpSession session, Instant now) {
        return session.getAttribute(EXTENDED_AT) instanceof Instant extendedAt
            && now.isBefore(extendedAt.plus(EXTEND_INTERVAL));
    }
}
