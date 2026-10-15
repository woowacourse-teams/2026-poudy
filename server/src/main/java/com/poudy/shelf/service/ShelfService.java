package com.poudy.shelf.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import com.poudy.shelf.domain.AnalyzedIngredient;
import com.poudy.shelf.domain.IngredientAnalysis;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.domain.ShelfProduct;
import com.poudy.shelf.domain.ShelfProductAlreadyExistsException;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.repository.ShelfProductRepository;
import com.poudy.skinfilter.repository.SkinFilterRepository;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShelfService {

    private static final int SAMPLE_INGREDIENT_LIMIT = 10;

    private final ShelfProductRepository shelfProductRepository;
    private final ProductRepository productRepository;
    private final SkinFilterRepository skinFilterRepository;

    public ShelfService(
        ShelfProductRepository shelfProductRepository,
        ProductRepository productRepository,
        SkinFilterRepository skinFilterRepository
    ) {
        this.shelfProductRepository = shelfProductRepository;
        this.productRepository = productRepository;
        this.skinFilterRepository = skinFilterRepository;
    }

    @Transactional(readOnly = true)
    public Shelf findShelf(long memberId) {
        List<ShelfProduct> shelfProducts = shelfProductRepository.findAll(memberId);
        List<Long> productIds = shelfProducts.stream()
            .map(ShelfProduct::productId)
            .toList();
        return Shelf.of(shelfProducts, productRepository.findAllById(productIds));
    }

    public List<Long> findProductIds(long memberId) {
        return shelfProductRepository.findProductIds(memberId);
    }

    @Transactional
    public ShelfItem add(long memberId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY));
        if (!shelfProductRepository.add(memberId, productId, usageStatus, rating)) {
            throw new ShelfProductAlreadyExistsException();
        }
        return shelfItemOf(memberId, product);
    }

    @Transactional
    public ShelfItem update(long memberId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        if (!shelfProductRepository.update(memberId, productId, usageStatus, rating)) {
            throw new ResourceNotFoundException(ErrorCode.SHELF_PRODUCT_NOT_FOUND);
        }
        return shelfItemOf(memberId, productRepository.findById(productId).orElseThrow());
    }

    @Transactional
    public void remove(long memberId, long productId) {
        shelfProductRepository.delete(memberId, productId);
    }

    @Transactional(readOnly = true)
    public IngredientAnalysis analyzeIngredients(long memberId) {
        List<ShelfItem> badItems = findShelf(memberId).ratedBad();
        List<Long> filterIngredientIds = skinFilterRepository.findIngredientIds(memberId);
        // TODO: 성분 분석 알고리즘은 아직 없다. 가장 최근에 안 맞았어요로 평가한 제품의 성분 앞부분을 임의로 돌려주고, 새로 생긴 성분은 짝수 번째로 둔다.
        List<AnalyzedIngredient> items = badItems.stream()
            .findFirst()
            .map(item -> sampleIngredients(item.product(), filterIngredientIds))
            .orElse(List.of());
        return new IngredientAnalysis(badItems.size(), items);
    }

    // 성분 분석 알고리즘 교체 시 제거
    private List<AnalyzedIngredient> sampleIngredients(Product product, List<Long> filterIngredientIds) {
        List<Ingredient> ingredients = product.ingredients().stream().limit(SAMPLE_INGREDIENT_LIMIT).toList();
        return IntStream.range(0, ingredients.size())
            .mapToObj(
                index -> new AnalyzedIngredient(
                    ingredients.get(index),
                    List.of(product),
                    filterIngredientIds.contains(ingredients.get(index).id()),
                    index % 2 == 0
                )
            )
            .toList();
    }

    private ShelfItem shelfItemOf(long memberId, Product product) {
        ShelfProduct shelfProduct = shelfProductRepository.find(memberId, product.id()).orElseThrow();
        return new ShelfItem(shelfProduct, product);
    }
}
