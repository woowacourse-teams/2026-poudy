package com.poudy.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.skintype.domain.SkinType;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원")
class UserTest {

    @Test
    @DisplayName("탈퇴하지 않은 회원은 로그인한다")
    void signsInActiveUser() {
        SocialLoginResult result = userOf(UserStatus.ACTIVE).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.SIGNED_IN);
        assertThat(result.userId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("탈퇴한 회원은 로그인하지 않고 탈퇴 회원임을 알린다")
    void reportsWithdrawnUser() {
        SocialLoginResult result = userOf(UserStatus.WITHDRAWN).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.WITHDRAWN);
        assertThat(result.userId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원은 로그인하지 않고 복구 요청 중임을 알린다")
    void reportsRestoreRequestedUser() {
        SocialLoginResult result = userOf(UserStatus.RESTORE_REQUESTED).loginResult();

        assertThat(result.status()).isEqualTo(LoginStatus.RESTORE_REQUESTED);
        assertThat(result.userId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("피부 타입과 민감성 피부 여부가 모두 같아야 같은 피부이고, 성별·나이대는 보지 않는다")
    void comparesSkinOnly() {
        User dry = profileOf(Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, false);

        assertThat(dry.hasSameSkinAs(profileOf(Gender.MALE, AgeRange.THIRTIES, SkinType.DRY, false))).isTrue();
        assertThat(dry.hasSameSkinAs(profileOf(Gender.FEMALE, AgeRange.TWENTIES, SkinType.OILY, false))).isFalse();
        assertThat(dry.hasSameSkinAs(profileOf(Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, true))).isFalse();
        assertThat(dry.hasSameSkinAs(profileOf(Gender.FEMALE, AgeRange.TWENTIES, null, false))).isFalse();
        assertThat(dry.hasSameSkinAs(profileOf(Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, null))).isFalse();
    }

    @Test
    @DisplayName("지금과 다른 이미지 ID를 받을 때만 이미지를 바꾼다")
    void changesProfileImageOnlyToDifferentImage() {
        UUID current = UUID.randomUUID();
        User user = withProfileImage(current);

        assertThat(user.changesProfileImageTo(UUID.randomUUID())).isTrue();
        assertThat(user.changesProfileImageTo(current)).isFalse();
        assertThat(user.changesProfileImageTo(null)).isFalse();
    }

    @Test
    @DisplayName("다른 이미지로 바꾸거나 비우면 지금 이미지를 돌려주고, 같은 이미지면 돌려주지 않는다")
    void returnsReplacedProfileImage() {
        UUID current = UUID.randomUUID();
        User user = withProfileImage(current);

        assertThat(user.profileImageReplacedBy(UUID.randomUUID())).contains(current);
        assertThat(user.profileImageReplacedBy(null)).contains(current);
        assertThat(user.profileImageReplacedBy(current)).isEmpty();
        assertThat(withProfileImage(null).profileImageReplacedBy(null)).isEmpty();
    }

    private User withProfileImage(UUID profileImageId) {
        return new User(
            1L,
            OAuthProvider.KAKAO,
            "user@example.com",
            "포근한 다람쥐 1000",
            profileImageId,
            null,
            null,
            null,
            null,
            UserStatus.ACTIVE
        );
    }

    private User profileOf(Gender gender, AgeRange ageRange, SkinType skinType, Boolean sensitiveSkin) {
        return new User(
            1L,
            OAuthProvider.KAKAO,
            "user@example.com",
            "포근한 다람쥐 1000",
            null,
            gender,
            ageRange,
            skinType,
            sensitiveSkin,
            UserStatus.ACTIVE
        );
    }

    private User userOf(UserStatus status) {
        return new User(
            1L,
            OAuthProvider.KAKAO,
            "user@example.com",
            "포근한 다람쥐 1000",
            null,
            null,
            null,
            null,
            null,
            status
        );
    }
}
