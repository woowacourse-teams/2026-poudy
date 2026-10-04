package com.poudy.member.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("회원 저장소")
class MemberRepositoryTest {

    @Autowired
    private MemberRepository repository;

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

    private MemberSignup signup(OAuthProvider provider, String providerId, String email) {
        return MemberSignup.from(account(provider, providerId, email));
    }

    private OAuthAccount account(OAuthProvider provider, String providerId, String email) {
        return new OAuthAccount(provider, providerId, email, true);
    }
}
