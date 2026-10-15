package com.poudy.user.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.WithdrawnAccount;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("회원 저장소")
class UserRepositoryTest {

    @Autowired
    private UserRepository repository;

    @Autowired
    private NamedParameterJdbcTemplate jdbc;

    @Test
    @DisplayName("저장한 회원을 ID, 제공자 식별자, 이메일로 다시 읽는다")
    void findsSavedUser() {
        User saved = repository.save(signup(OAuthProvider.KAKAO, "4321", "user@example.com"));

        assertThat(saved.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(saved.email()).isEqualTo("user@example.com");
        assertThat(repository.findById(saved.id())).get().extracting(User::id).isEqualTo(saved.id());
        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "4321", "user@example.com"))).get()
            .extracting(User::id)
            .isEqualTo(saved.id());
        assertThat(repository.findByEmail("user@example.com")).get().extracting(User::id)
            .isEqualTo(saved.id());
    }

    @Test
    @DisplayName("존재하고 탈퇴하지 않은 회원만 활성 상태다")
    void checksActiveUser() {
        User saved = repository.save(signup(OAuthProvider.KAKAO, "active", "active@example.com"));

        assertThat(repository.isActive(saved.id())).isTrue();
        assertThat(repository.isActive(Long.MAX_VALUE)).isFalse();
        repository.withdraw(saved.id());
        assertThat(repository.isActive(saved.id())).isFalse();
        repository.requestRestore(saved.id());
        assertThat(repository.isActive(saved.id())).isFalse();
        repository.restore(saved.id());
        assertThat(repository.isActive(saved.id())).isTrue();
    }

    @Test
    @DisplayName("다른 제공자의 같은 식별자는 다른 회원이다")
    void separatesIdentifiersByProvider() {
        repository.save(signup(OAuthProvider.KAKAO, "1234", "kakao@example.com"));

        assertThat(repository.findByAccount(account(OAuthProvider.GOOGLE, "1234", "kakao@example.com"))).isEmpty();
    }

    @Test
    @DisplayName("같은 이메일로 두 번 저장하지 않는다")
    void rejectsDuplicateEmail() {
        repository.save(signup(OAuthProvider.KAKAO, "1", "user@example.com"));

        assertThatThrownBy(() -> repository.save(signup(OAuthProvider.GOOGLE, "2", "user@example.com")))
            .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    @DisplayName("초기 정보를 저장하고 바뀐 회원을 돌려준다")
    void updatesProfile() {
        User saved = repository.save(signup(OAuthProvider.GOOGLE, "sub", "user@example.com"));

        User updated = repository
            .updateProfile(saved.id(), Gender.MALE, AgeRange.SIXTIES_OR_OLDER, SkinType.COMBINATION)
            .orElseThrow();

        assertThat(updated.gender()).isEqualTo(Gender.MALE);
        assertThat(updated.ageRange()).isEqualTo(AgeRange.SIXTIES_OR_OLDER);
        assertThat(updated.skinType()).isEqualTo(SkinType.COMBINATION);
        assertThat(repository.findById(saved.id())).get().extracting(User::skinType)
            .isEqualTo(SkinType.COMBINATION);
    }

    @Test
    @DisplayName("없는 회원의 초기 정보는 저장하지 않는다")
    void skipsMissingUserProfile() {
        assertThat(repository.updateProfile(Long.MAX_VALUE, Gender.FEMALE, AgeRange.TEENS, SkinType.DRY))
            .isEmpty();
    }

    @Test
    @DisplayName("탈퇴하면 행은 남기되 회원 조회에서 빠지고, 계정으로는 탈퇴 회원을 찾는다")
    void withdrawsUserSoftly() {
        User saved = repository.save(signup(OAuthProvider.KAKAO, "4321", "user@example.com"));

        assertThat(repository.withdraw(saved.id())).isTrue();

        assertThat(repository.findById(saved.id())).isEmpty();
        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "4321", "user@example.com")))
            .get().extracting(user -> user.loginResult().status()).isEqualTo(LoginStatus.WITHDRAWN);
        assertThat(repository.withdraw(saved.id())).isFalse();
    }

    @Test
    @DisplayName("탈퇴한 회원만 제공자, 이메일, 탈퇴 시각을 찾는다")
    void findsOnlyWithdrawnUser() {
        User saved = repository.save(signup(OAuthProvider.KAKAO, "4321", "user@example.com"));

        assertThat(repository.findWithdrawnById(saved.id())).isEmpty();
        repository.withdraw(saved.id());

        WithdrawnAccount withdrawn = repository.findWithdrawnById(saved.id()).orElseThrow().keptFor(Duration.ZERO);
        assertThat(withdrawn.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(withdrawn.email()).isEqualTo("user@example.com");
        assertThat(withdrawn.withdrawnAt()).isCloseTo(OffsetDateTime.now(), within(1, ChronoUnit.MINUTES));
    }

    @Test
    @DisplayName("피부 타입은 skin_type 에 있는 코드만 저장한다")
    void rejectsUnknownSkinType() {
        User saved = repository.save(signup(OAuthProvider.KAKAO, "4321", "user@example.com"));

        assertThatThrownBy(
            () -> jdbc.update(
                "update \"user\" set skin_type = 'UNKNOWN' where id = :id",
                new MapSqlParameterSource("id", saved.id())
            )
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("탈퇴한 회원만 복구를 요청할 수 있다")
    void requestsRestoreOnlyForWithdrawnUser() {
        User saved = repository.save(signup(OAuthProvider.GOOGLE, "sub", "user@example.com"));

        assertThat(repository.requestRestore(saved.id())).isFalse();
        repository.withdraw(saved.id());
        assertThat(repository.requestRestore(saved.id())).isTrue();
        assertThat(repository.requestRestore(saved.id())).isTrue();
        assertThat(repository.findByAccount(account(OAuthProvider.GOOGLE, "sub", "user@example.com")))
            .get().extracting(user -> user.loginResult().status()).isEqualTo(LoginStatus.RESTORE_REQUESTED);
    }

    @Test
    @DisplayName("기준 시각 이전에 탈퇴한 회원만 지운다")
    void deletesOnlyUsersWithdrawnBeforeCutoff() {
        User active = repository.save(signup(OAuthProvider.KAKAO, "1", "active@example.com"));
        User expired = repository.save(signup(OAuthProvider.KAKAO, "2", "expired@example.com"));
        User recent = repository.save(signup(OAuthProvider.KAKAO, "3", "recent@example.com"));
        repository.withdraw(expired.id());
        repository.withdraw(recent.id());
        jdbc.update(
            "update \"user\" set deleted_at = deleted_at - interval '31 days' where id = :id",
            new MapSqlParameterSource("id", expired.id())
        );

        assertThat(repository.deleteWithdrawnBefore(OffsetDateTime.now().minusDays(30))).isEqualTo(1);

        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "2", "expired@example.com"))).isEmpty();
        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "3", "recent@example.com"))).isPresent();
        assertThat(repository.findById(active.id())).isPresent();
    }

    private UserSignup signup(OAuthProvider provider, String providerId, String email) {
        return UserSignup.from(account(provider, providerId, email));
    }

    private OAuthAccount account(OAuthProvider provider, String providerId, String email) {
        return new OAuthAccount(provider, providerId, email, true);
    }
}
