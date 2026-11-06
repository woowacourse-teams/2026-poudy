package com.poudy.shelf.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.product.domain.Product;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public final class GuestRatings {

    private final Map<Long, GuestRating> ratings;

    private GuestRatings(Map<Long, GuestRating> ratings) {
        this.ratings = ratings;
    }

    public static GuestRatings of(List<GuestRating> ratings) {
        Map<Long, GuestRating> indexedRatings = ratings.stream()
            .collect(
                Collectors.toMap(
                    GuestRating::productId,
                    Function.identity(),
                    (first, second) -> {
                        throw new DuplicatedGuestShelfProductException();
                    },
                    LinkedHashMap::new
                )
            );
        return new GuestRatings(indexedRatings);
    }

    public GuestRatings assuming(long productId, RatingPreference preference) {
        Map<Long, GuestRating> assumedRatings = new LinkedHashMap<>(ratings);
        assumedRatings.put(productId, new GuestRating(productId, preference));
        return new GuestRatings(assumedRatings);
    }

    public List<Long> productIds() {
        return List.copyOf(ratings.keySet());
    }

    public GuestIngredientAnalysis analyze(
        List<Product> catalogProducts,
        SuspectCandidates candidates,
        ExcludeCodes excludeCodes
    ) {
        Map<Long, Product> catalog = catalogProducts.stream()
            .collect(Collectors.toMap(Product::id, Function.identity()));
        List<Product> requestedProducts = ratings.keySet().stream().map(catalog::get).toList();
        RatedProducts preferences = new RatedProducts(
            productsRated(requestedProducts, GuestRating::isBad),
            productsRated(requestedProducts, GuestRating::isGood)
        );
        SuspectIngredients suspects = preferences.suspectIngredients(candidates);
        IngredientAnalysis analysis = IngredientAnalysis.of(
            badProductCount(),
            suspects,
            AnalysisSnapshot.empty(),
            List.of(),
            excludeCodes
        );
        List<Long> possiblyUnsuitableProductIds = requestedProducts.stream()
            .filter(suspects::isContainedIn)
            .map(Product::id)
            .toList();
        return new GuestIngredientAnalysis(analysis, possiblyUnsuitableProductIds);
    }

    private List<Product> productsRated(List<Product> requestedProducts, Predicate<GuestRating> preference) {
        return requestedProducts.stream()
            .filter(product -> preference.test(ratings.get(product.id())))
            .toList();
    }

    private int badProductCount() {
        return (int) ratings.values().stream().filter(GuestRating::isBad).count();
    }
}
