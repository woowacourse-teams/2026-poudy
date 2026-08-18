package com.poudy.ingredient.repository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 저장소")
class IngredientRepositoryTest {

    private static final OffsetDateTime UPDATED_AT = OffsetDateTime.parse("2026-08-01T00:00:00Z");

    @Test
    @DisplayName("상세 설명이 null이면 로딩에 실패한다")
    void rejectsMissingDescription() {
        assertThatThrownBy(() -> repositoryReading(ingredient(null, UPDATED_AT)))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("description, updated_at")
                .hasMessageContaining("1");
    }

    @Test
    @DisplayName("수정 시각이 null이면 로딩에 실패한다")
    void rejectsMissingUpdatedAt() {
        assertThatThrownBy(() -> repositoryReading(ingredient("설명", null)))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("description, updated_at")
                .hasMessageContaining("1");
    }

    @Test
    @DisplayName("같은 ID의 성분이 있으면 로딩에 실패한다")
    void rejectsDuplicateIds() {
        Ingredient first = ingredient("설명", UPDATED_AT);
        Ingredient duplicate = new Ingredient(
                1L,
                "향료",
                "Fragrance",
                null,
                "다른 설명",
                null,
                null,
                null,
                null,
                UPDATED_AT);

        assertThatThrownBy(() -> repositoryReading(first, duplicate))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("성분 ID가 중복되었습니다")
                .hasMessageContaining("1");
    }

    private static IngredientRepository repositoryReading(Ingredient... ingredients) {
        JsonDataReader jsonDataReader = mock(JsonDataReader.class);
        given(jsonDataReader.readList("ingredients.json", Ingredient.class)).willReturn(List.of(ingredients));
        return new IngredientRepository(jsonDataReader);
    }

    private static Ingredient ingredient(String description, OffsetDateTime updatedAt) {
        return new Ingredient(1L, "글리세린", "Glycerin", null, description, null, null, null, null, updatedAt);
    }
}
