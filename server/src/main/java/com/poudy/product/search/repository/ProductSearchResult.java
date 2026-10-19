package com.poudy.product.search.repository;

/** 조회 결과와 필터 적용 전 검색 상태를 같은 SQL 실행에서 받는다. */
public record ProductSearchResult<T>(T value, boolean hasFullMatch, long searchTotal) {
}
