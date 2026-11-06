package com.poudy.shelf.domain;

import com.poudy.skintype.domain.SkinType;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

// 사용자의 피부 타입과 민감성 여부로 고른 주의 종류. 두 축이 만나는 곳은 여기 하나다.
public final class SkinCautions {

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

    public static SkinCautions all() {
        return new SkinCautions(EnumSet.allOf(SkinCaution.class));
    }

    public List<String> ingredientGroupCodes() {
        return cautions.stream()
            .flatMap(caution -> caution.ingredientGroupCodes().stream())
            .distinct()
            .sorted()
            .toList();
    }

    // 성분군별 조회 결과를 각 주의 종류에 연결해, 합친 뒤에도 선정 근거를 보존한다.
    public SuspectCandidates candidatesWith(
        Set<Long> excludeCodeIngredientIds,
        Map<String, Set<Long>> groupIngredientIds
    ) {
        return new SuspectCandidates(
            excludeCodeIngredientIds,
            cautions.stream().collect(
                Collectors.toUnmodifiableMap(
                    Function.identity(),
                    caution -> caution.ingredientIdsWith(groupIngredientIds)
                )
            )
        );
    }
}
