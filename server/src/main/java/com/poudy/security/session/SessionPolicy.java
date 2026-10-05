package com.poudy.security.session;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

public interface SessionPolicy {

    LoginChannel channel();

    void start(HttpSession session);

    void refresh(HttpSession session, HttpServletResponse response);
}
