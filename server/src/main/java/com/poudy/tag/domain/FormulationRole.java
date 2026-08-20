package com.poudy.tag.domain;

public record FormulationRole(Long id, String code, String displayName) {

    public static FormulationRole from(Tag tag) {
        if (!tag.isOf(TagCategory.FUNCTION)) {
            throw new IllegalArgumentException("배합 목적은 FUNCTION 태그로 만들어야 합니다.");
        }
        return new FormulationRole(tag.id(), tag.code(), tag.name());
    }

    public boolean hasCode(String candidate) {
        return code.equals(candidate);
    }
}
