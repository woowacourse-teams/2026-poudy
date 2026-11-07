package com.poudy.routine.domain;

import com.poudy.product.domain.Product;
import java.util.List;

public record OwnedRoutineView(
    long id,
    String name,
    boolean isPublic,
    long likeCount,
    long commentCount,
    List<Product> morning,
    List<Product> evening) {

    public OwnedRoutineView {
        morning = List.copyOf(morning);
        evening = List.copyOf(evening);
    }
}
