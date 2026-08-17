package com.poudy.offline.sensorysource;

import java.math.BigDecimal;
import java.util.List;

public sealed interface RawMaterialComposition
        permits RawMaterialComposition.KnownComposition,
        RawMaterialComposition.UnquantifiedComposition {

    record KnownComposition(List<KnownComponent> components) implements RawMaterialComposition {

        public KnownComposition {
            components = requireNonEmpty(components);
            BigDecimal total = components.stream()
                    .map(component -> component.fraction().value())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (total.compareTo(BigDecimal.ONE) != 0) {
                throw new IllegalArgumentException("알려진 복합원료 구성비의 합은 정확히 1이어야 합니다.");
            }
        }
    }

    record UnquantifiedComposition(List<UnquantifiedComponent> components)
            implements
                RawMaterialComposition {

        public UnquantifiedComposition {
            components = requireNonEmpty(components);
        }
    }

    record KnownComponent(
            IngredientResolution ingredientResolution,
            String nameAsPublished,
            ComponentFraction fraction) {

        public KnownComponent {
            requireResolution(ingredientResolution);
            nameAsPublished = requirePublishedName(nameAsPublished);
            if (fraction == null) {
                throw new IllegalArgumentException("복합원료 구성 성분의 정확한 fraction이 필요합니다.");
            }
        }
    }

    record UnquantifiedComponent(
            IngredientResolution ingredientResolution,
            String nameAsPublished) {

        public UnquantifiedComponent {
            requireResolution(ingredientResolution);
            nameAsPublished = requirePublishedName(nameAsPublished);
        }
    }

    private static <T> List<T> requireNonEmpty(List<T> components) {
        if (components == null || components.isEmpty()) {
            throw new IllegalArgumentException("복합원료 구성 성분은 한 개 이상이어야 합니다.");
        }
        if (components.stream().anyMatch(component -> component == null)) {
            throw new IllegalArgumentException("복합원료 구성 성분은 null일 수 없습니다.");
        }

        return List.copyOf(components);
    }

    private static void requireResolution(IngredientResolution resolution) {
        if (resolution == null) {
            throw new IllegalArgumentException("구성 성분의 identity 해석 결과가 필요합니다.");
        }
    }

    private static String requirePublishedName(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("구성 성분의 원문 이름이 필요합니다.");
        }

        return value;
    }
}
