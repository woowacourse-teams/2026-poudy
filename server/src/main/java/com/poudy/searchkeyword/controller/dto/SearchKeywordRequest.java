package com.poudy.searchkeyword.controller.dto;

import com.poudy.search.validation.ValidSearchKeyword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record SearchKeywordRequest(
    @NotBlank(message = "INVALID_REQUEST_BODY") @ValidSearchKeyword(message = "INVALID_REQUEST_BODY") @Schema(example = "토너", maxLength = ValidSearchKeyword.MAX_LENGTH) String keyword) {
}
