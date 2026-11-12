package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.List;
import java.util.Set;

public enum ContactLevel {

    FACE_LEAVE_ON,
    BRIEF_OR_OTHER_AREA;

    private static final Set<Long> BRIEF_OR_OTHER_AREA_PARENT_CATEGORY_IDS = Set.of(10L, 26L, 33L, 66L);
    private static final Set<Long> LEFT_ON_FACE_CLEANSING_CATEGORY_IDS = Set.of(19L, 21L);

    public static ContactLevel of(Product product) {
        if (LEFT_ON_FACE_CLEANSING_CATEGORY_IDS.stream().anyMatch(product::belongsToCategory)) {
            return FACE_LEAVE_ON;
        }
        if (BRIEF_OR_OTHER_AREA_PARENT_CATEGORY_IDS.stream().anyMatch(product::belongsToCategory)) {
            return BRIEF_OR_OTHER_AREA;
        }
        return FACE_LEAVE_ON;
    }

    public static ContactLevel strongestOf(List<Product> products) {
        if (products.stream().anyMatch(product -> of(product) == FACE_LEAVE_ON)) {
            return FACE_LEAVE_ON;
        }
        return BRIEF_OR_OTHER_AREA;
    }

    public boolean covers(ContactLevel other) {
        return this == FACE_LEAVE_ON || other == BRIEF_OR_OTHER_AREA;
    }
}
