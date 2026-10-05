package com.poudy.security.login.web;

import com.poudy.security.session.ExpiringSessionPolicy;
import com.poudy.security.session.LoginChannel;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class WebSessionPolicy extends ExpiringSessionPolicy {

    public WebSessionPolicy(
        @Value("${poudy.auth.web-session.idle-timeout}") Duration idleTimeout,
        @Value("${poudy.auth.web-session.absolute-timeout}") Duration absoluteTimeout,
        Clock clock
    ) {
        super(idleTimeout, absoluteTimeout, clock);
    }

    @Override
    public LoginChannel channel() {
        return LoginChannel.WEB;
    }
}
