package com.poudy.ingredientgroup.domain;

import java.util.List;

public record IngredientGroupDetail(
    String code,
    String name,
    String englishName,
    String description,
    List<IngredientGroupMember> members) {

    public IngredientGroupDetail {
        members = List.copyOf(members);
    }
}
