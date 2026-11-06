package com.poudy.youtube.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record YouTubeOrderRequest(@NotNull @Min(0) Integer displayOrder) {
}
