package com.poudy.image.domain;

public record ProcessedImage(ImageFormat format, byte[] bytes) {

    public ProcessedImage {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }
}
