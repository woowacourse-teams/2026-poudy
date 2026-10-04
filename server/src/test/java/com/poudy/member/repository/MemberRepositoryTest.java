package com.poudy.member.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SignInStatus;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("회원 저장소")
class MemberRepositoryTest {

    @Autowired
    private MemberRepository repository;

    @Autowired
    private NamedParameterJdbcTemplate jdbc;

    @Test
    @DisplayName("저장한 회원을 ID, 제공자 식별자, 이메일로 다시 읽는다")
    void findsSavedMember() {
        Member saved = repository.save(signup(OAuthProvider.KAKAO, "4321", "member@example.com"));

        assertThat(saved.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(saved.email()).isEqualTo("member@example.com");
        assertThat(saved.isProfileCompleted()).isFalse();
        assertThat(repository.findById(saved.id())).get().extracting(Member::id).isEqualTo(saved.id());
        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "4321", "member@example.com"))).get()
            .extracting(Member::id)
            .isEqualTo(saved.id());
        assertThat(repository.findByEmail("member@example.com")).get().extracting(Member::id)
            .isEqualTo(saved.id());
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
        repository.save(signup(OAuthProvider.KAKAO, "1", "member@example.com"));

        assertThatThrownBy(() -> repository.save(signup(OAuthProvider.GOOGLE, "2", "member@example.com")))
            .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    @DisplayName("초기 정보를 저장하고 바뀐 회원을 돌려준다")
    void updatesProfile() {
        Member saved = repository.save(signup(OAuthProvider.GOOGLE, "sub", "member@example.com"));

        Member updated = repository
            .updateProfile(saved.id(), Gender.MALE, AgeRange.SIXTIES_OR_OLDER, MemberSkinType.UNKNOWN)
            .orElseThrow();

        assertThat(updated.gender()).isEqualTo(Gender.MALE);
        assertThat(updated.ageRange()).isEqualTo(AgeRange.SIXTIES_OR_OLDER);
        assertThat(updated.skinType()).isEqualTo(MemberSkinType.UNKNOWN);
        assertThat(repository.findById(saved.id())).get().extracting(Member::isProfileCompleted).isEqualTo(true);
    }

    @Test
    @DisplayName("없는 회원의 초기 정보는 저장하지 않는다")
    void skipsMissingMemberProfile() {
        assertThat(repository.updateProfile(Long.MAX_VALUE, Gender.FEMALE, AgeRange.TEENS, MemberSkinType.DRY))
            .isEmpty();
    }

    @Test
    @DisplayName("탈퇴하면 행은 남기되 회원 조회에서 빠지고, 계정으로는 탈퇴 회원을 찾는다")
    void withdrawsMemberSoftly() {
        Member saved = repository.save(signup(OAuthProvider.KAKAO, "4321", "member@example.com"));

        assertThat(repository.withdraw(saved.id())).isTrue();

        assertThat(repository.findById(saved.id())).isEmpty();
        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "4321", "member@example.com")))
            .get().extracting(member -> member.signInResult().status()).isEqualTo(SignInStatus.WITHDRAWN);
        assertThat(repository.withdraw(saved.id())).isFalse();
    }

    @Test
    @DisplayName("탈퇴한 회원만 복구를 요청할 수 있다")
    void requestsRestoreOnlyForWithdrawnMember() {
        Member saved = repository.save(signup(OAuthProvider.GOOGLE, "sub", "member@example.com"));

        assertThat(repository.requestRestore(saved.id())).isFalse();
        repository.withdraw(saved.id());
        assertThat(repository.requestRestore(saved.id())).isTrue();
        assertThat(repository.requestRestore(saved.id())).isTrue();
        assertThat(repository.findByAccount(account(OAuthProvider.GOOGLE, "sub", "member@example.com")))
            .get().extracting(member -> member.signInResult().status()).isEqualTo(SignInStatus.RESTORE_REQUESTED);
    }

    @Test
    @DisplayName("기준 시각 이전에 탈퇴한 회원만 지운다")
    void deletesOnlyMembersWithdrawnBeforeCutoff() {
        Member active = repository.save(signup(OAuthProvider.KAKAO, "1", "active@example.com"));
        Member expired = repository.save(signup(OAuthProvider.KAKAO, "2", "expired@example.com"));
        Member recent = repository.save(signup(OAuthProvider.KAKAO, "3", "recent@example.com"));
        repository.withdraw(expired.id());
        repository.withdraw(recent.id());
        jdbc.update(
            "update member set deleted_at = deleted_at - interval '31 days' where id = :id",
            new MapSqlParameterSource("id", expired.id())
        );

        assertThat(repository.deleteWithdrawnBefore(OffsetDateTime.now().minusDays(30))).isEqualTo(1);

        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "2", "expired@example.com"))).isEmpty();
        assertThat(repository.findByAccount(account(OAuthProvider.KAKAO, "3", "recent@example.com"))).isPresent();
        assertThat(repository.findById(active.id())).isPresent();
    }

    private MemberSignup signup(OAuthProvider provider, String providerId, String email) {
        return MemberSignup.from(account(provider, providerId, email));
    }

    private OAuthAccount account(OAuthProvider provider, String providerId, String email) {
        return new OAuthAccount(provider, providerId, email, true);
    }
}
