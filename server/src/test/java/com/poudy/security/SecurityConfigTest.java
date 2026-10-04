package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.session.LoginMember;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("보안 설정")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("카카오 로그인은 /api 아래 콜백 주소로 이메일 동의를 요청한다")
    void startsKakaoLogin() throws Exception {
        String location = redirectOf("/api/oauth2/authorization/kakao");

        assertThat(location)
            .startsWith("https://kauth.kakao.com/oauth/authorize?")
            .contains("redirect_uri=http://localhost/api/login/oauth2/code/kakao")
            .contains("scope=account_email");
    }

    @Test
    @DisplayName("구글 로그인은 /api 아래 콜백 주소로 openid와 이메일만 요청한다")
    void startsGoogleLogin() throws Exception {
        String location = redirectOf("/api/oauth2/authorization/google");

        assertThat(location)
            .startsWith("https://accounts.google.com/o/oauth2/v2/auth?")
            .contains("redirect_uri=http://localhost/api/login/oauth2/code/google")
            .contains("scope=openid email");
    }

    @Test
    @DisplayName("등록하지 않은 제공자의 로그인은 404로 거절한다")
    void rejectsUnregisteredProvider() throws Exception {
        mockMvc.perform(get("/api/oauth2/authorization/naver"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ENDPOINT_NOT_FOUND"));
    }

    @Test
    @DisplayName("공개 API 응답의 캐시 헤더를 바꾸지 않는다")
    void leavesPublicCacheHeadersAlone() throws Exception {
        mockMvc.perform(get("/api/skin-types"))
            .andExpect(status().isOk())
            .andExpect(header().doesNotExist(HttpHeaders.CACHE_CONTROL));
    }

    @Test
    @DisplayName("기본 로그인 화면을 만들지 않는다")
    void doesNotServeDefaultLoginPage() throws Exception {
        mockMvc.perform(get("/login"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("로그아웃하면 세션을 버리고 204를 돌려준다")
    void logsOut() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mockMvc
            .perform(
                post("/api/auth/logout").session(session).with(authentication(new LoginMember(1L).toAuthentication()))
            )
            .andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("로그인하지 않았어도 로그아웃은 204를 돌려준다")
    void logsOutAnonymous() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GET 요청으로는 로그아웃하지 않는다")
    void ignoresLogoutByGet() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(get("/api/auth/logout").session(session))
            .andExpect(status().isNotFound());

        assertThat(session.isInvalid()).isFalse();
    }

    private String redirectOf(String path) throws Exception {
        String location = mockMvc.perform(get(path))
            .andExpect(status().is3xxRedirection())
            .andReturn()
            .getResponse()
            .getHeader(HttpHeaders.LOCATION);
        return URLDecoder.decode(location, StandardCharsets.UTF_8);
    }
}
