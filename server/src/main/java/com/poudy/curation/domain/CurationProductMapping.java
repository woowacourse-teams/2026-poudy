package com.poudy.curation.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.io.Serializable;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "curation_block_product")
@IdClass(CurationProductMapping.Key.class)
public class CurationProductMapping {

    @Id
    @Column(name = "block_id")
    private UUID blockId;

    @Id
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "position")
    private Integer position;

    @ElementCollection
    @CollectionTable(name = "curation_block_product_filter", joinColumns = {
            @JoinColumn(name = "block_id", referencedColumnName = "block_id"),
            @JoinColumn(name = "product_id", referencedColumnName = "product_id")
    })
    @OrderColumn(name = "position")
    @Column(name = "filter_id")
    private List<UUID> filterIdRows;

    @Transient
    private List<UUID> filterIds;

    protected CurationProductMapping() {
    }

    public CurationProductMapping(Long productId, List<UUID> filterIds) {
        this.productId = productId;
        this.filterIds = List.copyOf(filterIds);
        this.filterIdRows = this.filterIds;
        validate();
    }

    @PostLoad
    private void load() {
        this.filterIds = List.copyOf(filterIdRows);
        validate();
    }

    private void validate() {
        if (productId == null || productId <= 0) {
            throw new IllegalArgumentException("제품 ID는 양의 정수여야 합니다.");
        }
        if (filterIds.isEmpty()) {
            throw new IllegalArgumentException("필터 기준 제품에는 필터 ID가 필요합니다.");
        }
        if (new HashSet<>(filterIds).size() != filterIds.size()) {
            throw new IllegalArgumentException("제품의 필터 ID가 중복됐습니다.");
        }
    }

    public Long productId() {
        return productId;
    }

    public List<UUID> filterIds() {
        return filterIds;
    }

    public record Key(UUID blockId, Long productId) implements Serializable {
    }
}
