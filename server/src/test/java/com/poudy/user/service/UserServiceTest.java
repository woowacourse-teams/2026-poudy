package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.RegisteredAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.UnverifiedOAuthEmailException;
import com.poudy.security.domain.WithdrawnAccount;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.SkinProfileChanged;
import com.poudy.user.domain.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@RecordApplicationEvents
@DisplayName("회원 서비스")
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private ApplicationEvents events;

    @Test
    @DisplayName("처음 로그인하면 가입시키지 않고 가입할 계정임만 알린다")
    void doesNotRegisterOnFirstSignIn() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "new@example.com", true);

        assertThat(userService.login(account)).isEmpty();
        assertThat(userService.login(account)).isEmpty();
    }

    @Test
    @DisplayName("가입하면 인증된 이메일을 소문자로 저장한다")
    void registersNewUser() {
        User user = userService.findById(
            userService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "New@Example.com", true))
        );

        assertThat(user.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(user.email()).isEqualTo("new@example.com");
    }

    @Test
    @DisplayName("이미 가입한 회원은 이메일 상태와 관계없이 같은 회원으로 로그인한다")
    void signsInRegisteredUser() {
        long registered = userService
            .signUp(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "user@example.com", true));

        SocialLoginResult result = userService
            .login(new OAuthAccount(OAuthProvider.GOOGLE, "sub", null, false))
            .orElseThrow();

        assertThat(result.userId()).isEqualTo(registered);
        assertThat(result.status()).isEqualTo(LoginStatus.SIGNED_IN);
    }

    @Test
    @DisplayName("인증되지 않은 이메일이면 처음 로그인할 때부터 거절하고 가입시키지 않는다")
    void rejectsUnverifiedEmail() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", false);

        assertThatThrownBy(() -> userService.login(account)).isInstanceOf(UnverifiedOAuthEmailException.class);
        assertThatThrownBy(() -> userService.signUp(account)).isInstanceOf(UnverifiedOAuthEmailException.class);
    }

    @Test
    @DisplayName("다른 제공자로 가입한 이메일이면 처음 로그인할 때부터 거절하고 그 제공자를 알린다")
    void rejectsEmailRegisteredWithAnotherProvider() {
        userService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true));
        OAuthAccount google = new OAuthAccount(OAuthProvider.GOOGLE, "sub", "User@example.com", true);

        assertThatThrownBy(() -> userService.login(google))
            .isInstanceOfSatisfying(
                EmailAlreadyRegisteredException.class,
                exception -> assertThat(exception.registeredAccount())
                    .isEqualTo(new RegisteredAccount(OAuthProvider.KAKAO, "user@example.com"))
            );
        assertThatThrownBy(() -> userService.signUp(google))
            .isInstanceOf(EmailAlreadyRegisteredException.class);
    }

    @Test
    @DisplayName("없는 회원은 찾지 못한다")
    void failsToFindMissingUser() {
        assertThatThrownBy(() -> userService.findById(Long.MAX_VALUE))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("없는 회원의 초기 정보는 저장하지 못한다")
    void failsToUpdateMissingUserProfile() {
        assertThatThrownBy(
            () -> userService.updateProfile(Long.MAX_VALUE, Gender.FEMALE, AgeRange.TEENS, SkinType.DRY, false)
        ).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("피부 타입이나 민감성이 실제로 바뀔 때만 피부 정보 변경을 알린다")
    void publishesSkinProfileChangedOnlyWhenSkinChanges() {
        long userId = userService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true));

        userService.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, null, null);
        assertThat(events.stream(SkinProfileChanged.class)).isEmpty();

        userService.updateProfile(userId, Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, null);
        userService.updateProfile(userId, Gender.MALE, AgeRange.THIRTIES, SkinType.DRY, null);
        userService.updateProfile(userId, Gender.MALE, AgeRange.THIRTIES, SkinType.DRY, true);
        userService.updateProfile(userId, Gender.MALE, AgeRange.THIRTIES, SkinType.DRY, true);

        assertThat(events.stream(SkinProfileChanged.class)).containsExactly(
            new SkinProfileChanged(userId),
            new SkinProfileChanged(userId)
        );
    }

    @Test
    @DisplayName("탈퇴하면 회원을 지우고, 없는 회원은 탈퇴시키지 못한다")
    void withdrawsUser() {
        long userId = userService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true));

        userService.withdraw(userId);

        assertThatThrownBy(() -> userService.findById(userId)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> userService.withdraw(userId)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("탈퇴 회원은 탈퇴 시각에 보관 기간을 더한 시각까지 복구를 요청할 수 있다고 알리고, 활성 회원은 찾지 못한다")
    void findsWithdrawnAccount() {
        long userId = userService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true));

        assertThatThrownBy(() -> userService.findWithdrawn(userId)).isInstanceOf(ResourceNotFoundException.class);
        userService.withdraw(userId);

        WithdrawnAccount account = userService.findWithdrawn(userId);
        assertThat(account.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(account.email()).isEqualTo("user@example.com");
        assertThat(account.restorableUntil()).isEqualTo(account.withdrawnAt().plusDays(30));
    }

    @Test
    @DisplayName("탈퇴한 계정으로 다시 로그인하면 로그인시키지 않고 탈퇴 회원임을 알린다")
    void reportsWithdrawnUserOnSignIn() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true);
        long userId = userService.signUp(account);
        userService.withdraw(userId);

        SocialLoginResult result = userService.login(account).orElseThrow();

        assertThat(result.status()).isEqualTo(LoginStatus.WITHDRAWN);
        assertThat(result.userId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 계정으로 다시 로그인하면 복구 요청 중임을 알린다")
    void reportsRestoreRequestedUserOnSignIn() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true);
        long userId = userService.signUp(account);
        userService.withdraw(userId);
        userService.requestRestore(userId);

        SocialLoginResult result = userService.login(account).orElseThrow();

        assertThat(result.status()).isEqualTo(LoginStatus.RESTORE_REQUESTED);
        assertThat(result.userId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("탈퇴한 회원은 복구를 요청할 수 있고, 탈퇴하지 않은 회원은 요청할 수 없다")
    void requestsRestore() {
        long userId = userService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true));

        assertThatThrownBy(() -> userService.requestRestore(userId)).isInstanceOf(ResourceNotFoundException.class);
        userService.withdraw(userId);
        userService.requestRestore(userId);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원만 복구하고, 복구하면 다시 로그인한다")
    void restoresOnlyRestoreRequestedUser() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true);
        long userId = userService.signUp(account);

        assertThatThrownBy(() -> userService.restore(userId)).isInstanceOf(ResourceNotFoundException.class);
        userService.withdraw(userId);
        assertThatThrownBy(() -> userService.restore(userId)).isInstanceOf(ResourceNotFoundException.class);
        userService.requestRestore(userId);
        userService.restore(userId);

        SocialLoginResult result = userService.login(account).orElseThrow();
        assertThat(result.status()).isEqualTo(LoginStatus.SIGNED_IN);
        assertThat(result.userId()).isEqualTo(userId);
    }
}
