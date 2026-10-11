package com.poudy.security;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = ConfiguredClientOrigins.PROPERTY)
@AutoConfigureMockMvc
@Transactional
@DisplayName("CORS 설정")
class CorsTest {

    private static final String DISALLOWED_ORIGIN = "http://evil.example.com";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:3000", "https://poudy.example.com", "https://pr-12.preview.example.com"})
    @DisplayName("허용한 도메인의 사전 요청에 허용 헤더를 준다")
    void allowsPreflightFromAllowedOrigin(String origin) throws Exception {
        mockMvc.perform(
            options("/api/feedbacks")
                .header(HttpHeaders.ORIGIN, origin)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH")
        )
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin))
            .andExpect(
                header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS")
            );
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:3000", "https://poudy.example.com", "https://pr-12.preview.example.com"})
    @DisplayName("허용한 도메인의 저장 PUT 사전 요청에 자격 증명 허용 헤더를 준다")
    void allowsSavedProductPutPreflight(String origin) throws Exception {
        mockMvc.perform(
            options("/api/members/me/saved-products/1")
                .header(HttpHeaders.ORIGIN, origin)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PUT")
        )
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:3000", "https://poudy.example.com", "https://pr-12.preview.example.com"})
    @DisplayName("허용한 도메인의 조회 응답에 허용 헤더와 자격 증명 허용을 준다")
    void allowsRequestFromAllowedOrigin(String origin) throws Exception {
        mockMvc.perform(get("/api/products").header(HttpHeaders.ORIGIN, origin))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("허용하지 않은 도메인의 사전 요청을 막는다")
    void rejectsPreflightFromDisallowedOrigin() throws Exception {
        mockMvc.perform(
            options("/api/products")
                .header(HttpHeaders.ORIGIN, DISALLOWED_ORIGIN)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
        )
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("허용하지 않은 도메인에는 허용 헤더를 주지 않는다")
    void omitsAllowHeaderForDisallowedOrigin() throws Exception {
        mockMvc.perform(get("/api/products").header(HttpHeaders.ORIGIN, DISALLOWED_ORIGIN))
            .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://evil.example.com", "null", "https://poudy.example.com.evil.com"})
    @DisplayName("허용하지 않은 출처의 상태 변경 요청을 403으로 거절한다")
    void rejectsForeignStateChange(String origin) throws Exception {
        mockMvc.perform(post("/api/members/logout").header(HttpHeaders.ORIGIN, origin))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN_ORIGIN"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost", "https://poudy.example.com", "https://pr-12.preview.example.com"})
    @DisplayName("같은 출처와 허용한 출처의 상태 변경 요청은 통과시킨다")
    void allowsKnownOriginStateChange(String origin) throws Exception {
        mockMvc.perform(post("/api/members/logout").header(HttpHeaders.ORIGIN, origin).with(signedInMember()))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("출처 헤더가 없는 상태 변경 요청은 브라우저 요청이 아니므로 통과시킨다")
    void allowsStateChangeWithoutOrigin() throws Exception {
        mockMvc.perform(post("/api/members/logout").with(signedInMember()))
            .andExpect(status().isNoContent());
    }

    private RequestPostProcessor signedInMember() {
        long memberId = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "cors", "cors@example.com", true))
        ).id();
        return authentication(new LoginMember(memberId).toAuthentication());
    }
}
