package com.poudy.feedback.domain.image;

public record ProcessedImage(FeedbackImageFormat format, byte[] bytes) {

    public ProcessedImage {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }
}
