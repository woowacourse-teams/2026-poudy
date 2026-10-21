package com.poudy.security.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mockStatic;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.session.MapSession;
import org.springframework.session.Session;

@DisplayName("관리자 메모리 세션 저장소")
class AdminSessionRepositoryTest {

    @Test
    @DisplayName("접속이 끊긴 만료 세션을 정리하고 활성 세션은 유지한다")
    void removesOnlyExpiredSessions() {
        Map<String, Session> sessions = new ConcurrentHashMap<>();
        AdminSessionRepository repository = new AdminSessionRepository(sessions, Duration.ofHours(1));
        MapSession expired = repository.createSession();
        expired.setLastAccessedTime(Instant.now().minus(Duration.ofHours(2)));
        repository.save(expired);
        MapSession active = repository.createSession();
        repository.save(active);

        repository.removeExpiredSessions();

        assertThat(sessions).containsOnlyKeys(active.getId());
        assertThat(repository.findById(active.getId())).isNotNull();
    }

    @Test
    @DisplayName("만료 정리와 같은 ID의 갱신 저장이 겹쳐도 갱신된 관리자 세션을 유지한다")
    void keepsSessionRefreshedDuringCleanup() throws Exception {
        AdminSessionRepository repository = new AdminSessionRepository(Duration.ofHours(1));
        MapSession expired = repository.createSession();
        expired.setLastAccessedTime(Instant.now().minus(Duration.ofHours(2)));
        repository.save(expired);
        MapSession refreshed = new MapSession(expired);
        refreshed.setLastAccessedTime(Instant.now());
        refreshed.setAttribute("username", "admin");
        Instant cleanupTime = Instant.now();
        CountDownLatch checkingExpiry = new CountDownLatch(1);
        CountDownLatch resumeCleanup = new CountDownLatch(1);

        try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
            Future<?> cleanup = workers.submit(() -> {
                try (MockedStatic<Instant> time = mockStatic(Instant.class, CALLS_REAL_METHODS)) {
                    time.when(Instant::now).thenAnswer(invocation -> {
                        checkingExpiry.countDown();
                        assertThat(resumeCleanup.await(5, TimeUnit.SECONDS)).isTrue();
                        return cleanupTime;
                    });
                    repository.removeExpiredSessions();
                }
            });
            try {
                assertThat(checkingExpiry.await(5, TimeUnit.SECONDS)).isTrue();
                Future<?> save = workers.submit(() -> repository.save(refreshed));
                try {
                    save.get(200, TimeUnit.MILLISECONDS);
                } catch (TimeoutException expected) {
                    assertThat(save.isDone()).isFalse();
                } finally {
                    resumeCleanup.countDown();
                }
                cleanup.get(5, TimeUnit.SECONDS);
                save.get(5, TimeUnit.SECONDS);
            } finally {
                resumeCleanup.countDown();
            }
        }

        MapSession retained = repository.findById(refreshed.getId());
        assertThat(retained).isNotNull();
        assertThat(retained.<String>getAttribute("username")).isEqualTo("admin");
    }
}
