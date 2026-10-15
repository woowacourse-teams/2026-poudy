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
        List<ShelfItem> items = shelfProducts.stream()
            .map(shelfProduct -> new ShelfItem(shelfProduct, productsById.get(shelfProduct.productId())))
            .toList();
        return new Shelf(
            items,
            SuspectIngredients
                .of(productsOf(items, ShelfItem::isRatedBad), productsOf(items, ShelfItem::isRatedGood), candidates)
        );
    }

    private static List<Product> productsOf(List<ShelfItem> items, Predicate<ShelfItem> condition) {
        return items.stream().filter(condition).map(ShelfItem::product).toList();
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

    public SuspectIngredients suspectIngredients() {
        return suspectIngredients;
    }
}
