package com.poudy.routine.domain;

import com.poudy.product.domain.Product;
import java.util.List;

public record SharedRoutineView(
    long id,
    String name,
    String authorNickname,
    String authorProfileImageUrl,
    List<Product> morning,
    List<Product> evening) {

    public SharedRoutineView {
        morning = List.copyOf(morning);
        evening = List.copyOf(evening);
    }
}
