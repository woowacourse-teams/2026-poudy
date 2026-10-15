package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public final class Shelf {

    private final List<ShelfItem> items;
    private final SuspectIngredients suspectIngredients;

    private Shelf(List<ShelfItem> items, SuspectIngredients suspectIngredients) {
        this.items = items;
        this.suspectIngredients = suspectIngredients;
    }

    public static Shelf of(List<ShelfProduct> shelfProducts, List<Product> products, SuspectCandidates candidates) {
        Map<Long, Product> productsById = products.stream()
            .collect(Collectors.toMap(Product::id, Function.identity()));
        SuspectIngredients suspectIngredients = SuspectIngredients.of(
            productsOf(shelfProducts, productsById, ShelfProduct::isRatedBad),
            productsOf(shelfProducts, productsById, ShelfProduct::isRatedGood),
            candidates
        );
        return new Shelf(
            shelfProducts.stream()
                .map(shelfProduct -> {
                    Product product = productsById.get(shelfProduct.productId());
                    return new ShelfItem(shelfProduct, product, suspectIngredients.isContainedIn(product));
                })
                .toList(),
            suspectIngredients
        );
    }

    private static List<Product> productsOf(
        List<ShelfProduct> shelfProducts,
        Map<Long, Product> productsById,
        Predicate<ShelfProduct> condition
    ) {
        return shelfProducts.stream()
            .filter(condition)
            .map(shelfProduct -> productsById.get(shelfProduct.productId()))
            .toList();
    }

    public List<ShelfItem> items() {
        return items;
    }

    public ShelfItem item(long productId) {
        return items.stream()
            .filter(item -> item.holds(productId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("선반에 없는 제품입니다. productId=" + productId));
    }

    public long count(ShelfTab tab) {
        return items.stream().filter(item -> item.belongsTo(tab)).count();
    }

    public List<ShelfItem> ratedBad() {
        return items.stream().filter(ShelfItem::isRatedBad).toList();
    }

    public SuspectIngredients suspectIngredients() {
        return suspectIngredients;
    }
}
