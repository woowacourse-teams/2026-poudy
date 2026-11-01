package com.poudy.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("닉네임 조합")
class NicknameCombinationTest {

    @Test
    @DisplayName("형용사, 명사, 순번을 공백으로 이어 닉네임을 만든다")
    void makesNickname() {
        NicknameCombination combination = new NicknameCombination(NicknameAdjective.COZY, NicknameNoun.SQUIRREL);

        assertThat(combination.nicknameOf(1_000)).isEqualTo("포근한 다람쥐 1000");
        assertThat(combination.nicknameOf(999_999)).isEqualTo("포근한 다람쥐 999999");
    }

    @Test
    @DisplayName("단어는 형용사와 명사 각각 50개이고 겹치지 않으며 가장 긴 닉네임도 20자 안에 든다")
    void keepsWordsWithinNicknameLimit() {
        int longestAdjective = Arrays.stream(NicknameAdjective.values()).mapToInt(word -> word.word().length()).max()
            .orElseThrow();
        int longestNoun = Arrays.stream(NicknameNoun.values()).mapToInt(word -> word.word().length()).max()
            .orElseThrow();

        assertThat(Arrays.stream(NicknameAdjective.values()).map(NicknameAdjective::word).distinct()).hasSize(50);
        assertThat(Arrays.stream(NicknameNoun.values()).map(NicknameNoun::word).distinct()).hasSize(50);
        assertThat(longestAdjective + 1 + longestNoun + 1 + String.valueOf(NicknameCombination.LAST_NUMBER).length())
            .isLessThanOrEqualTo(20);
    }
}
