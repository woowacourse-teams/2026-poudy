package com.poudy.curation.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record CurationBlockProductId(
    @Column(name = "block_id") UUID blockId,
    @Column(name = "product_id") Long productId) implements Serializable {
}
