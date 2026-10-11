package com.poudy.security.session;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;

public interface SessionPolicy {

    LoginChannel channel();

    void start(HttpSession session);

    void refresh(HttpSession session, HttpServletResponse response);

    default void grace(HttpSession session, Duration grace) {
    }
}
