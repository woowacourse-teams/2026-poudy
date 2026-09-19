package com.poudy.curation.repository;

import com.poudy.curation.domain.CurationFilter;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "curation_block_filter")
public class CurationBlockFilterEntity {

    @EmbeddedId
    private CurationBlockFilterId id;

    @Column(name = "position")
    private Integer position;

    @Column(name = "label")
    private String label;

    protected CurationBlockFilterEntity() {
    }

    public UUID blockId() {
        return id.blockId();
    }

    public CurationFilter toDomain() {
        return new CurationFilter(id.filterId(), label);
    }
}
