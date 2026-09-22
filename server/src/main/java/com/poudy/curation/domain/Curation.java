package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "curation")
public class Curation {

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
    private boolean bannerVisible;

    @Column(name = "banner_thumbnail_image_url")
    private String bannerThumbnailImageUrl;

    @OneToMany
    @JoinColumn(name = "curation_id")
    @OrderBy("position")
    private List<CurationBlock> blocks;

    @Transient
    private CurationBlocks blockGroup;

    protected Curation() {
    }

    public Curation(
        Long id,
        String title,
        String description,
        CurationPublicationStatus publicationStatus,
        boolean bannerVisible,
        String bannerThumbnailImageUrl,
        List<CurationBlock> blocks
    ) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.publicationStatus = publicationStatus;
        this.bannerVisible = bannerVisible;
        this.bannerThumbnailImageUrl = bannerThumbnailImageUrl;
        this.blockGroup = CurationBlocks.from(blocks);
        this.blocks = List.copyOf(blocks);
        validate();
    }

    @PostLoad
    private void load() {
        this.blockGroup = CurationBlocks.from(blocks);
        validate();
    }

    private void validate() {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("큐레이션 ID는 양의 정수여야 합니다.");
        }
        requireNonBlank(title, "큐레이션 제목");
        requireNonBlank(description, "큐레이션 설명");
        Objects.requireNonNull(publicationStatus);
        if (bannerVisible && bannerThumbnailImageUrl == null) {
            throw new IllegalArgumentException("노출할 배너의 썸네일 URL이 필요합니다.");
        }
        if (bannerThumbnailImageUrl != null && bannerThumbnailImageUrl.isBlank()) {
            throw new IllegalArgumentException("배너 썸네일 URL은 비어 있을 수 없습니다.");
        }
        if (bannerVisible && !publicationStatus.isPublished()) {
            throw new IllegalArgumentException("미게시 큐레이션은 배너에 노출할 수 없습니다.");
        }
    }

    public Long id() {
        return id;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public String thumbnailImageUrl() {
        return bannerThumbnailImageUrl;
    }

    boolean isBannerVisible() {
        return publicationStatus.isPublished() && bannerVisible;
    }

    boolean isPublished() {
        return publicationStatus.isPublished();
    }

    List<CurationBlockContent> resolveBlocks(Products products) {
        return blockGroup.resolveContent(products);
    }

    private static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + "이 필요합니다.");
        }
    }
}
