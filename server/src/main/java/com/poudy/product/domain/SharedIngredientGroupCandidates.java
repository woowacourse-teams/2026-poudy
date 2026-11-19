package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * 기준 구성품에 든 성분군을 드문 순서로 담는다. 글리세린과 주의 성격의 성분군은 담지 않는다.
 * 빠른 제외 6종과 주의 성분군(코드가 _CAUTION 으로 끝남)은 결과 행의 주의 표시가 따로 맡는다. 대상 구성품마다 함께 든 성분군을 앞에서부터 고른다.
 * 드문 순서는 기준 제품과 같은 카테고리에서 그 성분군을 가진 제품 수가 적은 순서이고, 같으면 코드 순서다.
 */
public final class SharedIngredientGroupCandidates {

    private static final String GLYCERIN_CODE = "GLYCERIN";

    /** 주의로 따로 표시하는 성분군 코드의 끝이다. */
    public static final String CAUTION_CODE_SUFFIX = "_CAUTION";

    private static final int LIMIT = 2;

    private final List<Candidate> candidates;

    private SharedIngredientGroupCandidates(List<Candidate> candidates) {
        this.candidates = candidates;
    }

    public static SharedIngredientGroupCandidates rankByRarity(List<Candidate> eligibleGroups) {
        List<Candidate> rankedGroups = eligibleGroups.stream()
            .sorted(Comparator.comparingLong(Candidate::productCount).thenComparing(Candidate::code))
            .toList();
        return new SharedIngredientGroupCandidates(rankedGroups);
    }

    public static List<String> excludedCodes() {
        return Stream.concat(Stream.of(GLYCERIN_CODE), ExcludeCode.codeValues().stream()).toList();
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
