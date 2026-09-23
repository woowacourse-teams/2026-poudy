package com.poudy.feedback.domain;

import java.util.List;

public record FeedbackPage(List<Feedback> items, long totalElements) {

    public FeedbackPage {
        items = List.copyOf(items);
    }
}
