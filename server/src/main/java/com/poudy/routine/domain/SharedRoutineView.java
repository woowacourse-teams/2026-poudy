package com.poudy.routine.domain;

import com.poudy.product.domain.Product;
import com.poudy.skintype.domain.SkinType;
import java.util.List;

public record SharedRoutineView(
    long id,
    String name,
    String memo,
    String authorNickname,
    String authorProfileImageUrl,
    SkinType authorSkinType,
    long likeCount,
    long commentCount,
    List<Product> morning,
    List<Product> evening) {

    public SharedRoutineView {
        morning = List.copyOf(morning);
        evening = List.copyOf(evening);
    }
}
