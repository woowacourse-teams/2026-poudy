package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class Curation {
    private final Long id;
    private final CurationBanner banner;
    private final String title;
    private final String description;
    private final List<CurationBlock> blocks;

    public Curation(
        Long id,
        CurationBanner banner,
        String title,
        String description,
        List<CurationBlock> blocks
    ) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("큐레이션 ID는 양의 정수여야 합니다.");
        }
        this.id = id;
        this.banner = Objects.requireNonNull(banner);
        this.title = requireNonBlank(title, "큐레이션 상세 제목");
        this.description = requireNonBlank(description, "큐레이션 상세 설명");
        this.blocks = List.copyOf(blocks);
        Set<UUID> blockIds = new HashSet<>();
        for (CurationBlock block : blocks) {
            if (!blockIds.add(block.id())) {
                throw new IllegalArgumentException("큐레이션의 블록 ID가 중복됐습니다.");
            }
        }
    }

    public Long id() {
        return id;
    }

    public CurationBanner banner() {
        return banner;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public List<Long> productIds() {
        return blocks.stream().flatMap(block -> block.productIds().stream()).distinct().toList();
    }

    List<CurationBlockContent> visibleBlocks(Products products) {
        return blocks.stream().flatMap(block -> block.visibleContent(products).stream()).toList();
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        return value;
    }

}
