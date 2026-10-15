package com.poudy.shelf.domain;

import com.poudy.skintype.domain.SkinType;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// 사용자의 피부 타입과 민감성 여부로 고른 주의 종류. 두 축이 만나는 곳은 여기 하나다.
public record SkinCautions(Set<SkinCaution> values) {

    public SkinCautions {
        values = Set.copyOf(values);
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
        return values.stream()
            .flatMap(caution -> caution.ingredientGroupCodes().stream())
            .distinct()
            .sorted()
            .toList();
    }

    // 성분군 소속 성분은 DB가 정하므로 조회한 값을 받아 코드에 적은 성분과 합친다.
    public Set<Long> ingredientIdsWith(Collection<Long> groupIngredientIds) {
        return Stream
            .concat(values.stream().flatMap(caution -> caution.ingredientIds().stream()), groupIngredientIds.stream())
            .collect(Collectors.toUnmodifiableSet());
    }
}
