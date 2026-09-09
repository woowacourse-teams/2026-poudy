package com.poudy.skintype.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SkinTypeTest {

    @Test
    @DisplayName("피부타입 코드와 표시명을 표시 순서대로 정의한다")
    void definesSkinTypesInDisplayOrder() {
        assertThat(SkinType.values())
            .extracting(SkinType::name, SkinType::displayName)
            .containsExactly(
                tuple("DRY", "건성"),
                tuple("OILY", "지성"),
                tuple("SENSITIVE", "민감성"),
                tuple("COMBINATION", "복합성")
            );
    }

    @Test
    @DisplayName("피부타입 코드는 유일하다")
    void hasUniqueCodes() {
        assertThat(SkinType.values()).extracting(SkinType::name).doesNotHaveDuplicates();
    }
}
