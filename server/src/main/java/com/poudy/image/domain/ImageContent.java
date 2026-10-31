package com.poudy.image.domain;

public record ImageContent(byte[] bytes, String contentType) {

    public ImageContent {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }
}
