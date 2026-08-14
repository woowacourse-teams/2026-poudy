package com.poudy.exception;

public enum ErrorCode {

    INVALID_QUERY_PARAMETER("요청 파라미터 값이 올바르지 않습니다."),
    CONFLICTING_INGREDIENT_FILTER("같은 성분을 포함과 제외에 함께 쓸 수 없습니다."),
    CONFLICTING_SEARCH_AND_FILTER("검색어와 필터 조건을 함께 쓸 수 없습니다."),
    UNSUPPORTED_REQUEST("지원하지 않는 요청입니다."),
    PRODUCT_NOT_FOUND("제품을 찾을 수 없습니다."),
    BRAND_NOT_FOUND("브랜드를 찾을 수 없습니다."),
    INGREDIENT_NOT_FOUND("성분을 찾을 수 없습니다."),
    ENDPOINT_NOT_FOUND("요청한 경로를 찾을 수 없습니다."),
    INTERNAL_SERVER_ERROR("서버에서 요청을 처리하지 못했습니다.");

    private final String message;

    ErrorCode(String message) {
        this.message = message;
    }

    public String message() {
        return message;
    }
}
