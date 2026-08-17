package com.poudy.offline.source;

import java.time.LocalDate;

public record EvidenceAssessment(
        String purpose,
        String authorityGrade,
        String directnessGrade,
        StableId independenceGroup,
        String reviewer,
        LocalDate reviewedDate,
        ValueOrMissing<String> limitationNote) {

    public EvidenceAssessment {
        purpose = requireNonBlank(purpose, "근거 평가 목적");
        authorityGrade = requireNonBlank(authorityGrade, "원천 권위 등급");
        directnessGrade = requireNonBlank(directnessGrade, "근거 직접성 등급");
        if (independenceGroup == null) {
            throw new IllegalArgumentException("독립 근거 그룹 식별자가 필요합니다.");
        }
        reviewer = requireNonBlank(reviewer, "근거 검수자");
        if (reviewedDate == null) {
            throw new IllegalArgumentException("근거 검수일이 필요합니다.");
        }
        if (limitationNote == null) {
            throw new IllegalArgumentException("근거 한계 또는 결측 이유가 필요합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        return value;
    }
}
