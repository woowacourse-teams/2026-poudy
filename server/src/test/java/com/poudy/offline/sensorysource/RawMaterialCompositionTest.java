package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.StableId;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("복합원료 관측")
class RawMaterialCompositionTest {

    private static final String RESOLVER_VERSION = "resolver-v1";

    @Test
    @DisplayName("알려진 복합원료 구성비의 합은 정확히 1이다")
    void requiresKnownFractionsToSumToOne() {
        RawMaterialComposition.KnownComposition composition = new RawMaterialComposition.KnownComposition(
                List.of(
                        knownComponent(1L, "Water", "0.7"),
                        knownComponent(2L, "Glycerin", "0.3")));

        assertThat(composition.components()).hasSize(2);
        assertThatThrownBy(
                () -> new RawMaterialComposition.KnownComposition(
                        List.of(
                                knownComponent(1L, "Water", "0.7"),
                                knownComponent(2L, "Glycerin", "0.2"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("정확히 1");
    }

    @Test
    @DisplayName("identity가 미해결이어도 정확한 fraction과 원문 이름을 잃지 않는다")
    void keepsFractionWhenIdentityIsUnresolved() {
        IngredientResolution.Unresolved unresolved = new IngredientResolution.Unresolved("카탈로그에 없음", RESOLVER_VERSION);
        RawMaterialComposition.KnownComponent component = new RawMaterialComposition.KnownComponent(
                unresolved,
                " Published INCI ",
                ComponentFraction.parse("1"));

        RawMaterialComposition.KnownComposition composition = new RawMaterialComposition.KnownComposition(
                List.of(component));

        assertThat(composition.components().getFirst().ingredientResolution())
                .isSameAs(unresolved);
        assertThat(composition.components().getFirst().nameAsPublished())
                .isEqualTo(" Published INCI ");
        assertThat(composition.components().getFirst().fraction().value())
                .isEqualByComparingTo("1");
    }

    @Test
    @DisplayName("미상 구성비는 각 구성 성분에 원료 전체 투입량을 복제하지 않는다")
    void keepsUnquantifiedCompositionWithoutFractions() {
        RawMaterialComposition.UnquantifiedComposition composition = new RawMaterialComposition.UnquantifiedComposition(
                List.of(
                        new RawMaterialComposition.UnquantifiedComponent(
                                resolved(1L),
                                "Water"),
                        new RawMaterialComposition.UnquantifiedComponent(
                                resolved(2L),
                                "Glycerin")));
        RawMaterialInput input = new RawMaterialInput(
                StableId.namespaced("raw-material", "1"),
                "Hydrating Blend",
                FormulaAmountTestFixture.exact("5"),
                composition);

        assertThat(input.formulaAmount().normalizedMassPercent().value())
                .isEqualByComparingTo("5");
        assertThat(RawMaterialComposition.UnquantifiedComponent.class.getRecordComponents())
                .extracting(RecordComponent::getName)
                .containsExactly("ingredientResolution", "nameAsPublished");
    }

    @Test
    @DisplayName("구성 성분 목록은 nonempty이고 생성 뒤 변경되지 않는다")
    void requiresImmutableNonEmptyComponents() {
        assertThatThrownBy(() -> new RawMaterialComposition.UnquantifiedComposition(List.of()))
                .isInstanceOf(IllegalArgumentException.class);

        List<RawMaterialComposition.UnquantifiedComponent> components = new ArrayList<>(
                List.of(
                        new RawMaterialComposition.UnquantifiedComponent(
                                resolved(1L),
                                "Water")));
        RawMaterialComposition.UnquantifiedComposition composition = new RawMaterialComposition.UnquantifiedComposition(
                components);
        components.clear();

        assertThat(composition.components()).hasSize(1);
        assertThatThrownBy(() -> composition.components().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    private RawMaterialComposition.KnownComponent knownComponent(
            long ingredientId,
            String name,
            String fraction) {
        return new RawMaterialComposition.KnownComponent(
                resolved(ingredientId),
                name,
                ComponentFraction.parse(fraction));
    }

    private IngredientResolution.Resolved resolved(long ingredientId) {
        return new IngredientResolution.Resolved(
                ingredientId,
                "CANONICAL_ID_DIRECT",
                RESOLVER_VERSION);
    }
}
