package com.poudy.shelf.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.repository.ShelfAnalysisRepository;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@DisplayName("선반 변경 동시성")
class ShelfServiceConcurrencyTest {

    @Autowired
    private ShelfService shelfService;

    @Autowired
    private ShelfAnalysisRepository analysisRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private final List<Long> userIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        userIds.forEach(id -> jdbc.update("delete from \"user\" where id = ?", id));
    }

    @ParameterizedTest
    @EnumSource(Change.class)
    @DisplayName("같은 회원의 변경과 분석 저장은 순서대로 처리하고 다른 회원은 기다리지 않는다")
    void serializesShelfChanges(Change change) throws Exception {
        long userId = createUser();
        long otherUserId = createUser();
        for (long id : userIds) {
            if (change != Change.ADD) {
                shelfService.add(id, 15L, ShelfUsageStatus.IN_USE, new Rating(RatingPreference.BAD, null, null));
                shelfService.add(id, 1L, ShelfUsageStatus.IN_USE, new Rating(RatingPreference.BAD, null, null));
            }
        }
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        CountDownLatch firstChanged = new CountDownLatch(1);
        CountDownLatch commitFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger secondBackendPid = new AtomicInteger();

        try (var executor = Executors.newFixedThreadPool(3)) {
            Future<?> first = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
                change.apply(shelfService, userId, 15L);
                firstChanged.countDown();
                await(commitFirst);
            }));
            try {
                assertThat(firstChanged.await(5, TimeUnit.SECONDS)).isTrue();
                Future<?> second = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
                    secondBackendPid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                    secondStarted.countDown();
                    change.apply(shelfService, userId, 1L);
                }));
                assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
                awaitBlocked(secondBackendPid.get(), second);

                Future<?> otherUser = executor.submit(() -> {
                    change.apply(shelfService, otherUserId, 15L);
                    change.apply(shelfService, otherUserId, 1L);
                });
                otherUser.get(5, TimeUnit.SECONDS);
                commitFirst.countDown();
                first.get(5, TimeUnit.SECONDS);
                second.get(5, TimeUnit.SECONDS);

                assertThat(analysisRepository.find(userId).newByIngredientId())
                    .isEqualTo(analysisRepository.find(otherUserId).newByIngredientId());
            } finally {
                commitFirst.countDown();
            }
        }
    }

    @Test
    @DisplayName("피부 정보 변경 뒤 다시 계산도 같은 회원의 선반 변경이 끝날 때까지 기다린다")
    void serializesSkinChangeRefreshWithShelfChanges() throws Exception {
        long userId = createUser();
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        CountDownLatch firstChanged = new CountDownLatch(1);
        CountDownLatch commitFirst = new CountDownLatch(1);
        AtomicInteger firstBackendPid = new AtomicInteger();

        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<?> first = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
                firstBackendPid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                Change.ADD.apply(shelfService, userId, 15L);
                firstChanged.countDown();
                await(commitFirst);
            }));
            try {
                assertThat(firstChanged.await(5, TimeUnit.SECONDS)).isTrue();
                Future<?> refresh = executor.submit(() -> shelfService.refreshAnalysisForSkinChange(userId));
                awaitBlockedBy(firstBackendPid.get(), refresh);

                commitFirst.countDown();
                first.get(5, TimeUnit.SECONDS);
                refresh.get(5, TimeUnit.SECONDS);

                assertThat(analysisRepository.find(userId).newByIngredientId())
                    .isNotEmpty()
                    .allSatisfy((id, isNew) -> assertThat(isNew).isFalse());
            } finally {
                commitFirst.countDown();
            }
        }
    }

    private long createUser() {
        String identity = UUID.randomUUID().toString();
        long id = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, identity, identity + "@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
        userIds.add(id);
        return id;
    }

    private void awaitBlocked(int backendPid, Future<?> request) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(
                jdbc.queryForObject(
                    "select cardinality(pg_blocking_pids(?)) > 0",
                    Boolean.class,
                    backendPid
                )
            )) {
                return;
            }
            if (request.isDone()) {
                request.get(5, TimeUnit.SECONDS);
                throw new AssertionError("같은 회원의 두 번째 요청이 첫 번째 트랜잭션을 기다리지 않았습니다.");
            }
            Thread.sleep(10);
        }
        throw new AssertionError("두 번째 요청의 잠금 대기를 확인하지 못했습니다.");
    }

    private void awaitBlockedBy(int blockingBackendPid, Future<?> request) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(
                jdbc.queryForObject(
                    "select exists(select 1 from pg_stat_activity where ? = any(pg_blocking_pids(pid)))",
                    Boolean.class,
                    blockingBackendPid
                )
            )) {
                return;
            }
            if (request.isDone()) {
                request.get(5, TimeUnit.SECONDS);
                throw new AssertionError("다시 계산이 선반 변경 트랜잭션을 기다리지 않았습니다.");
            }
            Thread.sleep(10);
        }
        throw new AssertionError("다시 계산의 잠금 대기를 확인하지 못했습니다.");
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(20, TimeUnit.SECONDS)) {
                throw new AssertionError("첫 번째 트랜잭션의 커밋 신호를 기다리다 시간이 초과됐습니다.");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private enum Change {
        ADD,
        UPDATE,
        REMOVE;

        void apply(ShelfService service, long userId, long productId) {
            switch (this) {
                case ADD -> service.add(
                    userId,
                    productId,
                    ShelfUsageStatus.IN_USE,
                    new Rating(RatingPreference.BAD, null, null)
                );
                case UPDATE -> service.update(
                    userId,
                    productId,
                    ShelfUsageStatus.IN_USE,
                    new Rating(RatingPreference.GOOD, null, null)
                );
                case REMOVE -> service.remove(userId, productId);
            }
        }
    }
}
