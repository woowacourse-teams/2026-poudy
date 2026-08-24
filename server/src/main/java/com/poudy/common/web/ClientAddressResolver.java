package com.poudy.common.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public final class ClientAddressResolver {

    private static final String REAL_IP_HEADER = "X-Real-IP";

    private ClientAddressResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        String realIp = request.getHeader(REAL_IP_HEADER);

        if (StringUtils.hasText(realIp)) {
            return realIp.strip();
        }
        return request.getRemoteAddr();
    }
}
