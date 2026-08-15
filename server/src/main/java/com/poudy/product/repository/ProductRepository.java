package com.poudy.product.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.Map;
import org.springframework.stereotype.Repository;

@Repository
public class ProductRepository {

    private static final String PRODUCTS_FILE_NAME = "products.json";

    private final Products products;

    public ProductRepository(JsonDataReader jsonDataReader) {
        this.products = new Products(jsonDataReader.readList(PRODUCTS_FILE_NAME, Product.class));
    }

    public long countContaining(Long ingredientId) {
        return products.countContaining(ingredientId);
    }

    public Map<Long, Long> countByCategoryId() {
        return products.countByCategoryId();
    }
}
