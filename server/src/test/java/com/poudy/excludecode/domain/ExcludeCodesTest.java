package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제외 성분군 목록")
class ExcludeCodesTest {

    private static final ExcludeCodeGroup SULFATES = new ExcludeCodeGroup(
        ExcludeCode.SULFATES,
        "설페이트 성분",
        "설페이트 성분을 제외합니다.",
        List.of(
            new ExcludeCodeIngredient(30L, "성분 30", null),
            new ExcludeCodeIngredient(10L, "성분 10", null),
            new ExcludeCodeIngredient(20L, "성분 20", null)
        )
    );

    @Test
    @DisplayName("DB 정의와 성분 순서를 그대로 유지한다")
    void keepsDefinitionAndIngredientOrder() {
        ExcludeCodeGroup newCode = new ExcludeCodeGroup(
            ExcludeCode.FRAGRANCE_ALLERGENS,
            "새 성분군",
            "새 설명",
            List.of(new ExcludeCodeIngredient(10L, "성분 10", null))
        );
        ExcludeCodes resolved = new ExcludeCodes(List.of(newCode, SULFATES));

        assertThat(resolved.groups()).containsExactly(newCode, SULFATES);
        assertThat(SULFATES.ingredients()).extracting(ExcludeCodeIngredient::id)
            .containsExactly(30L, 10L, 20L);
        assertThat(resolved.codesOf(10L)).containsExactly(ExcludeCode.FRAGRANCE_ALLERGENS, ExcludeCode.SULFATES);
    }

    @Test
    @DisplayName("DB 정의에 성분이 없으면 만들 수 없다")
    void rejectsEmptyCode() {
        assertThatThrownBy(() -> new ExcludeCodeGroup(ExcludeCode.SULFATES, "설페이트", "설명", List.of()))
            .isInstanceOf(InvalidExcludeCodeDefinitionException.class).hasMessageContaining("SULFATES");
    }
}
