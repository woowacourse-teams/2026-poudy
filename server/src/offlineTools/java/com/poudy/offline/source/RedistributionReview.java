package com.poudy.offline.source;

import java.time.LocalDate;

public record RedistributionReview(
        String evidenceText,
        String reviewer,
        LocalDate reviewedDate) {

    public RedistributionReview {
        evidenceText = requireNonBlank(evidenceText, "재배포 판정 근거 문구");
        reviewer = requireNonBlank(reviewer, "재배포 판정 검수자");
        if (reviewedDate == null) {
            throw new IllegalArgumentException("재배포 판정 검수일이 필요합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "가 필요합니다.");
        }

        return value;
    }
}
