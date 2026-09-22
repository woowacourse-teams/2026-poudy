package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBanner;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationDetail;
import com.poudy.curation.domain.CurationPublicationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "curation")
public class CurationEntity {

    @Id
    private Long id;

    @Column(name = "position")
    private Integer position;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status")
    private CurationPublicationStatus publicationStatus;

    @Column(name = "banner_visible")
    private Boolean bannerVisible;

    @Column(name = "banner_thumbnail_image_url")
    private String bannerThumbnailImageUrl;

    protected CurationEntity() {
    }

    public Long id() {
        return id;
    }

    public Curation toDomain(List<CurationBlock> blocks) {
        return new Curation(
            id,
            title,
            description,
            publicationStatus,
            new CurationBanner(bannerVisible, bannerThumbnailImageUrl),
            CurationDetail.from(blocks)
        );
    }
}
