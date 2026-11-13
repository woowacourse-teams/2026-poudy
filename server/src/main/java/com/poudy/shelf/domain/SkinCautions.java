package com.poudy.shelf.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.skintype.domain.SkinType;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// 사용자의 피부 타입과 민감성 여부로 고른 주의 종류. 두 축이 만나는 곳은 여기 하나다.
public final class SkinCautions {

    private static final List<String> COMMON_GROUP_CODES = List.of(
        ExcludeCode.FRAGRANCE_ALLERGENS.value(),
        ExcludeCode.SULFATES.value()
    );

    private static final Set<Long> COMMON_INGREDIENT_IDS = SkinCautionIngredients.union(
        SkinCautionIngredients.FRAGRANCE_ALLERGENS,
        SkinCautionIngredients.PERU_BALSAM,
        SkinCautionIngredients.PROPOLIS,
        SkinCautionIngredients.LANOLIN,
        SkinCautionIngredients.ALLERGENIC_PRESERVATIVES
    );

    private final Set<SkinCaution> cautions;

    private SkinCautions(Set<SkinCaution> cautions) {
        this.cautions = Set.copyOf(cautions);
    }

    public static SkinCautions of(SkinType skinType, Boolean sensitiveSkin) {
        Set<SkinCaution> cautions = EnumSet.noneOf(SkinCaution.class);
        if (skinType == SkinType.DRY || skinType == SkinType.COMBINATION) {
            cautions.add(SkinCaution.DRY_SKIN);
        }
        if (skinType == SkinType.OILY || skinType == SkinType.COMBINATION) {
            cautions.add(SkinCaution.OILY_SKIN);
        }
        if (Boolean.TRUE.equals(sensitiveSkin)) {
            cautions.add(SkinCaution.SENSITIVE_SKIN);
        }
        return new SkinCautions(cautions);
    }

    public List<String> ingredientGroupCodes() {
        return Stream.concat(
            COMMON_GROUP_CODES.stream(),
            cautions.stream().flatMap(caution -> caution.ingredientGroupCodes().stream())
        )
            .distinct()
            .sorted()
            .toList();
    }

    // 성분군별 조회 결과를 각 주의 종류에 연결해, 합친 뒤에도 선정 근거를 보존한다.
    public SuspectCandidates candidatesWith(Map<String, Set<Long>> groupIngredientIds) {
        return SuspectCandidates.of(
            commonIngredientIds(groupIngredientIds),
            cautions.stream().collect(
                Collectors.toUnmodifiableMap(
                    Function.identity(),
                    caution -> caution.ingredientIdsWith(groupIngredientIds)
                )
            )
        );
    }

    private static Set<Long> commonIngredientIds(Map<String, Set<Long>> groupIngredientIds) {
        return Stream.concat(
            COMMON_INGREDIENT_IDS.stream(),
            COMMON_GROUP_CODES.stream().flatMap(code -> groupIngredientIds.getOrDefault(code, Set.of()).stream())
        ).collect(Collectors.toUnmodifiableSet());
    }
}
