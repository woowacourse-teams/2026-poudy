package com.poudy.shelf.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.shelf.domain.RaterProfile;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfRatingHistory;
import com.poudy.shelf.domain.ShelfRatingRecord;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("선반 평가 이력 저장소")
class ShelfRatingHistoryRepositoryTest {

    private static final long PRODUCT_ID = 15;
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 20);
    private static final RaterProfile OILY_TWENTIES = new RaterProfile("FEMALE", "TWENTIES", "OILY", false);
    private static final RaterProfile DRY_THIRTIES = new RaterProfile(null, "THIRTIES", "DRY", null);
    private static final ShelfRatingRecord OILY_GOOD = new ShelfRatingRecord(
        ShelfUsageStatus.IN_USE,
        new Rating(RatingPreference.GOOD, 1.5, null),
        OILY_TWENTIES,
        TODAY
    );

    @Autowired
    private ShelfRatingHistoryRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private long userId;

    @BeforeEach
    void signUp() {
        userId = signUp("history-1");
    }

    @Test
    @DisplayName("새 기록을 평가 값·프로필·날짜와 함께 최신으로 남긴다")
    void addsCurrentRecord() {
        repository.add(userId, PRODUCT_ID, OILY_GOOD);

        assertThat(rowsOf(userId)).containsExactly(
            Map.ofEntries(
                Map.entry("product_id", PRODUCT_ID),
                Map.entry("usage_status", "IN_USE"),
                Map.entry("rating_preference", "GOOD"),
                Map.entry("rating_moisture_level", 1.5),
                Map.entry("gender", "FEMALE"),
                Map.entry("age_range", "TWENTIES"),
                Map.entry("skin_type", "OILY"),
                Map.entry("is_sensitive_skin", false),
                Map.entry("recorded_on", Date.valueOf(TODAY)),
                Map.entry("is_current", true)
            )
        );
        assertThat(repository.findCurrent(userId, PRODUCT_ID).needsRecord(OILY_GOOD)).isFalse();
    }

    @Test
    @DisplayName("평가와 프로필을 모두 선택하지 않은 기록도 같은 값으로 복원한다")
    void roundTripsUnsetValues() {
        ShelfRatingRecord record = new ShelfRatingRecord(
            ShelfUsageStatus.USED,
            new Rating(null, null, null),
            new RaterProfile(null, null, null, null),
            TODAY
        );
        repository.add(userId, PRODUCT_ID, record);

        ShelfRatingHistory restored = repository.findCurrent(userId, PRODUCT_ID);

        assertThat(restored.needsRecord(record)).isFalse();
    }

    @Test
    @DisplayName("일부 평가만 선택한 기록과 현재 enum에 없는 프로필 코드도 그대로 복원한다")
    void roundTripsHistoricalProfileAndPartialRating() {
        ShelfRatingRecord record = new ShelfRatingRecord(
            ShelfUsageStatus.USED,
            new Rating(null, null, 2.5),
            new RaterProfile(null, "PREVIOUS_RANGE", "SENSITIVE", null),
            TODAY
        );
        repository.add(userId, PRODUCT_ID, record);

        ShelfRatingHistory restored = repository.findCurrent(userId, PRODUCT_ID);

        assertThat(restored.needsRecord(record)).isFalse();
    }

    @Test
    @DisplayName("대신한 기록은 최신 표시만 끄고 남겨 두며 최신 기록만 읽는다")
    void supersedesRecords() {
        repository.add(userId, PRODUCT_ID, OILY_GOOD);
        repository.add(userId, PRODUCT_ID, recordOf(DRY_THIRTIES));
        List<Long> ids = idsOf(userId);

        repository.supersede(Set.of(ids.get(1)));

        assertThat(currentFlagsOf(userId)).containsExactly(true, false);
        assertThat(repository.findCurrent(userId, PRODUCT_ID).supersededBy(OILY_GOOD)).containsExactly(ids.get(0));
    }

    @Test
    @DisplayName("회원·제품·프로필마다 최신 기록은 하나만 둔다")
    void rejectsSecondCurrentRecordOfSameProfile() {
        repository.add(userId, PRODUCT_ID, OILY_GOOD);

        assertThatThrownBy(() -> repository.add(userId, PRODUCT_ID, OILY_GOOD))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("수분감·유분감이 0.5 단위가 아니면 저장하지 않는다")
    void rejectsInvalidLevel() {
        assertThatThrownBy(
            () -> jdbc.update(
                """
                    insert into user_shelf_product_history (
                        user_id, product_id, usage_status, rating_moisture_level, recorded_on, is_current
                    )
                    values (?, ?, 'IN_USE', 0.3, current_date, true)
                    """,
                userId,
                PRODUCT_ID
            )
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("회원 행을 지우면 회원 번호만 비우고 평가 값·프로필·최신 표시는 남긴다")
    void keepsRecordsWithoutUserAfterUserDeletion() {
        long otherUserId = signUp("history-2");
        repository.add(userId, PRODUCT_ID, OILY_GOOD);
        repository.add(otherUserId, PRODUCT_ID, OILY_GOOD);
        List<Long> ids = jdbc.queryForList(
            "select id from user_shelf_product_history where user_id in (?, ?) order by id",
            Long.class,
            userId,
            otherUserId
        );

        jdbc.update("delete from \"user\" where id in (?, ?)", userId, otherUserId);

        List<Map<String, Object>> rows = jdbc.queryForList(
            """
                select user_id, skin_type, rating_preference, is_current
                from user_shelf_product_history
                where id in (?, ?)
                """,
            ids.get(0),
            ids.get(1)
        );
        assertThat(rows).hasSize(2).allSatisfy(row -> {
            assertThat(row.get("user_id")).isNull();
            assertThat(row.get("skin_type")).isEqualTo("OILY");
            assertThat(row.get("rating_preference")).isEqualTo("GOOD");
            assertThat(row.get("is_current")).isEqualTo(true);
        });
    }

    private long signUp(String providerId) {
        return userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, providerId, providerId + "@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
    }

    private static ShelfRatingRecord recordOf(RaterProfile profile) {
        return new ShelfRatingRecord(ShelfUsageStatus.USED, new Rating(null, null, null), profile, TODAY);
    }

    private List<Map<String, Object>> rowsOf(long userId) {
        return jdbc.queryForList(
            """
                select product_id, usage_status, rating_preference, rating_moisture_level,
                       gender, age_range, skin_type, is_sensitive_skin, recorded_on, is_current
                from user_shelf_product_history
                where user_id = ?
                order by id
                """,
            userId
        );
    }

    private List<Long> idsOf(long userId) {
        return jdbc.queryForList(
            "select id from user_shelf_product_history where user_id = ? order by id",
            Long.class,
            userId
        );
    }

    private List<Boolean> currentFlagsOf(long userId) {
        return jdbc.queryForList(
            "select is_current from user_shelf_product_history where user_id = ? order by id",
            Boolean.class,
            userId
        );
    }
}
