package com.poudy.product.repository;

import com.poudy.product.domain.Product;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface ProductJpaRepository extends Repository<Product, Long> {

    @Query("select product from Product product order by product.id")
    List<Product> findAllProducts();
}
