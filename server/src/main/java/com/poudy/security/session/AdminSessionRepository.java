package com.poudy.security.session;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.session.MapSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

@Component
public class AdminSessionRepository extends MapSessionRepository {

    private final Map<String, Session> sessions;

    @Autowired
    public AdminSessionRepository(@Value("${poudy.auth.admin-session.idle-timeout}") Duration idleTimeout) {
        this(new ConcurrentHashMap<>(), idleTimeout);
    }

    public AdminSessionRepository(Map<String, Session> sessions, Duration idleTimeout) {
        super(sessions);
        this.sessions = sessions;
        setDefaultMaxInactiveInterval(idleTimeout);
    }

    @Scheduled(fixedDelay = 60000)
    public void removeExpiredSessions() {
        sessions.keySet().forEach(id -> sessions.computeIfPresent(id, (key, session) -> {
            if (session.isExpired()) {
                return null;
            }
            return session;
        }));
    }
}
