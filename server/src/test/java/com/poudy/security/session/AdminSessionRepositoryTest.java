package com.poudy.security.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mockStatic;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
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
import org.junit.jupiter.api.io.TempDir;
import org.mockito.MockedStatic;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.MapSession;
import org.springframework.session.Session;

@DisplayName("관리자 세션 저장소")
class AdminSessionRepositoryTest {

    @Test
    @DisplayName("재배포 후 관리자 인증과 기존 만료 시각을 그대로 복원한다")
    void restoresAuthenticationWithoutExtendingSession(@TempDir Path directory) throws Exception {
        String file = directory.resolve("ADMIN_SESSIONS.ser").toString();
        AdminSessionRepository before = new AdminSessionRepository(Duration.ofHours(1), file);
        Clock clock = Clock.fixed(Instant.now(), ZoneOffset.UTC);
        AdminSessionPolicy policy = new AdminSessionPolicy(Duration.ofHours(1), Duration.ofHours(12), clock);
        LoginSession login = new LoginSession(List.of(policy), clock, new HttpSessionSecurityContextRepository());
        MockHttpServletRequest request = new MockHttpServletRequest();
        try {
            login.signInAdmin("admin", request, new MockHttpServletResponse());
        } finally {
            SecurityContextHolder.clearContext();
        }
        MapSession session = before.createSession();
        session.setLastAccessedTime(Instant.now().minusSeconds(60));
        Collections.list(request.getSession().getAttributeNames())
            .forEach(name -> session.setAttribute(name, request.getSession().getAttribute(name)));
        before.save(session);
        try (AnnotationConfigApplicationContext application = new AnnotationConfigApplicationContext()) {
            application.registerBean(AdminSessionRepository.class, () -> before);
            application.refresh();
        }

        AdminSessionRepository after = new AdminSessionRepository(Duration.ofHours(1), file);
        MapSession restored = after.findById(session.getId());

        assertThat(restored).isNotNull();
        SecurityContext restoredContext = restored
            .getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertThat(restoredContext).isNotNull();
        assertThat(restoredContext.getAuthentication().getPrincipal()).isEqualTo(new LoginAdmin("admin"));
        assertThat(Role.ADMIN.isGrantedTo(restoredContext.getAuthentication())).isTrue();
        assertThat(restored.getCreationTime()).isEqualTo(session.getCreationTime());
        assertThat(restored.getLastAccessedTime()).isEqualTo(session.getLastAccessedTime());
        assertThat(restored.getMaxInactiveInterval()).isEqualTo(session.getMaxInactiveInterval());
        MockHttpSession restoredHttpSession = new MockHttpSession();
        restored.getAttributeNames()
            .forEach(name -> restoredHttpSession.setAttribute(name, restored.getAttribute(name)));
        AdminSessionPolicy expiredPolicy = new AdminSessionPolicy(
            Duration.ofHours(1),
            Duration.ofHours(12),
            Clock.offset(clock, Duration.ofHours(13))
        );
        expiredPolicy.refresh(restoredHttpSession, new MockHttpServletResponse());
        assertThat(restoredHttpSession.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("재시작 사이에 만료된 관리자 세션은 복원하지 않는다")
    void rejectsSessionExpiredDuringRestart(@TempDir Path directory) throws Exception {
        String file = directory.resolve("ADMIN_SESSIONS.ser").toString();
        AdminSessionRepository before = new AdminSessionRepository(Duration.ofHours(1), file);
        MapSession session = before.createSession();
        before.save(session);
        before.storeSessions();
        Instant restartedAt = Instant.now().plus(Duration.ofHours(2));

        try (MockedStatic<Instant> time = mockStatic(Instant.class, CALLS_REAL_METHODS)) {
            time.when(Instant::now).thenReturn(restartedAt);
            AdminSessionRepository after = new AdminSessionRepository(Duration.ofHours(1), file);
            assertThat(after.findById(session.getId())).isNull();
        }
    }

    @Test
    @DisplayName("복원한 세션을 로그아웃한 뒤 재시작해도 이전 파일로 인증이 되살아나지 않는다")
    void neverReplaysLoggedOutSession(@TempDir Path directory) throws Exception {
        String file = directory.resolve("ADMIN_SESSIONS.ser").toString();
        AdminSessionRepository before = new AdminSessionRepository(Duration.ofHours(1), file);
        MapSession session = before.createSession();
        before.save(session);
        before.storeSessions();
        AdminSessionRepository after = new AdminSessionRepository(Duration.ofHours(1), file);
        after.deleteById(session.getId());

        AdminSessionRepository interrupted = new AdminSessionRepository(Duration.ofHours(1), file);
        assertThat(interrupted.findById(session.getId())).isNull();

        after.storeSessions();
        AdminSessionRepository restarted = new AdminSessionRepository(Duration.ofHours(1), file);
        assertThat(restarted.findById(session.getId())).isNull();
    }

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
        AdminSessionRepository repository = new AdminSessionRepository(Duration.ofHours(1), "");
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
