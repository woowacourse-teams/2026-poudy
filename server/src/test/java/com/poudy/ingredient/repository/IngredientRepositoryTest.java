package com.poudy.ingredient.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.DeferredTagEvidenceException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import com.poudy.tag.domain.Tags;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

@DisplayName("성분 저장소")
class IngredientRepositoryTest {

    private static final OffsetDateTime UPDATED_AT = OffsetDateTime.parse("2026-08-01T00:00:00Z");
    private static final Tags TAGS = Tags.from(
            List.of(new Tag(13L, TagCategory.FUNCTION, "HUMECTANT", "습윤제")));

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
        assertThatThrownBy(
                () -> repositoryReading(
                        ingredient("설명", UPDATED_AT),
                        ingredient("다른 설명", UPDATED_AT)))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("성분 ID가 중복되었습니다")
                .hasMessageContaining("1");
    }

    @Test
    @DisplayName("tag_id로 tags.json의 태그를 찾아 성분에 매핑한다")
    void resolvesTagById() {
        String data = """
                {
                  "id":1,
                  "korean_name":"글리세린",
                  "english_name":"Glycerin",
                  "description":"설명",
                  "tag_mappings":[{"tag_id":13,"source":"출처"}],
                  "updated_at":"2026-08-01T00:00:00Z"
                }
                """;

        Ingredient ingredient = repositoryReading(data).findById(1L).orElseThrow();

        assertThat(ingredient.formulationRoles())
                .extracting(FormulationRole::id, FormulationRole::code, FormulationRole::displayName)
                .containsExactly(tuple(13L, "HUMECTANT", "습윤제"));
    }

    @Test
    @DisplayName("존재하지 않는 tag_id를 참조하면 로딩에 실패한다")
    void rejectsUnknownTagId() {
        String data = """
                {
                  "id":1,
                  "korean_name":"글리세린",
                  "description":"설명",
                  "tag_mappings":[{"tag_id":999,"source":"출처"}],
                  "updated_at":"2026-08-01T00:00:00Z"
                }
                """;

        assertThatThrownBy(() -> repositoryReading(data))
                .isInstanceOf(InfrastructureException.class)
                .rootCause()
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("존재하지 않는 태그 ID")
                .hasMessageContaining("ingredient_id=1")
                .hasMessageContaining("tag_id=999");
    }

    @Test
    @DisplayName("근거가 보류된 태그 매핑은 인프라 예외로 감싸 로딩에 실패한다")
    void rejectsDeferredTagEvidence() {
        String data = """
                {
                  "id":1,
                  "korean_name":"글리세린",
                  "description":"설명",
                  "tag_mappings":[{"tag_id":13,"source":"확인된 근거\\n태그 보류 — 확인 필요"}],
                  "updated_at":"2026-08-01T00:00:00Z"
                }
                """;

        assertThatThrownBy(() -> repositoryReading(data))
                .isInstanceOf(InfrastructureException.class)
                .hasRootCauseInstanceOf(DeferredTagEvidenceException.class);
    }

    private static IngredientRepository repositoryReading(String... ingredients) {
        String ingredientData = """
                {"ingredients":[%s]}
                """.formatted(String.join(",", ingredients));
        DefaultResourceLoader resourceLoader = new DefaultResourceLoader() {

            @Override
            public Resource getResource(String location) {
                return new ByteArrayResource(ingredientData.getBytes(StandardCharsets.UTF_8));
            }
        };

        return new IngredientRepository(new JsonDataReader(resourceLoader), TAGS);
    }

    private static String ingredient(String description, OffsetDateTime updatedAt) {
        return """
                {
                  "id":1,
                  "korean_name":"글리세린",
                  "english_name":"Glycerin",
                  "description":%s,
                  "updated_at":%s
                }
                """.formatted(jsonString(description), jsonString(text(updatedAt)));
    }

    private static String text(OffsetDateTime value) {
        if (value == null) {
            return null;
        }

        return value.toString();
    }

    private static String jsonString(String value) {
        if (value == null) {
            return "null";
        }

        return "\"" + value + "\"";
    }
}
