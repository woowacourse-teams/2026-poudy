package com.poudy.user.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("닉네임 규칙")
class NicknameTest {

    @ParameterizedTest
    @ValueSource(strings = {"수달", "Ab", "12", "ㅋㅋ", "포근한 다람쥐 1000", "abcdefghijklmnopqrst", "ㄱㅏ수달", "시발", "fuck"})
    void acceptsAllowedNames(String value) {
        assertThat(new Nickname(value).value()).isEqualTo(value);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "가",
            " ",
            " 수달",
            "수달 ",
            "산뜻한  수달",
            "abcdefghijklmnopqrstu",
            "수달!",
            "수달😀",
            "수달\n",
            "수달\t",
            "수달　친구",
            "café"})
    void rejectsInvalidNames(String value) {
        assertThatThrownBy(() -> new Nickname(value)).isInstanceOf(InvalidNicknameException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"관리자", "운 영 자", "aDmIn123", "moderator"})
    void rejectsForbiddenWordsIgnoringSpacesAndCase(String value) {
        assertThatThrownBy(() -> new Nickname(value)).isInstanceOf(InvalidNicknameException.class);
    }

    @Test
    void acceptsAllGeneratedWordCombinations() {
        for (NicknameAdjective adjective : NicknameAdjective.values()) {
            for (NicknameNoun noun : NicknameNoun.values()) {
                String generated = new NicknameCombination(adjective, noun).nicknameOf(NicknameCombination.LAST_NUMBER);
                assertThat(new Nickname(generated).value()).isEqualTo(generated);
            }
        }
    }
}
