package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Transient;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Entity
@DiscriminatorValue("PRODUCTS_BY_FILTER")
final class CurationProductsByFilterBlock extends CurationBlock {

    @ElementCollection
    @CollectionTable(name = "curation_block_filter", joinColumns = @JoinColumn(name = "block_id"))
    @OrderColumn(name = "position")
    private List<CurationFilter> filterRows;

    @OneToMany
    @JoinColumn(name = "block_id", insertable = false, updatable = false)
    @OrderBy("position")
    private List<CurationProductMapping> productRows;

    @Transient
    private List<CurationFilter> filters;

    @Transient
    private List<CurationProductMapping> products;

    protected CurationProductsByFilterBlock() {
    }

    CurationProductsByFilterBlock(
        UUID id,
        int spacingTop,
        int spacingBottom,
        List<CurationFilter> filters,
        List<CurationProductMapping> products
    ) {
        super(id, spacingTop, spacingBottom);
        this.filters = List.copyOf(filters);
        this.products = List.copyOf(products);
        this.filterRows = this.filters;
        this.productRows = this.products;
        validateMappings();
    }

    @PostLoad
    private void load() {
        validateBlock();
        this.filters = List.copyOf(filterRows);
        this.products = List.copyOf(productRows);
        validateMappings();
    }

    private void validateMappings() {
        Set<UUID> filterIds = new HashSet<>();
        for (CurationFilter filter : filters) {
            if (!filterIds.add(filter.id())) {
                throw new IllegalArgumentException("블록의 필터 ID가 중복됐습니다.");
            }
        }
        if (filterIds.isEmpty()) {
            throw new IllegalArgumentException("필터 기준 제품 블록에는 필터가 필요합니다.");
        }

        Set<Long> productIds = new HashSet<>();
        for (CurationProductMapping product : products) {
            if (!productIds.add(product.productId()) || !filterIds.containsAll(product.filterIds())) {
                throw new IllegalArgumentException("블록의 제품 ID가 중복됐거나 다른 블록의 필터를 참조합니다.");
            }
        }
    }

    @Override
    Optional<CurationBlockContent> resolveContent(Products catalog) {
        List<CurationBlockContent.FilteredProduct> available = products.stream()
            .flatMap(
                mapping -> catalog.findById(mapping.productId())
                    .map(product -> new CurationBlockContent.FilteredProduct(product, mapping.filterIds()))
                    .stream()
            )
            .toList();
        if (available.isEmpty()) {
            return Optional.empty();
        }
        List<CurationFilter> availableFilters = filters.stream()
            .filter(filter -> available.stream().anyMatch(product -> product.belongsTo(filter.id()))).toList();
        if (availableFilters.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(
            new CurationBlockContent.ProductsByFilter(id(), spacingTop(), spacingBottom(), availableFilters, available)
        );
    }
}
