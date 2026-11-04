package com.poudy.product.controller.dto;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.product.domain.ProductComparisonSelection;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record ProductComparisonRequest(
    @NotNull @Size(min = 1, max = 3) @UniqueElements List<@NotNull @Positive Long> productIds,
    @Size(max = 3) Map<@NotNull @Positive Long, @NotNull @Positive Long> partIds) {

    public ProductComparisonRequest {
        partIds = Objects.requireNonNullElse(partIds, Map.of());
    }

    public List<ProductComparisonSelection> toSelections() {
        if (!productIds.containsAll(partIds.keySet())) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }
        return productIds.stream().map(id -> new ProductComparisonSelection(id, partIds.get(id))).toList();
    }
}
