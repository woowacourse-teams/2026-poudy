package com.poudy.feedback.service;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.notification.FeedbackNotifier;
import com.poudy.feedback.repository.S3FeedbackRepository;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);

    private final S3FeedbackRepository feedbackRepository;
    private final FeedbackNotifier feedbackNotifier;
    private final Clock clock;

    public FeedbackService(
            S3FeedbackRepository feedbackRepository,
            FeedbackNotifier feedbackNotifier,
            Clock clock) {
        this.feedbackRepository = feedbackRepository;
        this.feedbackNotifier = feedbackNotifier;
        this.clock = clock;
    }

    public void submit(FeedbackType type, String content, String path) {
        Feedback feedback = Feedback.register(type, content, path, clock);
        feedbackRepository.save(feedback);

        try {
            feedbackNotifier.notify(feedback);
        } catch (RuntimeException exception) {
            log.error("Discord 의견 알림 전송에 실패했습니다. feedbackId={}", feedback.id());
        }
    }
}
