package com.poudy.product.domain;

import java.util.ArrayList;
import java.util.List;

public final class ProductMarks {
    private final List<Mark> marks;

    public ProductMarks(String rootCategoryName, List<Mark> marks) {
        if (marks.stream().anyMatch(mark -> !mark.isAllowedIn(rootCategoryName))) {
            throw new IllegalArgumentException("제품 카테고리에 허용되지 않은 마크입니다.");
        }
        if (marks.stream().filter(Mark::isUvFilterType).count() > 1) {
            throw new IllegalArgumentException("자외선 차단 유형은 제품당 하나만 부여할 수 있습니다.");
        }
        if (marks.stream().distinct().count() != marks.size()) {
            throw new IllegalArgumentException("동일 마크를 중복 부여할 수 없습니다.");
        }
        this.marks = List.copyOf(marks);
    }

    public static ProductMarks adding(String rootCategoryName, List<Mark> currentMarks, Mark addedMark) {
        List<Mark> updatedMarks = new ArrayList<>(currentMarks);
        updatedMarks.add(addedMark);
        return new ProductMarks(rootCategoryName, updatedMarks);
    }

    public List<String> codes() {
        return marks.stream().map(Mark::code).toList();
    }
}
