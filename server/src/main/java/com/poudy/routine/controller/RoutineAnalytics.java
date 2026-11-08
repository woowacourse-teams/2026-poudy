package com.poudy.routine.controller;

import com.poudy.common.analytics.PostHogCapture;
import com.poudy.routine.controller.dto.RoutineResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class RoutineAnalytics {

    private final PostHogCapture capture;

    public RoutineAnalytics(PostHogCapture capture) {
        this.capture = capture;
    }

    public void committed(long memberId, String action, RoutineResponse routine) {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return;
        }
        HttpServletRequest request = attributes.getRequest();
        if (!"1".equals(request.getHeader("X-Poudy-Analytics")) || "1".equals(request.getHeader("DNT"))) {
            return;
        }
        Map<String, Object> properties = new HashMap<>(
            Map.of(
                "action",
                action,
                "routine_id",
                routine.id(),
                "is_public",
                routine.isPublic(),
                "product_count",
                routine.morning().size() + routine.evening().size(),
                "morning_count",
                routine.morning().size(),
                "evening_count",
                routine.evening().size(),
                "auth_state",
                "signed_in"
            )
        );
        String session = request.getHeader("X-POSTHOG-SESSION-ID");
        if (session != null && session.length() <= 100) {
            properties.put("$session_id", session);
        }
        capture.capture("routine_change_committed", "member:" + memberId, properties);
    }
}
