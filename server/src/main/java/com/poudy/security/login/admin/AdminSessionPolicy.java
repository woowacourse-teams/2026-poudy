package com.poudy.security.login.admin;

import com.poudy.security.session.ExpiringSessionPolicy;
import com.poudy.security.session.LoginChannel;

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
