package com.poudy.feedback.repository;

import java.util.UUID;

public record ImageOwner(UUID imageId, UUID feedbackId) {
}
