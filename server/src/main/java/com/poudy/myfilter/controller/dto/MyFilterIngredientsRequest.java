package com.poudy.myfilter.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.hibernate.validator.constraints.UniqueElements;

public record MyFilterIngredientsRequest(
    @NotEmpty(message = "INVALID_REQUEST_BODY") @UniqueElements(message = "INVALID_REQUEST_BODY") @ArraySchema(schema = @Schema(implementation = Long.class, example = "3551"), uniqueItems = true, minItems = 1) List<@NotNull(message = "INVALID_REQUEST_BODY") Long> ingredientIds) {
}
