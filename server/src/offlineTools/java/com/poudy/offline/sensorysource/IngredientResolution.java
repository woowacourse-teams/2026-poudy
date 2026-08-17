package com.poudy.offline.sensorysource;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

public sealed interface IngredientResolution
        permits IngredientResolution.Resolved,
        IngredientResolution.Unresolved,
        IngredientResolution.Ambiguous {

    String resolverVersion();

    record Resolved(long canonicalIngredientId, String matchRule, String resolverVersion)
            implements
                IngredientResolution {

        public Resolved {
            requirePositive(canonicalIngredientId);
            matchRule = requireNonBlank(matchRule, "성분 일치 규칙");
            resolverVersion = requireNonBlank(resolverVersion, "성분 resolver 버전");
        }
    }

    record Unresolved(String reason, String resolverVersion) implements IngredientResolution {

        public Unresolved {
            reason = requireNonBlank(reason, "성분 미해결 이유");
            resolverVersion = requireNonBlank(resolverVersion, "성분 resolver 버전");
        }
    }

    record Ambiguous(List<Long> candidateIngredientIds, String reason, String resolverVersion)
            implements
                IngredientResolution {

        public Ambiguous {
            if (candidateIngredientIds == null) {
                throw new IllegalArgumentException("모호한 성분 해석에는 후보 ID가 필요합니다.");
            }
            if (candidateIngredientIds.stream().anyMatch(candidate -> candidate == null)) {
                throw new IllegalArgumentException("모호한 성분 후보 ID는 null일 수 없습니다.");
            }
            candidateIngredientIds.forEach(IngredientResolution::requirePositive);
            if (candidateIngredientIds.size() < 2
                    || new HashSet<>(candidateIngredientIds).size() != candidateIngredientIds.size()) {
                throw new IllegalArgumentException("모호한 성분 해석에는 서로 다른 후보 ID가 둘 이상 필요합니다.");
            }
            candidateIngredientIds = candidateIngredientIds.stream()
                    .sorted(Comparator.naturalOrder())
                    .toList();
            reason = requireNonBlank(reason, "성분 모호성 이유");
            resolverVersion = requireNonBlank(resolverVersion, "성분 resolver 버전");
        }
    }

    private static void requirePositive(long ingredientId) {
        if (ingredientId <= 0) {
            throw new IllegalArgumentException("canonical 성분 ID는 양수여야 합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }

        return value;
    }
}
