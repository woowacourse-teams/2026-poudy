package com.poudy.inquiry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.inquiry.domain.InquiryKind;
import com.poudy.inquiry.service.InquiryService;
import com.poudy.notice.domain.NoticeStatus;
import com.poudy.notice.service.NoticeService;
import com.poudy.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminConsistencyIntegrationTest {
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    InquiryService inquiries;
    @Autowired
    UserRepository users;
    @Autowired
    NoticeService notices;
    @Autowired
    PlatformTransactionManager transactionManager;

    @Test
    void mixedBulkDeduplicatesAndSameStateDoesNotCreateEvents() {
        var feedback = UUID.randomUUID();
        var registration = UUID.randomUUID();
        jdbc.update(
            "insert into feedback(id,subject_type,content,status_changed_at) values(?,'OTHER','혼합 일괄 검사',now() AT TIME ZONE 'Asia/Seoul')",
            feedback
        );
        jdbc.update(
            "insert into product_request(id,product_name,brand_name,status_changed_at) values(?,'혼합 제품','브랜드',now() AT TIME ZONE 'Asia/Seoul')",
            registration
        );
        var targets = List.of(
            new InquiryService.Target(InquiryKind.FEEDBACK, feedback),
            new InquiryService.Target(InquiryKind.PRODUCT_REGISTRATION, registration),
            new InquiryService.Target(InquiryKind.FEEDBACK, feedback)
        );
        try {
            for (var state : List.of(
                FeedbackStatus.IN_PROGRESS,
                FeedbackStatus.REVIEW_PLANNED,
                FeedbackStatus.COMPLETED,
                FeedbackStatus.REJECTED,
                FeedbackStatus.RECEIVED
            )) {
                inquiries.status(targets, state);
                inquiries.status(targets, state);
                assertThat(inquiries.detail(InquiryKind.FEEDBACK, feedback).status()).isEqualTo(state);
                assertThat(inquiries.detail(InquiryKind.PRODUCT_REGISTRATION, registration).status()).isEqualTo(state);
            }
            inquiries.assign(targets, true);
            inquiries.assign(targets, true);
            assertThat(inquiries.events(InquiryKind.FEEDBACK, feedback)).hasSize(6);
            assertThat(inquiries.events(InquiryKind.PRODUCT_REGISTRATION, registration)).hasSize(6);
        } finally {
            jdbc.update("delete from feedback where id=?", feedback);
            jdbc.update("delete from product_request where id=?", registration);
        }
    }

    @Test
    void concurrentRestoreCountsOnceAndNewWithdrawalNeedsNewRequest() throws Exception {
        long id = user();
        long before = stat("admin_restore_count");
        try {
            users.withdraw(id);
            users.requestRestore(id);
            assertThat(
                concurrently(2, () -> new TransactionTemplate(transactionManager).execute(s -> users.restore(id)))
            )
                .containsExactlyInAnyOrder(true, false);
            assertThat(stat("admin_restore_count")).isEqualTo(before + 1);
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from user_withdrawal_history where user_id=? and restored_at is not null",
                    Long.class,
                    id
                )
            ).isEqualTo(1);
            users.withdraw(id);
            assertThat(users.restore(id)).isFalse();
            users.requestRestore(id);
            assertThat(users.restore(id)).isTrue();
            assertThat(stat("admin_restore_count")).isEqualTo(before + 2);
            assertThat(
                jdbc.queryForObject("select count(*) from user_withdrawal_history where user_id=?", Long.class, id)
            ).isEqualTo(2);
        } finally {
            jdbc.update("delete from \"user\" where id=?", id);
            jdbc.update(
                "update user_retention_monthly_stat set admin_restore_count=? where month=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date",
                before
            );
        }
    }

    @Test
    void expiredRestoreCannotWinAgainstPurgeAndPurgeIsNotCountedTwice() throws Exception {
        long id = user();
        long before = stat("purged_count");
        try {
            jdbc.update(
                "update \"user\" set deleted_at=(now() AT TIME ZONE 'Asia/Seoul')-interval '31 days',restore_requested_at=now() AT TIME ZONE 'Asia/Seoul' where id=?",
                id
            );
            concurrently(
                List.of(
                    () -> users.restore(id) ? 1 : 0,
                    () -> jdbc.update(
                        "delete from \"user\" where id=? and deleted_at<=(now() AT TIME ZONE 'Asia/Seoul')-interval '30 days'",
                        id
                    )
                )
            );
            assertThat(users.restore(id)).isFalse();
            jdbc.update("delete from \"user\" where id=? and deleted_at is not null", id);
            assertThat(stat("purged_count")).isEqualTo(before + 1);
            assertThat(
                jdbc.queryForObject("select count(*) from user_withdrawal_history where user_id=?", Long.class, id)
            ).isZero();
        } finally {
            jdbc.update("delete from \"user\" where id=?", id);
            jdbc.update(
                "update user_retention_monthly_stat set purged_count=? where month=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date",
                before
            );
        }
    }

    @Test
    void concurrentViewUpdatesAreNotLost() throws Exception {
        var n = notices.save(null, "동시 조회", "본문", NoticeStatus.PUBLISHED, false, null, List.of());
        try {
            concurrently(10, () -> {
                notices.view(n.id());
                return true;
            });
            assertThat(notices.find(n.id(), true).viewCount()).isEqualTo(10);
        } finally {
            notices.save(n.id(), "동시 조회", "본문", NoticeStatus.PRIVATE, false, null, List.of());
            notices.delete(n.id());
        }
    }

    @Test
    void enabledBannerCannotBeNullAtDatabaseBoundary() {
        assertThatThrownBy(
            () -> jdbc.update(
                "insert into notice(id,title,content,banner_enabled,banner_text,created_at,updated_at) values(?,'제목','본문',true,null,now(),now())",
                UUID.randomUUID()
            )
        )
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    private long user() {
        return jdbc.queryForObject(
            "insert into \"user\"(oauth_provider,oauth_provider_id,email) values('GOOGLE',?,'consistency@example.com') returning id",
            Long.class,
            UUID.randomUUID().toString()
        );
    }

    private long stat(String column) {
        return jdbc.queryForObject(
            "select " + column
                + " from user_retention_monthly_stat where month=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date",
            Long.class
        );
    }

    private static <T> List<T> concurrently(int count, Callable<T> action) throws Exception {
        return concurrently(java.util.Collections.nCopies(count, action));
    }

    private static <T> List<T> concurrently(List<Callable<T>> actions) throws Exception {
        int count = actions.size();
        var ready = new CountDownLatch(count);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = actions.stream().map(action -> executor.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("동시 실행 시작 대기 시간 초과");
                }
                return action.call();
            })).toList();
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            var results = new java.util.ArrayList<T>();
            for (var future : futures) {
                results.add(future.get(10, TimeUnit.SECONDS));
            }
            return results;
        }
    }
}
