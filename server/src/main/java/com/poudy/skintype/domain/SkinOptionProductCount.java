package com.poudy.skintype.domain;

public record SkinOptionProductCount(SkinChoice choice, long productCount) {

    public String displayName() {
        return choice.getDisplayName();
    }
}
