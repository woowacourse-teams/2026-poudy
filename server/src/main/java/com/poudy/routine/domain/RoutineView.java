package com.poudy.routine.domain;

import com.poudy.product.domain.Product;
import java.util.List;

public record RoutineView(
    long id,
    String name,
    String memo,
    boolean isPublic,
    List<Product> morning,
    List<Product> evening) {

    public RoutineView {
        morning = List.copyOf(morning);
        evening = List.copyOf(evening);
    }
}
