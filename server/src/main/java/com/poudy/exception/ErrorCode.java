package com.poudy.exception;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum ErrorCode {

    INVALID_QUERY_PARAMETER("요청 파라미터 값이 올바르지 않습니다."),
    INVALID_REQUEST_BODY("요청 본문 값이 올바르지 않습니다."),
    INVALID_FEEDBACK_IMAGE("첨부 이미지가 올바르지 않습니다."),
    INVALID_FEEDBACK_IMAGE_ID("사용할 수 없는 첨부 이미지 ID입니다."),
    CONFLICTING_INGREDIENT_FILTER("같은 성분을 포함과 제외에 함께 쓸 수 없습니다."),
    PAYLOAD_TOO_LARGE("요청 본문 크기가 허용 범위를 초과했습니다."),
    TOO_MANY_REQUESTS("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    UNSUPPORTED_REQUEST("지원하지 않는 요청입니다."),
    PRODUCT_NOT_FOUND("제품을 찾을 수 없습니다."),
    BRAND_NOT_FOUND("브랜드를 찾을 수 없습니다."),
    INGREDIENT_NOT_FOUND("성분을 찾을 수 없습니다."),
    ENDPOINT_NOT_FOUND("요청한 경로를 찾을 수 없습니다."),
    INTERNAL_SERVER_ERROR("서버에서 요청을 처리하지 못했습니다.");

    private static final Map<String, ErrorCode> BY_NAME = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(Enum::name, Function.identity()));

    private final String message;

    ErrorCode(String message) {
        this.message = message;
    }

    public static Optional<ErrorCode> from(String name) {
        return Optional.ofNullable(name).map(BY_NAME::get);
    }

    public String message() {
        return message;
    }
}
