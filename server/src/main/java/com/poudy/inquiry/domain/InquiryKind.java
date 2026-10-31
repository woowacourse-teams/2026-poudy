package com.poudy.inquiry.domain;

public enum InquiryKind {
    FEEDBACK(true),
    PRODUCT_CORRECTION(true),
    PRODUCT_REGISTRATION(false);

    private final boolean hasImages;

    InquiryKind(boolean hasImages) {
        this.hasImages = hasImages;
    }

    public boolean hasImages() {
        return hasImages;
    }
}
