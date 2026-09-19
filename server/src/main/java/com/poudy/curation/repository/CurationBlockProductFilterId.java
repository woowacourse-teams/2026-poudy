package com.poudy.curation.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record CurationBlockProductFilterId(
    @Column(name = "block_id") UUID blockId,
    @Column(name = "product_id") Long productId,
    @Column(name = "filter_id") UUID filterId) implements Serializable {
}
