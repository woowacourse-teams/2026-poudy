package com.poudy.feedback.notification;

import com.poudy.feedback.domain.Feedback;

public interface FeedbackNotifier {

    void notify(Feedback feedback);
}
