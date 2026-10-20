package com.poudy.shelf.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;

import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfProductAlreadyExistsException;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.repository.ShelfProductRepository;
import com.poudy.shelf.repository.ShelfRatingHistoryRepository;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

// 기록 실패가 선반 저장까지 되돌리는지 보려고 서비스 트랜잭션을 테스트 트랜잭션으로 감싸지 않는다.
@SpringBootTest
@DisplayName("선반 평가 이력 기록")
class ShelfRatingHistoryServiceTest {

    private static final long PRODUCT_ID = 15;
    private static final Rating GOOD = new Rating(RatingPreference.GOOD, 1.5, 2.0);
    private static final Rating BAD = new Rating(RatingPreference.BAD, 1.5, 2.0);

    @Autowired
    private ShelfService shelfService;

    @Autowired
    private ShelfProductRepository shelfProductRepository;

    @MockitoSpyBean
    private ShelfRatingHistoryRepository historyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private long userId;

    @BeforeEach
    void signUp() {
        userId = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "history-service", "history@example.com", true))
        ).id();
        userRepository.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, SkinType.OILY, false);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from user_shelf_product_history where user_id = ?", userId);
        jdbc.update("delete from \"user\" where id = ?", userId);
    }

    @Test
    @DisplayName("담기와 수정을 평가한 순간의 프로필·날짜와 함께 남기고 같은 프로필의 이전 기록은 최신 표시를 끈다")
    void recordsAddAndUpdate() {
        shelfService.add(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, GOOD);
        shelfService.update(userId, PRODUCT_ID, ShelfUsageStatus.USED, BAD);

        List<Map<String, Object>> rows = rows();
        assertThat(rows).extracting(row -> row.get("usage_status"), row -> row.get("rating_preference"))
            .containsExactly(
                tuple("IN_USE", "GOOD"),
                tuple("USED", "BAD")
            );
        assertThat(rows).extracting(row -> row.get("is_current")).containsExactly(false, true);
        assertThat(rows).allSatisfy(row -> {
            assertThat(row.get("gender")).isEqualTo("FEMALE");
            assertThat(row.get("age_range")).isEqualTo("TWENTIES");
            assertThat(row.get("skin_type")).isEqualTo("OILY");
            assertThat(row.get("is_sensitive_skin")).isEqualTo(false);
            assertThat(row.get("recorded_on")).isEqualTo(Date.valueOf(LocalDate.now(ZoneId.of("Asia/Seoul"))));
        });
    }

    @Test
    @DisplayName("같은 값으로 고치거나 선반에서 빼면 남기지 않고 이전 기록도 지우지 않는다")
    void skipsSameValuesAndRemoval() {
        shelfService.add(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, GOOD);
        shelfService.update(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, GOOD);
        shelfService.remove(userId, PRODUCT_ID);

        assertThat(rows()).singleElement().satisfies(row -> {
            assertThat(row.get("rating_preference")).isEqualTo("GOOD");
            assertThat(row.get("is_current")).isEqualTo(true);
        });
    }

    @Test
    @DisplayName("프로필만 바꾸면 남기지 않고, 30일 안에 다른 프로필로 다시 평가하면 마지막 평가를 고친 것으로 본다")
    void keepsProfileOfEarlierRecord() {
        shelfService.add(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, GOOD);
        userRepository.updateProfile(userId, Gender.FEMALE, AgeRange.THIRTIES, SkinType.DRY, true);

        assertThat(rows()).singleElement().satisfies(row -> assertThat(row.get("skin_type")).isEqualTo("OILY"));

        shelfService.update(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, BAD);

        List<Map<String, Object>> rows = rows();
        assertThat(rows).extracting(row -> row.get("skin_type")).containsExactly("OILY", "DRY");
        assertThat(rows).extracting(row -> row.get("is_current")).containsExactly(false, true);
    }

    @Test
    @DisplayName("이미 담은 제품을 다시 담거나 선반에 없는 제품을 고치면 남기지 않는다")
    void skipsRejectedRequests() {
        shelfService.add(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, GOOD);

        assertThatThrownBy(() -> shelfService.add(userId, PRODUCT_ID, ShelfUsageStatus.USED, BAD))
            .isInstanceOf(ShelfProductAlreadyExistsException.class);
        assertThatThrownBy(() -> shelfService.update(userId, 1, ShelfUsageStatus.USED, BAD))
            .isInstanceOf(ResourceNotFoundException.class);

        assertThat(rows()).singleElement().satisfies(row -> assertThat(row.get("product_id")).isEqualTo(PRODUCT_ID));
    }

    @Test
    @DisplayName("이력을 남기지 못하면 선반 평가도 저장하지 않는다")
    void rollsBackShelfWhenRecordFails() {
        doThrow(new DataAccessResourceFailureException("기록 실패")).when(historyRepository)
            .add(anyLong(), anyLong(), any());

        assertThatThrownBy(() -> shelfService.add(userId, PRODUCT_ID, ShelfUsageStatus.IN_USE, GOOD))
            .isInstanceOf(DataAccessResourceFailureException.class);

        assertThat(shelfProductRepository.find(userId, PRODUCT_ID)).isEmpty();
        assertThat(rows()).isEmpty();
    }

    private List<Map<String, Object>> rows() {
        return jdbc.queryForList(
            """
                select product_id, usage_status, rating_preference, gender, age_range, skin_type,
                       is_sensitive_skin, recorded_on, is_current
                from user_shelf_product_history
                where user_id = ?
                order by id
                """,
            userId
        );
    }
}
