package com.poudy.openapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.SharedMockBeans;
import com.poudy.security.auth.app.ProviderTokenVerifiers;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.hikari.connection-init-sql=SET statement_timeout = '1000'",
        "spring.flyway.url=${spring.datasource.url}",
        "spring.flyway.user=${spring.datasource.username}",
        "spring.flyway.password=${spring.datasource.password}",
        "spring.security.oauth2.client.registration.kakao.client-id=swagger-test",
        "spring.security.oauth2.client.registration.kakao.client-secret=swagger-test",
        "spring.security.oauth2.client.registration.google.client-id=swagger-test",
        "spring.security.oauth2.client.registration.google.client-secret=swagger-test",
        "poudy.image.pending-cleanup.enabled=false",
        "poudy.feedback.retention.enabled=false",
        "poudy.user.retention.enabled=false"})
@ActiveProfiles({"prod", "staging", "test"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SharedMockBeans
@AutoConfigureMockMvc
@Transactional
@DisplayName("운영·스테이징 관리자 Swagger")
class AdminSwaggerTest {

    private static final List<String> DOCUMENT_PATHS = List.of(
        "/api/admin/swagger-ui/swagger-ui-bundle.js",
        "/api/admin/swagger-ui/swagger-initializer.js",
        "/api/admin/v3/api-docs",
        "/api/admin/v3/api-docs.yaml",
        "/api/admin/v3/api-docs/swagger-config"
    );

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProviderTokenVerifiers tokenVerifiers;

    @Autowired
    private UserRepository users;

    @Test
    @DisplayName("문서 화면·설정·명세·정적 자원은 관리자 세션이 없으면 거절한다")
    void requiresAdminForAllDocumentResources() throws Exception {
        MockHttpSession user = signInUser();
        for (String path : DOCUMENT_PATHS) {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
            mockMvc.perform(get(path).session(user)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    @DisplayName("관리자 로그인 전 문서 진입 화면은 로그인 화면으로 보내고 복귀 경로를 유지한다")
    void redirectsDocumentPagesToAdminLogin() throws Exception {
        for (String path : List.of("/api/admin/swagger-ui.html", "/api/admin/swagger-ui/index.html")) {
            mockMvc.perform(get(path))
                .andExpect(status().is3xxRedirection())
                .andExpect(
                    header().string(
                        HttpHeaders.LOCATION,
                        "/admin/login?next=%2Fapi%2Fadmin%2Fswagger-ui.html"
                    )
                );
        }
    }

    @Test
    @DisplayName("관리자는 UI와 명세를 열고 현재 도메인 API 및 사용자 로그인 링크를 사용한다")
    void servesAdminSwagger() throws Exception {
        Cookie admin = signInAdmin();
        mockMvc.perform(get("/api/admin/swagger-ui.html").cookie(admin))
            .andExpect(status().is3xxRedirection())
            .andExpect(header().string(HttpHeaders.LOCATION, "/api/admin/swagger-ui/index.html"));
        mockMvc.perform(get("/api/admin/swagger-ui/index.html").cookie(admin))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("poudy-user-session")))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
        mockMvc.perform(get("/api/admin/swagger-ui/swagger-ui-bundle.js").cookie(admin))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/swagger-ui/swagger-initializer.js").cookie(admin))
            .andExpect(status().isOk())
            .andExpect(content().string(org.hamcrest.Matchers.containsString("poudy-session-changed")));
        mockMvc.perform(get("/api/admin/v3/api-docs/swagger-config").cookie(admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.url").value("/api/admin/v3/api-docs"))
            .andExpect(jsonPath("$.withCredentials").value(true));
        mockMvc.perform(get("/api/admin/v3/api-docs").cookie(admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.servers.length()").value(1))
            .andExpect(jsonPath("$.servers[0].url").value("/"))
            .andExpect(
                jsonPath("$.info.description").value(
                    org.hamcrest.Matchers.containsString(
                        "[카카오 로그인](/login/swagger?provider=kakao&popup=1)"
                    )
                )
            )
            .andExpect(
                jsonPath("$.info.description").value(
                    org.hamcrest.Matchers.containsString(
                        "[구글 로그인](/login/swagger?provider=google&popup=1)"
                    )
                )
            );
        mockMvc.perform(get("/api/admin/v3/api-docs.yaml").cookie(admin))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("회원·관리자 API의 세션 종류를 구분하고 공개 API에는 세션을 요구하지 않는다")
    void documentsRequiredSessions() throws Exception {
        mockMvc.perform(get("/api/admin/v3/api-docs").cookie(signInAdmin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.securitySchemes.UserSession.in").value("cookie"))
            .andExpect(jsonPath("$.components.securitySchemes.UserSession.name").value("JSESSIONID"))
            .andExpect(jsonPath("$.components.securitySchemes.AdminSession.name").value("POUDY_ADMIN_SESSION"))
            .andExpect(jsonPath("$.paths['/api/users/me'].get.security[0].UserSession").isArray())
            .andExpect(jsonPath("$.paths['/api/admin/me'].get.security[0].AdminSession").isArray())
            .andExpect(jsonPath("$.paths['/api/admin/login'].post.security").doesNotExist())
            .andExpect(jsonPath("$.paths['/api/ingredients'].get.security").doesNotExist());
    }

    @Test
    @DisplayName("기존 공개 문서·WebJar 경로로 문서 보호를 우회할 수 없다")
    void doesNotServePublicDocumentAliases() throws Exception {
        for (String path : List.of(
            "/swagger-ui.html",
            "/swagger-ui/index.html",
            "/v3/api-docs",
            "/v3/api-docs.yaml",
            "/v3/api-docs/swagger-config",
            "/webjars/swagger-ui/index.html",
            "/webjars/swagger-ui/5.32.11/swagger-initializer.js"
        )) {
            mockMvc.perform(get(path)).andExpect(status().isNotFound());
        }
    }

    @Test
    @DisplayName("사용자 로그인·로그아웃 후에도 관리자 문서 접근과 새로고침을 유지한다")
    void keepsDocumentAccessWhileTestingUserSession() throws Exception {
        Cookie admin = signInAdmin();
        MockHttpSession user = signInUser();
        mockMvc.perform(get("/api/users/me").cookie(admin).session(user)).andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/v3/api-docs").cookie(admin).session(user)).andExpect(status().isOk());
        mockMvc.perform(post("/api/users/logout").cookie(admin).session(user)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/admin/swagger-ui/index.html").cookie(admin)).andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/v3/api-docs").cookie(admin)).andExpect(status().isOk());
    }

    private Cookie signInAdmin() throws Exception {
        Cookie cookie = mockMvc.perform(
            post("/api/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin-test\",\"password\":\"secret-test\"}")
        )
            .andExpect(status().isOk())
            .andReturn().getResponse().getCookie("POUDY_ADMIN_SESSION");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private MockHttpSession signInUser() throws Exception {
        OAuthAccount account = new OAuthAccount(OAuthProvider.KAKAO, "swagger-user", "swagger@example.com", true);
        users.save(UserSignup.from(account), UserNicknameTestFixture.nickname()).orElseThrow();
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString())).willReturn(account);
        MockHttpSession session = (MockHttpSession) mockMvc.perform(
            post("/api/auth/kakao/app-login")
                .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"swagger-token\"}")
        )
            .andExpect(status().isOk())
            .andReturn().getRequest().getSession(false);
        assertThat(session).isNotNull();
        return session;
    }
}
