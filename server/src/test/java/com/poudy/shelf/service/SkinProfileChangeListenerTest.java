package com.poudy.shelf.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.repository.ShelfAnalysisRepository;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.service.UserService;
import com.poudy.user.support.UserNicknameTestFixture;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("피부 정보 변경 뒤 선반 성분 분석")
class SkinProfileChangeListenerTest {

    @Autowired
    private UserService userService;

    @MockitoSpyBean
    private ShelfService shelfService;

    @Autowired
    private ShelfAnalysisRepository analysisRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private long userId;

    @BeforeEach
    void setUp() {
        String identity = UUID.randomUUID().toString();
        userId = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, identity, identity + "@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
        shelfService.add(userId, 15L, ShelfUsageStatus.IN_USE, new Rating(RatingPreference.BAD, null, null));
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from \"user\" where id = ?", userId);
    }

    @Test
    @DisplayName("피부 정보가 바뀌면 저장이 커밋된 뒤 새 성분을 다시 표시하고, 성별·나이대만 바꾸면 그대로 둔다")
    void refreshesAnalysisAfterSkinProfileChanges() {
        Map<Long, Boolean> firstResult = analysisRepository.find(userId).newByIngredientId();
        assertThat(firstResult).isNotEmpty().allSatisfy((id, isNew) -> assertThat(isNew).isTrue());

        userService.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, null, null, false, null);
        assertThat(analysisRepository.find(userId).newByIngredientId()).isEqualTo(firstResult);

        userService.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, null, false, false, null);
        assertThat(analysisRepository.find(userId).newByIngredientId())
            .containsOnlyKeys(firstResult.keySet())
            .allSatisfy((id, isNew) -> assertThat(isNew).isFalse());
    }

    @Test
    @DisplayName("같은 회원의 같은 피부 정보 변경 요청이 겹쳐도 변경 전 조회부터 순서대로 처리해 한 번만 다시 계산한다")
    void refreshesOnceForConcurrentSameSkinChanges() throws Exception {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        CountDownLatch firstUpdated = new CountDownLatch(1);
        CountDownLatch commitFirst = new CountDownLatch(1);
        AtomicInteger firstBackendPid = new AtomicInteger();

        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<?> first = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
                firstBackendPid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                userService.updateProfile(userId, null, null, SkinType.DRY, null, false, null);
                firstUpdated.countDown();
                await(commitFirst);
            }));
            try {
                assertThat(firstUpdated.await(5, TimeUnit.SECONDS)).isTrue();
                Future<?> second = executor.submit(
                    () -> userService.updateProfile(userId, null, null, SkinType.DRY, null, false, null)
                );
                awaitBlockedBy(firstBackendPid.get(), second);

                commitFirst.countDown();
                first.get(5, TimeUnit.SECONDS);
                second.get(5, TimeUnit.SECONDS);
            } finally {
                commitFirst.countDown();
            }
        }

        verify(shelfService, times(1)).refreshAnalysisForSkinChange(userId);
    }

    @Test
    @DisplayName("선반 성분 분석을 다시 계산하지 못해도 피부 정보 저장은 유지하고 오류 로그를 남긴다")
    void keepsSkinProfileWhenRefreshFails(CapturedOutput output) {
        willThrow(new IllegalStateException("주의 성분군 누락")).given(shelfService).refreshAnalysisForSkinChange(anyLong());

        userService.updateProfile(userId, null, null, SkinType.DRY, true, false, null);

        assertThat(userService.findById(userId).skinType()).isEqualTo(SkinType.DRY);
        assertThat(userService.findById(userId).sensitiveSkin()).isTrue();
        assertThat(output).contains("shelf analysis refresh failed: userId=" + userId);
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
                throw new AssertionError("두 번째 프로필 변경이 첫 번째 트랜잭션을 기다리지 않았습니다.");
            }
            Thread.sleep(10);
        }
        throw new AssertionError("두 번째 프로필 변경의 잠금 대기를 확인하지 못했습니다.");
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
}
