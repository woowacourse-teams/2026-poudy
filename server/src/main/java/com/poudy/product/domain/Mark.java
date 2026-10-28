package com.poudy.product.domain;

import java.util.Arrays;

public enum Mark {
    MINERAL("MINERAL", "무기자차", false),
    ORGANIC("ORGANIC", "유기자차", false),
    HYBRID("HYBRID", "혼합자차", false),
    EASY_WASH("EASY_WASH", "이지워시", false),
    WATERPROOF("WATERPROOF", "워터프루프", false),
    DAISO("DAISO", "다이소", true);

    private final String code;
    private final String displayName;
    private final boolean visibleInList;

    Mark(String code, String displayName, boolean visibleInList) {
        this.code = code;
        this.displayName = displayName;
        this.visibleInList = visibleInList;
    }

    public static Mark fromCode(String code) {
        return Arrays.stream(values()).filter(mark -> mark.code.equals(code)).findFirst()
            .orElseThrow(InvalidMarkFilterException::new);
    }

    public String code() {
        return code;
    }

    public String displayName() {
        return displayName;
    }

    public boolean isVisibleInProductList() {
        return visibleInList;
    }

    public boolean isUvFilterType() {
        return this == MINERAL || this == ORGANIC || this == HYBRID;
    }

    public boolean isAllowedIn(String rootCategoryName) {
        return this == DAISO || "선케어".equals(rootCategoryName);
    }
}
