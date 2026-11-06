package com.poudy.shelf.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.product.domain.Product;
import java.util.Collection;
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
        Map<Long, Product> catalogProducts = products.stream()
            .collect(Collectors.toMap(Product::id, Function.identity()));
        RatedProducts ratedProducts = new RatedProducts(
            productsOf(shelfProducts, catalogProducts, ShelfProduct::isRatedBad),
            productsOf(shelfProducts, catalogProducts, ShelfProduct::isRatedGood)
        );
        SuspectIngredients suspectIngredients = ratedProducts.suspectIngredients(candidates);
        return new Shelf(
            shelfProducts.stream()
                .map(shelfProduct -> {
                    Product product = catalogProducts.get(shelfProduct.productId());
                    return new ShelfItem(shelfProduct, product, suspectIngredients.isContainedIn(product));
                })
                .toList(),
            suspectIngredients
        );
    }

    private static List<Product> productsOf(
        List<ShelfProduct> shelfProducts,
        Map<Long, Product> catalogProducts,
        Predicate<ShelfProduct> condition
    ) {
        return shelfProducts.stream()
            .filter(condition)
            .map(shelfProduct -> catalogProducts.get(shelfProduct.productId()))
            .toList();
    }

    public List<ShelfItem> items() {
        return items;
    }

    public ShelfItem item(long productId) {
        return items.stream()
            .filter(item -> item.holds(productId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("파우치에 없는 제품입니다. productId=" + productId));
    }

    public long count(ShelfTab tab) {
        return items.stream().filter(item -> item.belongsTo(tab)).count();
    }

    public IngredientAnalysis analyze(
        AnalysisSnapshot snapshot,
        Collection<Long> filterIngredientIds,
        ExcludeCodes excludeCodes
    ) {
        int badProductCount = (int) items.stream().filter(ShelfItem::isRatedBad).count();
        return IngredientAnalysis.of(badProductCount, suspectIngredients, snapshot, filterIngredientIds, excludeCodes);
    }

    public AnalysisSnapshot nextAnalysisSnapshot(AnalysisSnapshot snapshot) {
        return suspectIngredients.nextSnapshot(snapshot);
    }
}
