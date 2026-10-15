package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class Shelf {

    private final List<ShelfItem> items;

    private Shelf(List<ShelfItem> items) {
        this.items = items;
    }

    public static Shelf of(List<ShelfProduct> shelfProducts, List<Product> products) {
        Map<Long, Product> productsById = products.stream()
            .collect(Collectors.toMap(Product::id, Function.identity()));
        return new Shelf(
            shelfProducts.stream()
                .map(shelfProduct -> new ShelfItem(shelfProduct, productsById.get(shelfProduct.productId())))
                .toList()
        );
    }

    public List<ShelfItem> items() {
        return items;
    }

    public long count(ShelfTab tab) {
        return items.stream().filter(item -> item.belongsTo(tab)).count();
    }

    public List<ShelfItem> ratedBad() {
        return items.stream().filter(ShelfItem::isRatedBad).toList();
    }
}
