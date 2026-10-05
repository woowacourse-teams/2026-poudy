package com.poudy.security.login.app;

import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.SessionPolicy;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AppSessionPolicy implements SessionPolicy {

    private final Duration idleTimeout;
    private final AppSessionCookie appSessionCookie;

    public AppSessionPolicy(
        @Value("${poudy.auth.app-session.idle-timeout}") Duration idleTimeout,
        AppSessionCookie appSessionCookie
    ) {
        this.idleTimeout = idleTimeout;
        this.appSessionCookie = appSessionCookie;
    }

    @Override
    public LoginChannel channel() {
        return LoginChannel.APP;
    }

    @Override
    public void start(HttpSession session) {
        session.setMaxInactiveInterval(Math.toIntExact(idleTimeout.toSeconds()));
    }

    @Override
    public void refresh(HttpSession session, HttpServletResponse response) {
        appSessionCookie.extend(session, response);
    }
}
