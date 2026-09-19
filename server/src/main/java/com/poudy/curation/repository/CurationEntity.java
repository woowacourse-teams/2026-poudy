package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBanner;
import com.poudy.curation.domain.CurationBlock;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(name = "banner_title")
    private String bannerTitle;

    @Column(name = "banner_description")
    private String bannerDescription;

    @Column(name = "banner_thumbnail_image_url")
    private String bannerThumbnailImageUrl;

    @Column(name = "detail_title")
    private String detailTitle;

    @Column(name = "detail_description")
    private String detailDescription;

    protected CurationEntity() {
    }

    public Long id() {
        return id;
    }

    public Curation toDomain(List<CurationBlock> blocks) {
        return new Curation(
            id,
            new CurationBanner(bannerTitle, bannerDescription, bannerThumbnailImageUrl),
            detailTitle,
            detailDescription,
            blocks
        );
    }
}
