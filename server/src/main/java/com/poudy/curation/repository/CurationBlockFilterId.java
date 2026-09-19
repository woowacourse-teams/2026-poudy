package com.poudy.curation.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record CurationBlockFilterId(
    @Column(name = "block_id") UUID blockId,
    @Column(name = "id") UUID filterId) implements Serializable {
}
