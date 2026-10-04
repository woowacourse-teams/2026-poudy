package com.poudy.member.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.OAuthProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원")
class MemberTest {

    @Test
    @DisplayName("성별, 나이대, 피부 타입을 모두 고르면 초기 정보 입력을 마친 것이다")
    void completesProfileWithAllAnswers() {
        Member member = new Member(
            1L,
            OAuthProvider.KAKAO,
            "member@example.com",
            Gender.FEMALE,
            AgeRange.TWENTIES,
            MemberSkinType.UNKNOWN
        );

        assertThat(member.isProfileCompleted()).isTrue();
    }

    @Test
    @DisplayName("하나라도 고르지 않았으면 초기 정보 입력을 마치지 않은 것이다")
    void doesNotCompleteProfileWithMissingAnswer() {
        Member member = new Member(
            1L,
            OAuthProvider.KAKAO,
            "member@example.com",
            Gender.FEMALE,
            AgeRange.TWENTIES,
            null
        );

        assertThat(member.isProfileCompleted()).isFalse();
    }
}
