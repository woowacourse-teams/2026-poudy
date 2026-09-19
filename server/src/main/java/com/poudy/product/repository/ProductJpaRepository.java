package com.poudy.product.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface ProductJpaRepository extends Repository<ProductEntity, Long> {

    @Query("select product from ProductEntity product order by product.id")
    List<ProductEntity> findAllProducts();

    @Query("select variant from ProductVariantEntity variant order by variant.productId, variant.displayOrder")
    List<ProductVariantEntity> findAllVariants();

    @Query("select ingredient from ProductIngredientEntity ingredient"
        + " order by ingredient.id.productId, ingredient.id.componentOrder, ingredient.id.displayOrder")
    List<ProductIngredientEntity> findAllIngredients();

    @Query("select skinType from ProductSkinTypeEntity skinType")
    List<ProductSkinTypeEntity> findAllSkinTypes();
}
