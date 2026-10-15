package com.poudy.wishlist.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record WishlistProductIdsResponse(@NotNull List<Long> productIds) {
}
