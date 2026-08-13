package com.poudy.product.dto;

import jakarta.validation.constraints.NotNull;

public record ProductCountResponse(@NotNull Long count) {
}
