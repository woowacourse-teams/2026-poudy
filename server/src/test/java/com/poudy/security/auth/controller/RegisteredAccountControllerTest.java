package com.poudy.security.auth.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.RegisteredAccount;
import com.poudy.security.session.LoginSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("이미 가입한 계정 조회 API")
class RegisteredAccountControllerTest {

    private static final String PATH = "/api/auth/registered-account";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LoginSession loginSession;

    @Test
    @DisplayName("이메일 중복으로 로그인에 실패한 세션이면 그 이메일과 먼저 가입한 제공자를 몇 번이든 알려 준다")
    void findsRegisteredAccount() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.holdRegisteredAccount(
            new RegisteredAccount(OAuthProvider.KAKAO, "user@example.com"),
            request,
            new MockHttpServletResponse()
        );
        MockHttpSession session = (MockHttpSession) request.getSession();

        mockMvc.perform(get(PATH).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.provider").value("KAKAO"))
            .andExpect(jsonPath("$.email").value("user@example.com"));
        mockMvc.perform(get(PATH).session(session))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("이메일 중복으로 실패한 로그인이 없으면 404로 거절한다")
    void rejectsWithoutFailedLogin() throws Exception {
        mockMvc.perform(get(PATH))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("REGISTERED_ACCOUNT_NOT_FOUND"));
    }
}
