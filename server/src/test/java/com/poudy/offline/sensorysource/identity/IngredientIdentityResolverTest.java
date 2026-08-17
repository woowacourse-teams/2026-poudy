package com.poudy.offline.sensorysource.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.sensorysource.IngredientResolution.Ambiguous;
import com.poudy.offline.sensorysource.IngredientResolution.Resolved;
import com.poudy.offline.sensorysource.IngredientResolution.Unresolved;
import java.text.Normalizer;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("오프라인 성분 식별자 해석기")
class IngredientIdentityResolverTest {

    @Test
    @DisplayName("유효한 canonical ID는 이름보다 먼저 직접 해석한다")
    void resolvesCanonicalIdBeforeName() {
        IngredientIdentityResolver resolver = resolver(
                entry(20, "향료", "Fragrance", "퍼퓸"),
                entry(10, "글리세린", "Glycerin", "글리세롤"));

        assertThat(resolver.resolve(20L, "글리세린"))
                .isEqualTo(
                        new Resolved(
                                20L,
                                IngredientIdentityResolver.MatchRule.CANONICAL_ID_DIRECT.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("ID가 카탈로그에 없으면 정규화 exact 이름으로 계속 해석한다")
    void fallsBackToExactNameWhenCanonicalIdIsUnknown() {
        IngredientIdentityResolver resolver = resolver(entry(10, "글리세린", "Glycerin", "글리세롤"));

        assertThat(resolver.resolve(999L, " GLYCE\u00A0RIN "))
                .isEqualTo(
                        new Resolved(
                                10L,
                                IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("Unicode NFC와 모든 공백 및 대소문자만 정규화한다")
    void normalizesOnlyUnicodeWhitespaceAndCase() {
        IngredientIdentityResolver resolver = resolver(entry(10, "글리 세린", "Glycerin", "글리세롤"));
        String decomposed = Normalizer.normalize("글리세린", Normalizer.Form.NFD);

        assertThat(resolver.resolve(null, decomposed))
                .isEqualTo(
                        new Resolved(
                                10L,
                                IngredientIdentityResolver.MatchRule.KOREAN_NAME_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
        assertThat(resolver.resolve(null, "glycer-in"))
                .isEqualTo(
                        new Unresolved(
                                IngredientIdentityResolver.UnresolvedReason.NORMALIZED_EXACT_NAME_NOT_FOUND.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("별칭도 정규화 exact match로 해석한다")
    void resolvesNormalizedAliasExactMatch() {
        IngredientIdentityResolver resolver = resolver(entry(10, "글리세린", "Glycerin", "Glycerol 85%"));

        assertThat(resolver.resolve(null, " glycerol\t85% "))
                .isEqualTo(
                        new Resolved(
                                10L,
                                IngredientIdentityResolver.MatchRule.ALIAS_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("같은 exact 후보가 여러 ID면 가장 작은 ID를 고르지 않고 오름차순 후보를 반환한다")
    void preservesSortedAmbiguousCandidates() {
        IngredientIdentityResolver resolver = resolver(
                entry(30, "다른 이름", "Other Name", "공통명"),
                entry(10, "공통 명", "First Name", "첫 별칭"),
                entry(20, "세 번째", "Common Name", "셋째 별칭"));

        assertThat(resolver.resolve(null, "공 통 명"))
                .isEqualTo(
                        new Ambiguous(
                                List.of(10L, 30L),
                                IngredientIdentityResolver.AmbiguityReason.MULTIPLE_NORMALIZED_EXACT_NAME_MATCHES
                                        .name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("한 성분의 여러 이름 필드가 함께 맞아도 후보 하나로 센다")
    void deduplicatesCandidateWithinSameIngredient() {
        IngredientIdentityResolver resolver = resolver(entry(10, "글리세린", "글리 세린", "글리세린"));

        assertThat(resolver.resolve(null, "글리세린"))
                .isEqualTo(
                        new Resolved(
                                10L,
                                IngredientIdentityResolver.MatchRule.KOREAN_NAME_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("입력과 후보가 없으면 명시적인 unresolved 이유를 반환한다")
    void reportsStableUnresolvedReasons() {
        IngredientIdentityResolver resolver = resolver(entry(10, "글리세린", "Glycerin", "글리세롤"));

        assertThat(resolver.resolve(null, " \u00A0 "))
                .isEqualTo(
                        new Unresolved(
                                IngredientIdentityResolver.UnresolvedReason.MISSING_IDENTITY_INPUT.name(),
                                IngredientIdentityResolver.VERSION));
        assertThat(resolver.resolve(999L, null))
                .isEqualTo(
                        new Unresolved(
                                IngredientIdentityResolver.UnresolvedReason.CANONICAL_ID_NOT_FOUND.name(),
                                IngredientIdentityResolver.VERSION));
        assertThat(resolver.resolve(999L, "없는성분"))
                .isEqualTo(
                        new Unresolved(
                                IngredientIdentityResolver.UnresolvedReason.CANONICAL_ID_AND_NORMALIZED_EXACT_NAME_NOT_FOUND
                                        .name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("중복 canonical ID 카탈로그는 자동 병합하지 않는다")
    void rejectsDuplicateCanonicalIds() {
        assertThatThrownBy(
                () -> resolver(
                        entry(10, "글리세린", "Glycerin", "글리세롤"),
                        entry(10, "향료", "Fragrance", "퍼퓸")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("중복 canonical ingredient ID")
                .hasMessageContaining("10");
    }

    private static IngredientIdentityResolver resolver(IngredientVocabularyEntry... entries) {
        return new IngredientIdentityResolver(List.of(entries));
    }

    private static IngredientVocabularyEntry entry(
            long id,
            String koreanName,
            String englishName,
            String... aliases) {
        return new IngredientVocabularyEntry(id, koreanName, List.of(englishName), List.of(aliases));
    }
}
