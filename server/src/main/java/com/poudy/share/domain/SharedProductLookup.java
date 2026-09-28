package com.poudy.share.domain;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductNameMatch;
import java.util.List;

public interface SharedProductLookup {
    List<ProductNameMatch> findByName(String keyword, Long brandId);

    List<Product> findByBrand(Long brandId);

}
