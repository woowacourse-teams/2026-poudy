package com.poudy.feedback.repository;

import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.UUID;

@Embeddable
public class FeedbackImageValue {

    @Column(name = "image_id")
    private UUID imageId;

    @Column(name = "extension")
    private String extension;

    protected FeedbackImageValue() {
    }

    private FeedbackImageValue(FeedbackImage image) {
        this.imageId = image.id();
        this.extension = image.format().extension();
    }

    public static FeedbackImageValue from(FeedbackImage image) {
        return new FeedbackImageValue(image);
    }

    public FeedbackImage toDomain() {
        return new FeedbackImage(imageId, FeedbackImageFormat.fromExtension(extension));
    }
}
