package com.poudy.common.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

@DisplayName("클라이언트 주소 해석")
class ClientAddressResolverTest {

    @Test
    @DisplayName("nginx가 전달한 실제 주소를 우선한다")
    void prefersRealIpHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.12");
        request.addHeader("X-Real-IP", " 203.0.113.7 ");

        assertThat(ClientAddressResolver.resolve(request)).isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("프록시 헤더가 없으면 직접 연결 주소를 사용한다")
    void fallsBackToRemoteAddress() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        assertThat(ClientAddressResolver.resolve(request)).isEqualTo("127.0.0.1");
    }
}
