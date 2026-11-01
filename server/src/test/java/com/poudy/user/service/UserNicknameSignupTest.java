package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.image.service.ImageUploadService;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.NicknameCombination;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.domain.UserStatus;
import com.poudy.user.ratelimit.ProfileUpdateRateLimiter;
import com.poudy.user.repository.NicknameSequenceRepository;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.OptionalInt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

@DisplayName("가입 닉네임 생성")
class UserNicknameSignupTest {

    private static final OAuthAccount ACCOUNT = new OAuthAccount(OAuthProvider.KAKAO, "1", "user@example.com", true);

    private final UserRepository userRepository = mock(UserRepository.class);
    private final NicknameSequenceRepository sequenceRepository = mock(NicknameSequenceRepository.class);
    private final UserService service = new UserService(
        userRepository,
        sequenceRepository,
        mock(PendingImageRepository.class),
        mock(S3ImageRepository.class),
        mock(ImageUploadService.class),
        mock(ProfileUpdateRateLimiter.class),
        mock(ApplicationEventPublisher.class),
        Clock.systemUTC(),
        Duration.ofDays(30)
    );

    @Test
    @DisplayName("회원이 직접 정한 닉네임과 겹치면 같은 조합의 다음 순번으로 다시 저장한다")
    void retriesWithNextNumberWhenNicknameIsTaken() {
        given(userRepository.findByEmail("user@example.com")).willReturn(Optional.empty());
        given(sequenceRepository.next(any(NicknameCombination.class)))
            .willReturn(OptionalInt.of(1_000), OptionalInt.of(1_001));
        given(userRepository.save(any(UserSignup.class), argThat(nickname -> nickname.endsWith(" 1000"))))
            .willReturn(Optional.empty());
        given(userRepository.save(any(UserSignup.class), argThat(nickname -> nickname.endsWith(" 1001"))))
            .willReturn(Optional.of(user()));

        assertThat(service.signUp(ACCOUNT)).isEqualTo(7L);
        verify(sequenceRepository, times(2)).next(any(NicknameCombination.class));
    }

    @Test
    @DisplayName("순번을 다 쓴 조합이면 다른 조합을 뽑아 순번을 받는다")
    void picksAnotherCombinationWhenFull() {
        given(userRepository.findByEmail("user@example.com")).willReturn(Optional.empty());
        given(sequenceRepository.next(any(NicknameCombination.class)))
            .willReturn(OptionalInt.empty(), OptionalInt.of(1_000));
        given(userRepository.save(any(UserSignup.class), argThat(nickname -> nickname.endsWith(" 1000"))))
            .willReturn(Optional.of(user()));

        assertThat(service.signUp(ACCOUNT)).isEqualTo(7L);
        verify(sequenceRepository, times(2)).next(any(NicknameCombination.class));
    }

    @Test
    @DisplayName("정해진 횟수 안에 닉네임을 만들지 못하면 가입을 실패시킨다")
    void failsAfterMaxAttempts() {
        given(userRepository.findByEmail("user@example.com")).willReturn(Optional.empty());
        given(sequenceRepository.next(any(NicknameCombination.class))).willReturn(OptionalInt.empty());

        assertThatThrownBy(() -> service.signUp(ACCOUNT)).isInstanceOf(InfrastructureException.class);
        verify(sequenceRepository, times(10)).next(any(NicknameCombination.class));
    }

    private static User user() {
        return new User(
            7L,
            OAuthProvider.KAKAO,
            "user@example.com",
            "포근한 다람쥐 1001",
            null,
            null,
            null,
            null,
            null,
            UserStatus.ACTIVE
        );
    }
}
