package com.poudy.shelf.domain;

import static com.poudy.shelf.domain.SkinCautionIngredients.ALKYL_GLUCOSIDES;
import static com.poudy.shelf.domain.SkinCautionIngredients.CLEANSING_AGENTS;
import static com.poudy.shelf.domain.SkinCautionIngredients.COOLING_AGENTS;
import static com.poudy.shelf.domain.SkinCautionIngredients.ESSENTIAL_OILS;
import static com.poudy.shelf.domain.SkinCautionIngredients.FRAGRANCE_ALLERGENS;
import static com.poudy.shelf.domain.SkinCautionIngredients.OCCLUSIVES;
import static com.poudy.shelf.domain.SkinCautionIngredients.PRESERVATIVES;
import static com.poudy.shelf.domain.SkinCautionIngredients.SOAPS;
import static com.poudy.shelf.domain.SkinCautionIngredients.STINGING_INGREDIENTS;
import static com.poudy.shelf.domain.SkinCautionIngredients.WITCH_HAZEL;
import static com.poudy.shelf.domain.SkinCautionIngredients.union;

import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// 바우만 피부 타입의 건성·지성, 민감성 축에서 피하라고 한 성분. 성분군은 소속 성분 전체를 쓴다.
public enum SkinCaution {

    DRY_SKIN(
        IngredientAnalysisReason.DRY_SKIN,
        List.of(ExcludeCode.SULFATES.value(), ExcludeCode.DRYING_ALCOHOLS.value()),
        union(CLEANSING_AGENTS, SOAPS, WITCH_HAZEL)),
    OILY_SKIN(IngredientAnalysisReason.OILY_SKIN, List.of(), OCCLUSIVES),
    SENSITIVE_SKIN(
        IngredientAnalysisReason.SENSITIVE_SKIN,
        List.of(
            ExcludeCode.FRAGRANCE_ALLERGENS.value(),
            "AHA",
            "RETINOIDS"
        ),
        union(
            FRAGRANCE_ALLERGENS,
            COOLING_AGENTS,
            ESSENTIAL_OILS,
            PRESERVATIVES,
            ALKYL_GLUCOSIDES,
            STINGING_INGREDIENTS,
            WITCH_HAZEL
        ));

    private final IngredientAnalysisReason reason;
    private final List<String> ingredientGroupCodes;
    private final Set<Long> ingredientIds;

    SkinCaution(IngredientAnalysisReason reason, List<String> ingredientGroupCodes, Set<Long> ingredientIds) {
        this.reason = reason;
        this.ingredientGroupCodes = ingredientGroupCodes;
        this.ingredientIds = ingredientIds;
    }

    public List<String> ingredientGroupCodes() {
        return ingredientGroupCodes;
    }

    public IngredientAnalysisReason reason() {
        return reason;
    }

    public Set<Long> ingredientIdsWith(Map<String, Set<Long>> groupIngredientIds) {
        return Stream.concat(
            ingredientIds.stream(),
            ingredientGroupCodes.stream().flatMap(code -> groupIngredientIds.getOrDefault(code, Set.of()).stream())
        ).collect(Collectors.toUnmodifiableSet());
    }
}
