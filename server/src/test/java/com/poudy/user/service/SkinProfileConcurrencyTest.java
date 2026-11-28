package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.shelf.service.ShelfService;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("피부 정보 동시 수정")
public class SkinProfileConcurrencyTest {

    private static final int CONCURRENT_REQUESTS = 20;

    @Autowired
    private UserService userService;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoSpyBean
    private ShelfService shelfService;

    private final List<Long> userIds = new ArrayList<>();

    @AfterEach
    public void deleteUsers() {
        userIds.forEach(id -> jdbc.update("delete from \"user\" where id = ?", id));
    }

    @Test
    @DisplayName("연결 풀보다 많은 요청이 동시에 피부 정보를 바꿔도 저장과 파우치 분석 갱신이 모두 성공한다")
    public void refreshesShelfAnalysisUnderConcurrentSkinChanges(CapturedOutput output) throws Exception {
        long seed = System.nanoTime();
        IntStream.range(0, CONCURRENT_REQUESTS)
            .mapToObj(
                index -> userService.signUp(
                    new OAuthAccount(
                        OAuthProvider.KAKAO,
                        "concurrent-" + seed + "-" + index,
                        "concurrent-" + seed + "-" + index + "@example.com",
                        true
                    )
                )
            )
            .forEach(userIds::add);
        CountDownLatch start = new CountDownLatch(1);

        long updateFailures;
        try (ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_REQUESTS)) {
            List<Future<?>> updates = userIds.stream()
                .<Future<?>>map(userId -> executor.submit(() -> {
                    start.await();
                    return userService
                        .updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, true, false, null);
                }))
                .toList();
            start.countDown();
            updateFailures = updates.stream()
                .filter(SkinProfileConcurrencyTest::failed)
                .count();
        }

        long refreshFailures = output.getAll().lines()
            .filter(line -> line.contains("shelf analysis refresh failed"))
            .count();
        assertThat(updateFailures).isZero();
        assertThat(refreshFailures).isZero();
        verify(shelfService, times(CONCURRENT_REQUESTS)).refreshAnalysisForSkinChange(anyLong());
    }

    private static boolean failed(Future<?> future) {
        try {
            future.get();
            return false;
        } catch (Exception exception) {
            return true;
        }
    }
}
