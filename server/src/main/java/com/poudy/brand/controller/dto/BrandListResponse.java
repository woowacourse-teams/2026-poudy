package com.poudy.brand.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandListResponse(@NotNull List<BrandResponse> items) {
}
