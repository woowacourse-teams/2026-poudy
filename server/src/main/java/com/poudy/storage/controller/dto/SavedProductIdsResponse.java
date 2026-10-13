package com.poudy.storage.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SavedProductIdsResponse(@NotNull List<Long> productIds) {
}
