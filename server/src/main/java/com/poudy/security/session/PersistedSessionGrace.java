package com.poudy.security.session;

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

    public PersistedSessionGrace(LoginSession loginSession) {
        this.loginSession = loginSession;
    }

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.addContextCustomizers(context -> context.addLifecycleListener(event -> {
            if (Lifecycle.BEFORE_STOP_EVENT.equals(event.getType())) {
                Arrays.stream(context.getManager().findSessions())
                    .map(Session::getSession)
                    .forEach(session -> loginSession.grace(session, GRACE));
            }
        }));
    }
}
