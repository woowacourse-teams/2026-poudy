package com.poudy.security.session;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.session.MapSession;
import org.springframework.session.MapSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

@Component
public class AdminSessionRepository extends MapSessionRepository {

    private final Map<String, Session> sessions;
    private final @Nullable Path storeFile;

    @Autowired
    public AdminSessionRepository(
        @Value("${poudy.auth.admin-session.idle-timeout}") Duration idleTimeout,
        @Value("${poudy.auth.admin-session.store-file:}") String storeFile
    ) {
        this(new ConcurrentHashMap<>(), idleTimeout, storeFile);
    }

    public AdminSessionRepository(Map<String, Session> sessions, Duration idleTimeout) {
        this(sessions, idleTimeout, "");
    }

    public AdminSessionRepository(Map<String, Session> sessions, Duration idleTimeout, String storeFile) {
        super(sessions);
        this.sessions = sessions;
        setDefaultMaxInactiveInterval(idleTimeout);
        if (storeFile.isBlank()) {
            this.storeFile = null;
            return;
        }
        this.storeFile = Path.of(storeFile).toAbsolutePath();
        restoreSessions();
    }

    public void restoreSessions() {
        if (storeFile == null || !Files.exists(storeFile)) {
            return;
        }
        try {
            try (ObjectInputStream input = new ObjectInputStream(Files.newInputStream(storeFile))) {
                int count = input.readInt();
                for (int index = 0; index < count; index++) {
                    MapSession session = (MapSession) input.readObject();
                    if (!session.isExpired()) {
                        save(session);
                    }
                }
            }
            Files.delete(storeFile);
        } catch (IOException | ClassNotFoundException exception) {
            throw new IllegalStateException("관리자 세션을 복원하지 못했습니다.", exception);
        }
    }

    @PreDestroy
    public void storeSessions() throws IOException {
        if (storeFile == null) {
            return;
        }
        List<MapSession> active = sessions.values().stream()
            .filter(session -> !session.isExpired())
            .map(MapSession::new)
            .toList();
        Files.createDirectories(storeFile.getParent());
        Path temporary = Files.createTempFile(storeFile.getParent(), "admin-sessions-", ".tmp");
        try {
            try (ObjectOutputStream output = new ObjectOutputStream(Files.newOutputStream(temporary))) {
                output.writeInt(active.size());
                for (MapSession session : active) {
                    output.writeObject(session);
                }
            }
            Files.move(temporary, storeFile, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
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
