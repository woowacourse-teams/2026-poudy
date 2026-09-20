package com.poudy.product.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;
import static java.util.stream.Collectors.toSet;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.skintype.domain.SkinType;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.springframework.stereotype.Component;

@Component
class ProductLoader {

    private final EntityManager entityManager;
    private final IngredientRepository ingredientRepository;

    ProductLoader(EntityManager entityManager, IngredientRepository ingredientRepository) {
        this.entityManager = entityManager;
        this.ingredientRepository = ingredientRepository;
    }

    List<Product> load(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<ProductEntity> products = query(
            "select p from ProductEntity p where p.id in :ids",
            ProductEntity.class,
            ids
        );
        Map<Long, Brand> brands = query(
            "select b from Brand b where b.id in :ids",
            Brand.class,
            products.stream().map(ProductEntity::brandId).distinct().toList()
        ).stream()
            .collect(toMap(Brand::id, Function.identity()));
        Map<Long, Category> categories = query(
            "select c from Category c where c.id in :ids",
            Category.class,
            products.stream().map(ProductEntity::categoryId).distinct().toList()
        ).stream()
            .collect(toMap(Category::id, Function.identity()));
        Map<Long, List<ProductVariant>> variants = query(
            "select v from ProductVariant v where v.productId in :ids order by v.productId, v.displayOrder",
            ProductVariant.class,
            ids
        ).stream().collect(groupingBy(ProductVariant::productId));
        List<ProductIngredientEntity> references = query(
            "select i from ProductIngredientEntity i where i.id.productId in :ids"
                + " order by i.id.productId, i.id.componentOrder, i.id.displayOrder",
            ProductIngredientEntity.class,
            ids
        );
        Map<Long, List<Long>> ingredientIds = references.stream()
            .collect(
                groupingBy(ProductIngredientEntity::productId, mapping(ProductIngredientEntity::ingredientId, toList()))
            );
        IngredientCatalog ingredients = ingredientRepository.findByIds(
            references.stream().map(ProductIngredientEntity::ingredientId).distinct().toList()
        );
        Map<Long, Set<SkinType>> skinTypes = query(
            "select s from ProductSkinTypeEntity s where s.id.productId in :ids",
            ProductSkinTypeEntity.class,
            ids
        )
            .stream().map(ProductSkinTypeEntity::id)
            .collect(groupingBy(ProductSkinTypeId::productId, mapping(ProductSkinTypeId::skinType, toSet())));
        Map<Long, Product> loaded = products.stream().collect(
            toMap(
                ProductEntity::id,
                p -> p.toDomain(
                    brands.get(p.brandId()),
                    categories.get(p.categoryId()),
                    ingredients.resolveInOrder(ingredientIds.getOrDefault(p.id(), List.of())),
                    new ProductVariants(variants.get(p.id())),
                    skinTypes.getOrDefault(p.id(), Set.of())
                )
            )
        );
        return ids.stream().map(loaded::get).toList();
    }

    private <T> List<T> query(String jpql, Class<T> type, List<Long> ids) {
        return entityManager.createQuery(jpql, type).setParameter("ids", ids).getResultList();
    }
}
