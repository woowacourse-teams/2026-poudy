package com.poudy.feedback.repository;

import com.poudy.feedback.domain.FeedbackImage;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.UUID;

@Embeddable
public class FeedbackImageValue {

    @Column(name = "image_id")
    private UUID imageId;

    protected FeedbackImageValue() {
    }

    private FeedbackImageValue(FeedbackImage image) {
        this.imageId = image.id();
    }

    public static FeedbackImageValue from(FeedbackImage image) {
        return new FeedbackImageValue(image);
    }

    public UUID imageId() {
        return imageId;
    }
}
