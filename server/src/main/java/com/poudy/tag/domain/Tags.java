package com.poudy.tag.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class Tags {

    private final List<Tag> values;
    private final Map<Long, Tag> byId;

    public Tags(List<Tag> values) {
        this.values = List.copyOf(values);
        this.byId = this.values.stream().collect(Collectors.toUnmodifiableMap(Tag::id, Function.identity()));
    }

    public List<Tag> values() {
        return values;
    }

    public Optional<Tag> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }
}
