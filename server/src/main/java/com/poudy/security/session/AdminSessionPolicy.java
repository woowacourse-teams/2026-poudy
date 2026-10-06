package com.poudy.security.session;

import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdminSessionPolicy extends ExpiringSessionPolicy {

    public AdminSessionPolicy(
        @Value("${poudy.auth.admin-session.idle-timeout}") Duration idleTimeout,
        @Value("${poudy.auth.admin-session.absolute-timeout}") Duration absoluteTimeout,
        Clock clock
    ) {
        super(idleTimeout, absoluteTimeout, clock);
    }

    @Override
    public LoginChannel channel() {
        return LoginChannel.ADMIN;
    }
}
