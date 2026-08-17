package com.poudy.product.domain.sensory;

import java.util.Optional;
import java.util.Set;

public final class HeuristicIngredientSensoryProfiles {

    public static final String VERSION = "ingredient-role-profile-v0.2";

    private static final Set<Long> MOISTURE_IDS = Set.of(
            475L,
            586L,
            3500L,
            3605L,
            3953L,
            5218L);
    private static final Set<Long> OIL_IDS = Set.of(
            1463L,
            2896L,
            3260L,
            4510L,
            7587L);
    private static final Set<Long> DEFERRED_CONCENTRATION_IDS = Set.of(
            2898L,
            4840L);

    private HeuristicIngredientSensoryProfiles() {
    }

    public static Optional<Signal> findSignal(Long ingredientId) {
        if (ingredientId == null) {
            return Optional.empty();
        }
        boolean moisture = MOISTURE_IDS.contains(ingredientId);
        boolean oil = OIL_IDS.contains(ingredientId);
        if (!moisture && !oil) {
            return Optional.empty();
        }
        return Optional.of(new Signal(moisture, oil));
    }

    public static Optional<ReviewDisposition> reviewDisposition(Long ingredientId) {
        if (findSignal(ingredientId).isPresent()) {
            return Optional.of(ReviewDisposition.AXIS_SIGNAL);
        }
        if (ingredientId != null && DEFERRED_CONCENTRATION_IDS.contains(ingredientId)) {
            return Optional.of(ReviewDisposition.DEFERRED_CONCENTRATION);
        }
        return Optional.empty();
    }

    public enum ReviewDisposition {
        AXIS_SIGNAL,
        DEFERRED_CONCENTRATION
    }

    public record Signal(boolean moisture, boolean oil) {
    }
}
