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
    @DisplayName("처음 로그인하면 인증된 이메일로 가입한다")
    void registersNewMember() {
        Member member = memberService.findById(
            memberService.signIn(new OAuthAccount(OAuthProvider.KAKAO, "1", "New@Example.com", true))
        );

        assertThat(member.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(member.email()).isEqualTo("new@example.com");
    }

    @Test
    @DisplayName("이미 가입한 회원은 이메일 상태와 관계없이 같은 회원으로 로그인한다")
    void signsInRegisteredMember() {
        long registered = memberService
            .signIn(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@example.com", true));

        long signedIn = memberService.signIn(new OAuthAccount(OAuthProvider.GOOGLE, "sub", null, false));

        assertThat(signedIn).isEqualTo(registered);
    }

    @Test
    @DisplayName("인증되지 않은 이메일로는 가입하지 않는다")
    void rejectsUnverifiedEmail() {
        assertThatThrownBy(
            () -> memberService.signIn(new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", false))
        ).isInstanceOf(UnverifiedOAuthEmailException.class);
    }

    @Test
    @DisplayName("다른 제공자로 가입한 이메일이면 가입하지 않고 그 제공자를 알린다")
    void rejectsEmailRegisteredWithAnotherProvider() {
        memberService.signIn(new OAuthAccount(OAuthProvider.KAKAO, "1", "member@example.com", true));

        assertThatThrownBy(
            () -> memberService.signIn(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "Member@example.com", true))
        )
            .isInstanceOfSatisfying(
                EmailAlreadyRegisteredException.class,
                exception -> assertThat(exception.registeredProvider()).isEqualTo(OAuthProvider.KAKAO)
            );
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
}
