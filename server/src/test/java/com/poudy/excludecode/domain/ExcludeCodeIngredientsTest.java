package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("제외 성분군의 합성 색소 판정")
class ExcludeCodeIngredientsTest {

    @ParameterizedTest
    @ValueSource(strings = {"황색4호", "적색103호의(1)", "염기성황색57호", "분산자색1호"})
    @DisplayName("공식 색소명의 기본형, 접미사형과 접두사형을 포함한다")
    void includesOfficialColorantNames(String koreanName) {
        assertThat(ExcludeCodeIngredients.isSyntheticColorant(koreanName)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"적색산화철", "티타늄디옥사이드", "카민"})
    @DisplayName("색 이름이나 CI 코드가 있어도 등록 색소명 형식이 아니면 제외한다")
    void excludesOtherPigments(String koreanName) {
        assertThat(ExcludeCodeIngredients.isSyntheticColorant(koreanName)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Lithol Rubine B,CI 15850", "Lithol Rubine BCA, CI 15850:1"})
    @DisplayName("영문명에서 CI 코드를 추출한다")
    void extractsColorIndexes(String englishName) {
        assertThat(ExcludeCodeIngredients.colorIndexesOf(englishName)).isNotEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Zinc Oxide", "Zinc Oxide,CI", "Zinc Oxide,CI UNKNOWN"})
    @DisplayName("올바른 숫자 CI 코드가 아니면 추출하지 않는다")
    void ignoresInvalidColorIndexes(String englishName) {
        assertThat(ExcludeCodeIngredients.colorIndexesOf(englishName)).isEqualTo(Set.of());
    }

    @Test
    @DisplayName("등록 색소와 같은 CI 코드를 가진 별칭도 포함한다")
    void includesAliasWithRegisteredColorIndex() {
        Set<String> registeredColorIndexes = Set.of("15850");

        assertThat(
                ExcludeCodeIngredients.isSyntheticColorant("별도표기", "Lithol Rubine B,CI 15850", registeredColorIndexes))
                .isTrue();
        assertThat(ExcludeCodeIngredients.isSyntheticColorant("징크옥사이드", "Zinc Oxide,CI 77947", registeredColorIndexes))
                .isFalse();
    }
}
