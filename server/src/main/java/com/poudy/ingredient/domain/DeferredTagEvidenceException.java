package com.poudy.ingredient.domain;

public class DeferredTagEvidenceException extends IllegalArgumentException {

    public DeferredTagEvidenceException() {
        super("근거가 보류된 태그는 매핑할 수 없습니다.");
    }
}
