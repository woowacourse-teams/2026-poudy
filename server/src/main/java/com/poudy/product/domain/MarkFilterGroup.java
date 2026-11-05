package com.poudy.product.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

public enum MarkFilterGroup {
    UV_FILTER_TYPE("자외선 차단 유형", List.of(Mark.MINERAL, Mark.ORGANIC, Mark.HYBRID)),
    PRODUCT_FEATURE("제품 특성", List.of(Mark.EASY_WASH, Mark.WATERPROOF, Mark.DAISO));

    private final String displayName;
    private final List<Mark> marks;

    MarkFilterGroup(String displayName, List<Mark> marks) {
        this.displayName = displayName;
        this.marks = marks;
    }

    public static void requireFilterable(Mark mark) {
        if (Arrays.stream(values()).noneMatch(group -> group.contains(mark))) {
            throw new InvalidMarkFilterException();
        }
    }

    public boolean contains(Mark mark) {
        return marks.contains(mark);
    }

    public List<Mark> marks() {
        return marks;
    }

    public boolean requiresAllSelections() {
        return this == PRODUCT_FEATURE;
    }

    public static List<MarkGroupOption> options(Map<String, Long> counts, List<Mark> selected) {
        return Arrays.stream(values()).map(group -> group.optionGroup(counts, selected))
            .filter(group -> !group.options().isEmpty()).toList();
    }

    private MarkGroupOption optionGroup(Map<String, Long> counts, List<Mark> selected) {
        List<MarkGroupOption.Option> options = marks.stream()
            .filter(mark -> counts.getOrDefault(mark.code(), 0L) > 0 || selected.contains(mark))
            .map(
                mark -> new MarkGroupOption.Option(
                    mark.code(),
                    mark.displayName(),
                    counts.getOrDefault(mark.code(), 0L)
                )
            )
            .toList();
        return new MarkGroupOption(name(), displayName, options);
    }
}
