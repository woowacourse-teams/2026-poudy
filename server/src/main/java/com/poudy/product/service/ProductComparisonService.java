package com.poudy.product.service;

import static java.util.stream.Collectors.toMap;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductComparison;
import com.poudy.product.domain.ProductComparisonFilterStatus;
import com.poudy.product.domain.ProductComparisonItem;
import com.poudy.product.domain.ProductComparisonSelection;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductComparisonService {

    private final ProductRepository products;
    private final ExcludeCodeRepository excludeCodes;
    private final MyFilterRepository myFilters;

    public ProductComparisonService(
        ProductRepository products,
        ExcludeCodeRepository excludeCodes,
        MyFilterRepository myFilters
    ) {
        this.products = products;
        this.excludeCodes = excludeCodes;
        this.myFilters = myFilters;
    }

    public ProductComparison compare(List<ProductComparisonSelection> selections, Long userId) {
        List<Long> productIds = selections.stream().map(ProductComparisonSelection::productId).toList();
        Map<Long, Product> found = products.findAllById(productIds).stream().collect(toMap(Product::id, p -> p));
        if (!found.keySet().containsAll(productIds)) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        List<ProductPart> parts = selections.stream()
            .map(selection -> selectPart(found.get(selection.productId()), selection.partId()))
            .toList();
        ExcludeCodes cautions = excludeCodes.findAll();
        List<Long> filterIngredientIds = userId == null ? List.of() : myFilters.findIngredientIds(userId);
        List<ProductComparisonItem> items = java.util.stream.IntStream.range(0, selections.size())
            .mapToObj(
                index -> ProductComparisonItem.of(
                    found.get(selections.get(index).productId()),
                    parts.get(index),
                    cautions,
                    filterIngredientIds
                )
            )
            .toList();
        return new ProductComparison(filterStatus(userId, filterIngredientIds), items);
    }

    private ProductPart selectPart(Product product, Long partId) {
        return product.selectPart(partId).orElseGet(() -> {
            if (partId != null) {
                throw new ResourceNotFoundException(ErrorCode.PRODUCT_PART_NOT_FOUND);
            }
            return null;
        });
    }

    private ProductComparisonFilterStatus filterStatus(Long userId, List<Long> ingredientIds) {
        if (userId == null) {
            return ProductComparisonFilterStatus.GUEST;
        }
        return ingredientIds.isEmpty()
            ? ProductComparisonFilterStatus.EMPTY
            : ProductComparisonFilterStatus.NOT_EMPTY;
    }
}
