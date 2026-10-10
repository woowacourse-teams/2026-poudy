package com.poudy.security.session;

import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import org.apache.catalina.Lifecycle;
import org.apache.catalina.Session;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.stereotype.Component;

@Component
public class PersistedSessionGrace implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    private static final Duration GRACE = Duration.ofMinutes(5);

    private final LoginSession loginSession;
    private final Clock clock;

    public PersistedSessionGrace(LoginSession loginSession, Clock clock) {
        this.loginSession = loginSession;
        this.clock = clock;
    }

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.addContextCustomizers(context -> context.addLifecycleListener(event -> {
            if (Lifecycle.BEFORE_STOP_EVENT.equals(event.getType())) {
                extend(context.getManager().findSessions());
            }
        }));
    }

    public void extend(Session[] sessions) {
        Arrays.stream(sessions).forEach(this::extend);
    }

    private void extend(Session session) {
        int maxInactiveSeconds = session.getMaxInactiveInterval();
        long idleDeadline = session.getThisAccessedTimeInternal() + Duration.ofSeconds(maxInactiveSeconds).toMillis();
        if (maxInactiveSeconds > 0 && idleDeadline - clock.millis() < GRACE.toMillis()) {
            session.setMaxInactiveInterval(maxInactiveSeconds + Math.toIntExact(GRACE.toSeconds()));
        }
        loginSession.graceExpiry(session.getSession(), GRACE);
    }
}
