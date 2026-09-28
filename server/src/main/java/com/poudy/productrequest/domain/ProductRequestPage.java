package com.poudy.productrequest.domain;

import java.util.List;

public record ProductRequestPage(List<ProductRequest> items, long totalElements) {

    public ProductRequestPage {
        items = List.copyOf(items);
    }
}
