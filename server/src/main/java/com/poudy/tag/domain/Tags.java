package com.poudy.tag.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class Tags {

    private final Map<Long, Tag> tags;

    private Tags(Map<Long, Tag> tags) {
        this.tags = tags;
    }

    public static Tags from(List<Tag> tags) {
        Map<Long, Tag> indexedTags = new LinkedHashMap<>();
        for (Tag tag : tags) {
            if (indexedTags.putIfAbsent(tag.id(), tag) != null) {
                throw new IllegalArgumentException("태그 ID는 중복될 수 없습니다.");
            }
        }

        return new Tags(Collections.unmodifiableMap(indexedTags));
    }

    public Optional<Tag> findById(Long id) {
        return Optional.ofNullable(tags.get(id));
    }
}
