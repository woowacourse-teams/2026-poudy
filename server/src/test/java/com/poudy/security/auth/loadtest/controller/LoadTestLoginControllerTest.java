package com.poudy.security.auth.loadtest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.SharedMockBeans;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.hikari.connection-init-sql=SET statement_timeout = '1000'",
        "spring.flyway.url=${spring.datasource.url}",
        "spring.flyway.user=${spring.datasource.username}",
        "spring.flyway.password=${spring.datasource.password}",
        "spring.security.oauth2.client.registration.kakao.client-id=load-test",
        "spring.security.oauth2.client.registration.kakao.client-secret=load-test",
        "spring.security.oauth2.client.registration.google.client-id=load-test",
        "spring.security.oauth2.client.registration.google.client-secret=load-test",
        "poudy.image.pending-cleanup.enabled=false",
        "poudy.feedback.retention.enabled=false",
        "poudy.user.retention.enabled=false",
        "poudy.loadtest.secret=" + LoadTestLoginControllerTest.SECRET})
@ActiveProfiles({"prod", "staging", "test"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SharedMockBeans
@AutoConfigureMockMvc
@Transactional
@DisplayName("staging 부하 시험 로그인 API")
class LoadTestLoginControllerTest {

    public static final String SECRET = "0123456789abcdef0123456789abcdef";
    private static final String PATH = "/api/auth/load-test-login";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("처음 들어온 시험 계정은 가입을 거쳐 회원 API 를 쓰고, 다시 들어오면 바로 로그인된다")
    void signsUpThenSignsIn() throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(login("user-0001", SECRET))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SIGNUP_REQUIRED"))
            .andReturn()
            .getRequest()
            .getSession(false);
        mockMvc.perform(post("/api/auth/signup").session(session)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/users/me").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("loadtest-user-0001@loadtest.poudy.invalid"));

        mockMvc.perform(login("user-0001", SECRET))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SIGNED_IN"));
    }

    @Test
    @DisplayName("비밀값이 없거나 틀리면 세션을 만들지 않는다")
    void rejectsWrongSecret() throws Exception {
        MockHttpSession missing = (MockHttpSession) mockMvc.perform(
            post(PATH).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"user-0002\"}")
        ).andExpect(status().isForbidden()).andReturn().getRequest().getSession(false);
        MockHttpSession wrong = (MockHttpSession) mockMvc.perform(login("user-0002", SECRET + "x"))
            .andExpect(status().isForbidden())
            .andReturn()
            .getRequest()
            .getSession(false);

        assertThat(missing).isNull();
        assertThat(wrong).isNull();
    }

    @Test
    @DisplayName("정해진 형식이 아닌 계정 이름은 받지 않는다")
    void rejectsInvalidName() throws Exception {
        mockMvc.perform(login("User 1", SECRET)).andExpect(status().isBadRequest());
    }

    private MockHttpServletRequestBuilder login(String name, String secret) {
        return post(PATH)
            .header(LoadTestLoginController.SECRET_HEADER, secret)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"" + name + "\"}");
    }
}
