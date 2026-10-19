package com.poudy.product.search.indexing;

public record ProductSearchNameRow(
    long productId,
    String field,
    String kind,
    int version,
    String source,
    String normalized,
    String expression,
    int[] starts,
    int[] ends) {
}
