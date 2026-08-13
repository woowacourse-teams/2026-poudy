package com.poudy.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record PaginationRequest(
        @Schema(description = "조회할 페이지 번호 (0부터 시작)", defaultValue = DEFAULT_PAGE_TEXT) @Min(0) Integer page,
        @Schema(description = "페이지당 항목 개수", defaultValue = DEFAULT_SIZE_TEXT) @Min(1) @Max(MAX_SIZE) Integer size) {

    public static final int MAX_SIZE = 100;
    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_SIZE = 20;
    public static final String DEFAULT_PAGE_TEXT = "" + DEFAULT_PAGE;
    public static final String DEFAULT_SIZE_TEXT = "" + DEFAULT_SIZE;

    public PaginationRequest {
        page = page == null ? DEFAULT_PAGE : page;
        size = size == null ? DEFAULT_SIZE : size;
    }
}
