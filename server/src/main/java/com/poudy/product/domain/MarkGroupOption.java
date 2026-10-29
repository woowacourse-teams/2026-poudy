package com.poudy.product.domain;

import java.util.List;

public record MarkGroupOption(String code, String name, List<Option> options) {
    public MarkGroupOption {
        options = List.copyOf(options);
    }

    public record Option(String code, String name, long productCount) {
    }
}
