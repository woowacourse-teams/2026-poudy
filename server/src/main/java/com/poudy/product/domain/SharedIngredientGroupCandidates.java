package com.poudy.product.domain;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * 기준 구성품에 든 성분군을 드문 순서로 담는다. 대상 구성품마다 함께 든 성분군을 앞에서부터 고른다.
 * 드문 순서는 기준 제품과 같은 카테고리에서 그 성분군을 가진 제품 수가 적은 순서이고, 같으면 코드 순서다.
 */
public final class SharedIngredientGroupCandidates {

    /** 거의 모든 쌍에 겹쳐 비슷한 이유를 설명하지 못하는 성분군이다. */
    public static final List<String> UNINFORMATIVE_CODES = List.of("GLYCERIN");

    private static final int LIMIT = 2;

    private final List<Candidate> candidates;

    public SharedIngredientGroupCandidates(List<Candidate> candidates) {
        this.candidates = candidates.stream()
            .filter(candidate -> !UNINFORMATIVE_CODES.contains(candidate.code()))
            .sorted(Comparator.comparingLong(Candidate::productCount).thenComparing(Candidate::code))
            .toList();
    }

    public static SharedIngredientGroupCandidates empty() {
        return new SharedIngredientGroupCandidates(List.of());
    }

    public List<SharedIngredientGroup> sharedWith(ProductPart part) {
        return candidates.stream()
            .filter(candidate -> part.containsAnyIngredient(candidate.ingredientIds()))
            .limit(LIMIT)
            .map(candidate -> new SharedIngredientGroup(candidate.code(), candidate.name()))
            .toList();
    }

    /**
     * @param ingredientIds 이 성분군의 성분 가운데 대상 구성품에서 찾아볼 성분
     * @param productCount 기준 제품과 같은 카테고리에서 이 성분군을 가진 제품 수
     */
    public record Candidate(String code, String name, Set<Long> ingredientIds, long productCount) {
        public Candidate {
            ingredientIds = Set.copyOf(ingredientIds);
        }
    }
}
