package com.poudy.security.auth.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
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
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "poudy.admin.username=admin-test",
        "poudy.admin.password=secret-test"
})
@AutoConfigureMockMvc
@DisplayName("관리자 로그인 API")
class AdminControllerTest {

    private static final String PATH = "/api/admin/login";
    private static final String ADMIN_API = "/api/admin/feedbacks";

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
    @DisplayName("로그인한 관리자 세션으로 관리자 API를 호출하고, 로그아웃하면 다시 401로 거절한다")
    void signsInAdminSession() throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(
            post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"admin-test","password":"secret-test"}
                    """)
        )
            .andExpect(status().isOk())
            .andReturn()
            .getRequest()
            .getSession(false);
        assertThat(session).isNotNull();

        mockMvc.perform(get(ADMIN_API).session(session))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/admin/logout").session(session))
            .andExpect(status().isNoContent());
        mockMvc.perform(get(ADMIN_API).session(session))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("관리자 세션이 있으면 관리자 아이디를 돌려주고, 없으면 401, 회원 세션이면 403으로 거절한다")
    void checksAdminSession() throws Exception {
        mockMvc.perform(get("/api/admin/me").with(authentication(new LoginAdmin("admin-test").toAuthentication())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("admin-test"));
        mockMvc.perform(get("/api/admin/me"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/me").with(authentication(new LoginMember(1L).toAuthentication())))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("관리자 세션이 없으면 관리자 API를 401로, 회원 세션이면 403으로 거절한다")
    void rejectsAdminApiWithoutAdminSession() throws Exception {
        mockMvc.perform(get(ADMIN_API))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get(ADMIN_API).with(authentication(new LoginMember(1L).toAuthentication())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
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
