package com.poudy.admin.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "poudy.admin.username=admin-test",
        "poudy.admin.password=secret-test"
})
@AutoConfigureMockMvc
@DisplayName("관리자 로그인 API")
class AdminControllerTest {

    private static final String PATH = "/api/admin/login";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("설정된 아이디와 비밀번호가 일치하면 200을 반환한다")
    void returnsOkForMatchingCredentials() throws Exception {
        mockMvc.perform(
            post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"admin-test","password":"secret-test"}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(content().string(""));
    }

    @Test
    @DisplayName("아이디가 일치하지 않으면 401을 반환한다")
    void returnsUnauthorizedForMismatchingUsername() throws Exception {
        mockMvc.perform(
            post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"other-user","password":"secret-test"}
                    """)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(content().string(""));
    }

    @Test
    @DisplayName("비밀번호가 일치하지 않으면 401을 반환한다")
    void returnsUnauthorizedForMismatchingPassword() throws Exception {
        mockMvc.perform(
            post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"admin-test","password":"wrong-secret"}
                    """)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(content().string(""));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidCredentials")
    @DisplayName("한쪽 자격 증명이 비어 있으면 INVALID_REQUEST_BODY로 400을 반환한다")
    void rejectsInvalidCredentialField(String caseName, String body) throws Exception {
        mockMvc.perform(
            post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    private static Stream<Arguments> invalidCredentials() {
        return Stream.of(
            Arguments.of("username blank", "{\"username\":\" \",\"password\":\"secret-test\"}"),
            Arguments.of("username null", "{\"username\":null,\"password\":\"secret-test\"}"),
            Arguments.of("username missing", "{\"password\":\"secret-test\"}"),
            Arguments.of("password blank", "{\"username\":\"admin-test\",\"password\":\" \"}"),
            Arguments.of("password null", "{\"username\":\"admin-test\",\"password\":null}"),
            Arguments.of("password missing", "{\"username\":\"admin-test\"}")
        );
    }
}
