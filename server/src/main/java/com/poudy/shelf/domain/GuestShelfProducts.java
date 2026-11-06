package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class GuestShelfProducts {

    private final Map<Long, ShelfProduct> shelfProducts;

    private GuestShelfProducts(Map<Long, ShelfProduct> shelfProducts) {
        this.shelfProducts = shelfProducts;
    }

    public static GuestShelfProducts of(List<ShelfProduct> shelfProducts) {
        Map<Long, ShelfProduct> indexedShelfProducts = shelfProducts.stream()
            .collect(
                Collectors.toMap(
                    ShelfProduct::productId,
                    Function.identity(),
                    (first, second) -> {
                        throw new DuplicatedGuestShelfProductException();
                    },
                    LinkedHashMap::new
                )
            );
        return new GuestShelfProducts(indexedShelfProducts);
    }

    public List<Long> productIds() {
        return List.copyOf(shelfProducts.keySet());
    }

    public void validateRatingsFor(List<Product> catalogProducts) {
        catalogProducts.forEach(product -> shelfProducts.get(product.id()).validateRatingFor(product));
    }

    public List<ShelfProduct> items() {
        return List.copyOf(shelfProducts.values());
    }
}
