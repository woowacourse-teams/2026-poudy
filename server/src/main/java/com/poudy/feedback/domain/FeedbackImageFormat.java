package com.poudy.feedback.domain;

public enum FeedbackImageFormat {

    JPEG("jpg", "image/jpeg"),
    PNG("png", "image/png");

    private final String extension;
    private final String contentType;

    FeedbackImageFormat(String extension, String contentType) {
        this.extension = extension;
        this.contentType = contentType;
    }

    public String extension() {
        return extension;
    }

    public String contentType() {
        return contentType;
    }

    public static FeedbackImageFormat fromExtension(String extension) {
        for (FeedbackImageFormat format : values()) {
            if (format.extension.equals(extension)) {
                return format;
            }
        }
        throw new IllegalArgumentException("지원하지 않는 의견 이미지 확장자입니다.");
    }
}
