package com.poudy.skintype.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SkinChoiceTest {

    @Test
    @DisplayName("피부 선택지 코드와 표시명을 표시 순서대로 정의한다")
    void definesSkinChoicesInDisplayOrder() {
        assertThat(SkinChoice.values())
            .extracting(SkinChoice::name, SkinChoice::getDisplayName)
            .containsExactly(
                tuple("DRY", "건성"),
                tuple("OILY", "지성"),
                tuple("COMBINATION", "복합성"),
                tuple("SENSITIVE", "민감성")
            );
    }

    @Test
    @DisplayName("피부 타입은 같은 코드의 선택지로 바뀌고 민감성은 피부 타입에 없다")
    void mapsEverySkinTypeToSameCode() {
        assertThat(Arrays.stream(SkinType.values()).map(SkinChoice::from).map(SkinChoice::name))
            .containsExactly("DRY", "OILY", "COMBINATION");
        assertThat(SkinType.values()).extracting(SkinType::name).doesNotContain("SENSITIVE");
    }
}
