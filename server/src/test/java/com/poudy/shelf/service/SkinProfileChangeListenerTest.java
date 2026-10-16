package com.poudy.shelf.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.anyLong;

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
import java.util.Map;
import java.util.UUID;
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

    private long userId;

    @BeforeEach
    void setUp() {
        String identity = UUID.randomUUID().toString();
        userId = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, identity, identity + "@example.com", true))
        ).id();
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

        userService.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, null, null);
        assertThat(analysisRepository.find(userId).newByIngredientId()).isEqualTo(firstResult);

        userService.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, null, false);
        assertThat(analysisRepository.find(userId).newByIngredientId())
            .containsOnlyKeys(firstResult.keySet())
            .allSatisfy((id, isNew) -> assertThat(isNew).isFalse());
    }

    @Test
    @DisplayName("선반 성분 분석을 다시 계산하지 못해도 피부 정보 저장은 유지하고 오류 로그를 남긴다")
    void keepsSkinProfileWhenRefreshFails(CapturedOutput output) {
        willThrow(new IllegalStateException("주의 성분군 누락")).given(shelfService).refreshAnalysisForSkinChange(anyLong());

        userService.updateProfile(userId, null, null, SkinType.DRY, true);

        assertThat(userService.findById(userId).skinType()).isEqualTo(SkinType.DRY);
        assertThat(userService.findById(userId).sensitiveSkin()).isTrue();
        assertThat(output).contains("shelf analysis refresh failed: userId=" + userId);
    }
}
