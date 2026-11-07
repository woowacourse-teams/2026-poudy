package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import java.util.Optional;

public enum Concern {
    DRYNESS("건조·당김", "HYDRATION_RELATED", "BARRIER_SUPPORT_RELATED"),
    OILINESS("번들거림", "SEBUM_CONTROL_RELATED"),
    ACNE("여드름", "ACNE_RELATED"),
    PIGMENTATION("색소·잡티", "PIGMENTATION_RELATED"),
    DULLNESS("칙칙한 톤", "BRIGHTENING_RELATED"),
    WRINKLES("주름", "WRINKLE_RELATED"),
    UNEVEN_TEXTURE("거친 피부결", "EXFOLIATION_RELATED", "HYDRATION_RELATED");

    private final String displayName;
    private final List<String> effectCodes;

    Concern(String displayName, String... effectCodes) {
        this.displayName = displayName;
        this.effectCodes = List.of(effectCodes);
    }

    public String displayName() {
        return displayName;
    }

    List<ConcernEffect> effectsIn(Ingredients ingredients) {
        return effectCodes.stream()
            .map(code -> ConcernEffect.find(code, ingredients))
            .flatMap(Optional::stream)
            .toList();
    }
}
