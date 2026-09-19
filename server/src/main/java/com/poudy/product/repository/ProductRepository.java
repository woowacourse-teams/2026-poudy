package com.poudy.product.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toCollection;
import static java.util.stream.Collectors.toList;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.Products;
import com.poudy.skintype.domain.SkinType;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Repository;

@Repository
public class ProductRepository {

    private final Products products;

    public ProductRepository(
        ProductJpaRepository productJpaRepository,
        BrandRepository brandRepository,
        CategoryRepository categoryRepository,
        IngredientRepository ingredientRepository,
        SnapshotReader snapshotReader
    ) {
        this.products = snapshotReader
            .read(() -> load(productJpaRepository, brandRepository, categoryRepository, ingredientRepository));
    }

    private static Products load(
        ProductJpaRepository productJpaRepository,
        BrandRepository brandRepository,
        CategoryRepository categoryRepository,
        IngredientRepository ingredientRepository
    ) {
        Brands brands = brandRepository.findAll();
        Categories categories = categoryRepository.findAll();
        IngredientCatalog ingredients = ingredientRepository.findAll();
        Map<Long, List<ProductVariant>> variants = productJpaRepository.findAllVariants().stream()
            .collect(groupingBy(ProductVariantEntity::productId, mapping(ProductVariantEntity::toDomain, toList())));
        Map<Long, List<Long>> ingredientIds = productJpaRepository.findAllIngredients().stream()
            .collect(
                groupingBy(ProductIngredientEntity::productId, mapping(ProductIngredientEntity::ingredientId, toList()))
            );
        Map<Long, Set<SkinType>> skinTypes = productJpaRepository.findAllSkinTypes().stream()
            .map(ProductSkinTypeEntity::id)
            .collect(
                groupingBy(
                    ProductSkinTypeId::productId,
                    mapping(ProductSkinTypeId::skinType, toCollection(() -> EnumSet.noneOf(SkinType.class)))
                )
            );
        return Products.from(
            productJpaRepository.findAllProducts().stream()
                .map(
                    product -> product.toDomain(
                        brandOf(product, brands),
                        categoryOf(product, categories),
                        ingredientsOf(product, ingredientIds.getOrDefault(product.id(), List.of()), ingredients),
                        variantsOf(product, variants.getOrDefault(product.id(), List.of())),
                        skinTypes.getOrDefault(product.id(), Set.of())
                    )
                )
                .toList()
        );
    }

    private static Brand brandOf(ProductEntity product, Brands brands) {
        return brands.findById(product.brandId()).orElseThrow(
            () -> new InfrastructureException(
                "제품이 존재하지 않는 브랜드 ID를 참조합니다. product_id=%d, brand_id=%d"
                    .formatted(product.id(), product.brandId())
            )
        );
    }

    private static Category categoryOf(ProductEntity product, Categories categories) {
        Category category = categories.findById(product.categoryId()).orElseThrow(
            () -> new InfrastructureException(
                "제품이 존재하지 않는 카테고리 ID를 참조합니다. product_id=%d, category_id=%d"
                    .formatted(product.id(), product.categoryId())
            )
        );
        if (category.isParent()) {
            throw new InfrastructureException(
                "제품은 소분류 카테고리 ID를 참조해야 합니다. product_id=%d, category_id=%d"
                    .formatted(product.id(), product.categoryId())
            );
        }
        return category;
    }

    private static Ingredients ingredientsOf(ProductEntity product, List<Long> ids, IngredientCatalog ingredients) {
        List<Long> unresolved = ids.stream()
            .filter(id -> ingredients.findById(id).isEmpty())
            .distinct()
            .toList();
        if (!unresolved.isEmpty()) {
            throw new InfrastructureException(
                "제품이 존재하지 않는 성분 ID를 참조합니다. product_id=%d, ingredient_ids=%s"
                    .formatted(product.id(), unresolved)
            );
        }
        return ingredients.resolveInOrder(ids);
    }

    private static ProductVariants variantsOf(ProductEntity product, List<ProductVariant> variants) {
        if (variants.isEmpty()) {
            throw new InfrastructureException(
                "제품 용량 옵션은 하나 이상이어야 합니다. product_id=%d".formatted(product.id())
            );
        }
        return new ProductVariants(variants);
    }

    public Products findAll() {
        return products;
    }

    public long countContaining(Long ingredientId) {
        return products.countContaining(ingredientId);
    }

    public Set<Long> containedIngredientIds() {
        return products.containedIngredientIds();
    }
}
