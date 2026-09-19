package com.poudy.curation.repository;

import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationFilter;
import com.poudy.curation.domain.CurationProductMapping;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "curation_block")
public class CurationBlockEntity {

    @Id
    private UUID id;

    @Column(name = "curation_id")
    private Long curationId;

    @Column(name = "position")
    private Integer position;

    @Column(name = "type")
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private CurationBlock.Status status;

    @Column(name = "spacing_top")
    private Integer spacingTop;

    @Column(name = "spacing_bottom")
    private Integer spacingBottom;

    @Column(name = "image_url")
    private String imageUrl;

    protected CurationBlockEntity() {
    }

    public UUID id() {
        return id;
    }

    public Long curationId() {
        return curationId;
    }

    public CurationBlock toDomain(
        List<CurationFilter> filters,
        List<Long> productIds,
        Map<Long, List<UUID>> productFilterIds
    ) {
        return switch (type) {
            case "IMAGE" -> CurationBlock.image(id, status, spacingTop, spacingBottom, imageUrl);
            case "PRODUCTS" -> CurationBlock.products(id, status, spacingTop, spacingBottom, productIds);
            case "PRODUCTS_BY_FILTER" -> CurationBlock.productsByFilter(
                id,
                status,
                spacingTop,
                spacingBottom,
                filters,
                productIds.stream()
                    .map(
                        productId -> new CurationProductMapping(
                            productId,
                            productFilterIds.getOrDefault(productId, List.of())
                        )
                    )
                    .toList()
            );
            default -> throw new IllegalArgumentException("지원하지 않는 큐레이션 블록 타입입니다: " + type);
        };
    }
}
