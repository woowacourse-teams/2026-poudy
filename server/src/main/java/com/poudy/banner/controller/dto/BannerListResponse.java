package com.poudy.banner.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BannerListResponse(@NotNull List<BannerResponse> items) {
}
