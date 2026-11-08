package com.poudy.routine.controller;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.poudy.common.analytics.PostHogCapture;
import com.poudy.routine.controller.dto.RoutineResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class RoutineAnalyticsTest {

    private final PostHogCapture capture = mock(PostHogCapture.class);
    private final RoutineAnalytics analytics = new RoutineAnalytics(capture);
    private final RoutineResponse routine = new RoutineResponse(12L, "개인 이름", "개인 메모", false, List.of(), List.of());

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void respectsConsentAndDnt() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        analytics.committed(7, "create", routine);
        request.addHeader("X-Poudy-Analytics", "1");
        request.addHeader("DNT", "1");
        analytics.committed(7, "create", routine);

        verifyNoInteractions(capture);
    }

    @Test
    void usesAuthenticatedMemberAndOmitsPrivateText() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Poudy-Analytics", "1");
        request.addHeader("X-POSTHOG-DISTINCT-ID", "member:999");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        analytics.committed(7, "create", routine);

        verify(capture).capture(
            eq("routine_change_committed"),
            eq("member:7"),
            argThat(
                properties -> properties.get("routine_id").equals(12L)
                    && properties.get("product_count").equals(0)
                    && !properties.containsKey("name") && !properties.containsKey("memo")
            )
        );
    }
}
