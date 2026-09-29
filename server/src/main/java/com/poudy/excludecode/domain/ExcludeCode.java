package com.poudy.excludecode.domain;

import java.util.Arrays;
import java.util.List;

public enum ExcludeCode {

    FRAGRANCE_ALLERGENS,
    DRYING_ALCOHOLS,
    HARSH_PRESERVATIVES,
    SULFATES,
    CYCLIC_SILICONES,
    SYNTHETIC_COLORANTS;

    public static List<String> codeValues() {
        return Arrays.stream(values()).map(ExcludeCode::value).toList();
    }

    public String value() {
        return name();
    }
}
