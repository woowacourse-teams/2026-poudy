package com.poudy.common.dto;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record KeywordRequest(@NotBlank @Schema(description = "검색어") String keyword) {

    public KeywordRequest {
        if (keyword == null || keyword.isBlank()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }
    }
}
