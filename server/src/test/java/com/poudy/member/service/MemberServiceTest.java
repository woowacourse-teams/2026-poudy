package com.poudy.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ResourceNotFoundException;
import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SignInStatus;
import com.poudy.security.domain.SocialSignInResult;
import com.poudy.security.domain.UnverifiedOAuthEmailException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("회원 서비스")
class MemberServiceTest {

    @Autowired
    private MemberService memberService;

    @Test
    @DisplayName("처음 로그인하면 가입시키지 않고 가입할 계정임만 알린다")
    void doesNotRegisterOnFirstSignIn() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "new@example.com", true);

        assertThat(memberService.signIn(account)).isEmpty();
        assertThat(memberService.signIn(account)).isEmpty();
    }

    @Test
    @DisplayName("가입하면 인증된 이메일을 소문자로 저장한다")
    void registersNewMember() {
        Member member = memberService.findById(
            memberService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "New@Example.com", true))
        );

        assertThat(member.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(member.email()).isEqualTo("new@example.com");
    }

    @Test
    @DisplayName("이미 가입한 회원은 이메일 상태와 관계없이 같은 회원으로 로그인한다")
    void signsInRegisteredMember() {
        long registered = memberService
            .signUp(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@example.com", true));

        SocialSignInResult result = memberService
            .signIn(new OAuthAccount(OAuthProvider.GOOGLE, "sub", null, false))
            .orElseThrow();

        assertThat(result.memberId()).isEqualTo(registered);
        assertThat(result.status()).isEqualTo(SignInStatus.SIGNED_IN);
    }

    @Test
    @DisplayName("인증되지 않은 이메일이면 처음 로그인할 때부터 거절하고 가입시키지 않는다")
    void rejectsUnverifiedEmail() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", false);

        assertThatThrownBy(() -> memberService.signIn(account)).isInstanceOf(UnverifiedOAuthEmailException.class);
        assertThatThrownBy(() -> memberService.signUp(account)).isInstanceOf(UnverifiedOAuthEmailException.class);
    }

    @Test
    @DisplayName("다른 제공자로 가입한 이메일이면 처음 로그인할 때부터 거절하고 그 제공자를 알린다")
    void rejectsEmailRegisteredWithAnotherProvider() {
        memberService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true));
        OAuthAccount google = new OAuthAccount(OAuthProvider.GOOGLE, "sub", "Member@example.com", true);

        assertThatThrownBy(() -> memberService.signIn(google))
            .isInstanceOfSatisfying(
                EmailAlreadyRegisteredException.class,
                exception -> assertThat(exception.registeredProvider()).isEqualTo(OAuthProvider.KAKAO)
            );
        assertThatThrownBy(() -> memberService.signUp(google))
            .isInstanceOf(EmailAlreadyRegisteredException.class);
    }

    @Test
    @DisplayName("없는 회원은 찾지 못한다")
    void failsToFindMissingMember() {
        assertThatThrownBy(() -> memberService.findById(Long.MAX_VALUE))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("없는 회원의 초기 정보는 저장하지 못한다")
    void failsToUpdateMissingMemberProfile() {
        assertThatThrownBy(
            () -> memberService.updateProfile(Long.MAX_VALUE, Gender.FEMALE, AgeRange.TEENS, MemberSkinType.DRY)
        ).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("탈퇴하면 회원을 지우고, 없는 회원은 탈퇴시키지 못한다")
    void withdrawsMember() {
        long memberId = memberService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true));

        memberService.withdraw(memberId);

        assertThatThrownBy(() -> memberService.findById(memberId)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> memberService.withdraw(memberId)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("탈퇴한 계정으로 다시 로그인하면 로그인시키지 않고 탈퇴 회원임을 알린다")
    void reportsWithdrawnMemberOnSignIn() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true);
        long memberId = memberService.signUp(account);
        memberService.withdraw(memberId);

        SocialSignInResult result = memberService.signIn(account).orElseThrow();

        assertThat(result.status()).isEqualTo(SignInStatus.WITHDRAWN);
        assertThat(result.memberId()).isEqualTo(memberId);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 계정으로 다시 로그인하면 복구 요청 중임을 알린다")
    void reportsRestoreRequestedMemberOnSignIn() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true);
        long memberId = memberService.signUp(account);
        memberService.withdraw(memberId);
        memberService.requestRestore(memberId);

        SocialSignInResult result = memberService.signIn(account).orElseThrow();

        assertThat(result.status()).isEqualTo(SignInStatus.RESTORE_REQUESTED);
        assertThat(result.memberId()).isEqualTo(memberId);
    }

    @Test
    @DisplayName("탈퇴한 회원은 복구를 요청할 수 있고, 탈퇴하지 않은 회원은 요청할 수 없다")
    void requestsRestore() {
        long memberId = memberService.signUp(new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true));

        assertThatThrownBy(() -> memberService.requestRestore(memberId)).isInstanceOf(ResourceNotFoundException.class);
        memberService.withdraw(memberId);
        memberService.requestRestore(memberId);
    }

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원만 복구하고, 복구하면 다시 로그인한다")
    void restoresOnlyRestoreRequestedMember() {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true);
        long memberId = memberService.signUp(account);

        assertThatThrownBy(() -> memberService.restore(memberId)).isInstanceOf(ResourceNotFoundException.class);
        memberService.withdraw(memberId);
        assertThatThrownBy(() -> memberService.restore(memberId)).isInstanceOf(ResourceNotFoundException.class);
        memberService.requestRestore(memberId);
        memberService.restore(memberId);

        SocialSignInResult result = memberService.signIn(account).orElseThrow();
        assertThat(result.status()).isEqualTo(SignInStatus.SIGNED_IN);
        assertThat(result.memberId()).isEqualTo(memberId);
    }
}
