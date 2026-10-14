package com.poudy.curation.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** 제품 검색과 같은 조건을 저장하되 페이지, 정렬, 외부 주소는 보관하지 않는다. */
public final class CurationProductLinkQuery {

    public static final int MAX_VALUES = 100;
    private static final int MAX_KEYWORD_LENGTH = 100;

    private final String keyword;
    private final List<Long> brandIds;
    private final List<Long> categoryIds;
    private final List<Long> includeIngredientIds;
    private final List<String> includeGroupCodes;

    public CurationProductLinkQuery(
        String keyword,
        List<Long> brandIds,
        List<Long> categoryIds,
        List<Long> includeIngredientIds,
        List<String> includeGroupCodes
    ) {
        if (keyword != null && (keyword.length() > MAX_KEYWORD_LENGTH || new SearchKeyword(keyword).isEmpty())) {
            throw new IllegalArgumentException("제품 링크 검색어는 유효한 100자 이하 문자열이어야 합니다.");
        }
        List<Long> validatedBrandIds = ids(brandIds);
        List<Long> validatedCategoryIds = ids(categoryIds);
        List<Long> validatedIngredientIds = ids(includeIngredientIds);
        List<String> validatedGroupCodes = values(includeGroupCodes);
        if (validatedGroupCodes.stream().anyMatch(String::isBlank)) {
            throw new IllegalArgumentException("제품 링크 성분군 코드는 비어 있을 수 없습니다.");
        }
        if (keyword == null && validatedBrandIds.isEmpty() && validatedCategoryIds.isEmpty()
            && validatedIngredientIds.isEmpty() && validatedGroupCodes.isEmpty()) {
            throw new IllegalArgumentException("제품 링크에 검색 조건이 하나 이상 필요합니다.");
        }
        this.keyword = keyword;
        this.brandIds = validatedBrandIds;
        this.categoryIds = validatedCategoryIds;
        this.includeIngredientIds = validatedIngredientIds;
        this.includeGroupCodes = validatedGroupCodes;
    }

    // 저장소 조회, 운영 로그와 DTO 변환에 필요한 조건만 읽기 전용으로 제공한다.
    public String keyword() {
        return keyword;
    }

    public List<Long> brandIds() {
        return brandIds;
    }

    public List<Long> categoryIds() {
        return categoryIds;
    }

    public List<Long> includeIngredientIds() {
        return includeIngredientIds;
    }

    public List<String> includeGroupCodes() {
        return includeGroupCodes;
    }

    public boolean hasMissingReferences(
        Set<Long> brands,
        Set<Long> categories,
        Set<Long> ingredients,
        Set<String> groups
    ) {
        return !brands.containsAll(brandIds) || !categories.containsAll(categoryIds)
            || !ingredients.containsAll(includeIngredientIds) || !groups.containsAll(includeGroupCodes);
    }

    private static List<Long> ids(List<Long> source) {
        List<Long> ids = values(source);
        if (ids.stream().anyMatch(id -> id <= 0)) {
            throw new IllegalArgumentException("제품 링크 참조 ID는 양수여야 합니다.");
        }
        return ids;
    }

    private static <T> List<T> values(List<T> source) {
        List<T> values = List.copyOf(source);
        if (values.size() > MAX_VALUES || new HashSet<>(values).size() != values.size()) {
            throw new IllegalArgumentException("제품 링크 조건 배열은 중복 없이 100개 이하여야 합니다.");
        }
        return values;
    }
}
