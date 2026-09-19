package com.poudy.curation.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "curation_block_product_filter")
public class CurationBlockProductFilterEntity {

    @EmbeddedId
    private CurationBlockProductFilterId id;

    @Column(name = "position")
    private Integer position;

    protected CurationBlockProductFilterEntity() {
    }

    public CurationBlockProductFilterId id() {
        return id;
    }
}
