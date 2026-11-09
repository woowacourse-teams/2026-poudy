package com.poudy.skintype.domain;

public record SkinTypeProductCount(SkinType skinType, long productCount) {

    public String displayName() {
        return skinType.getDisplayName();
    }
}
