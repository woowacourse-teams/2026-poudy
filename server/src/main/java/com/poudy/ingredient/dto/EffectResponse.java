package com.poudy.ingredient.dto;

import jakarta.validation.constraints.NotNull;

public record EffectResponse(@NotNull Long id, @NotNull String name, @NotNull String color) {
}
