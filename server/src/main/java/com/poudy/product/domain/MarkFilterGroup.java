package com.poudy.product.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

public enum MarkFilterGroup {
    UV_FILTER_TYPE("자외선 차단 유형", List.of(Mark.MINERAL, Mark.ORGANIC, Mark.HYBRID)),
    WASHABILITY("세정 용이성", List.of(Mark.EASY_WASH)),
    WATER_RESISTANCE("내수성", List.of(Mark.WATERPROOF));

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

    public static List<MarkGroupOption> options(Map<String, Long> counts, List<Mark> selected) {
        return Arrays.stream(values()).map(
            group -> new MarkGroupOption(
                group.name(),
                group.displayName,
                group.marks.stream().filter(mark -> counts.getOrDefault(mark.code(), 0L) > 0 || selected.contains(mark))
                    .map(
                        mark -> new MarkGroupOption.Option(
                            mark.code(),
                            mark.displayName(),
                            counts.getOrDefault(mark.code(), 0L)
                        )
                    )
                    .toList()
            )
        ).filter(group -> !group.options().isEmpty()).toList();
    }
}
