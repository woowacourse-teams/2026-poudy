package com.poudy.security.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;

@DisplayName("등록된 제공자만 받는 로그인 시작 요청 해석")
class RegisteredProviderRequestResolverTest {

    private static final String BASE_URI = "/api/oauth2/authorization";

    private final RegisteredProviderRequestResolver resolver = new RegisteredProviderRequestResolver(
        new InMemoryClientRegistrationRepository(
            ClientRegistration.withRegistrationId("kakao")
                .clientId("client-id")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/api/login/oauth2/code/{registrationId}")
                .authorizationUri("https://kauth.kakao.com/oauth/authorize")
                .tokenUri("https://kauth.kakao.com/oauth/token")
                .build()
        ),
        BASE_URI
    );

    @Test
    @DisplayName("등록된 제공자는 로그인 요청을 만든다")
    void resolvesRegisteredProvider() {
        assertThat(resolver.resolve(request(BASE_URI + "/kakao"))).isNotNull();
        assertThat(resolver.resolve(request("/anything"), "kakao")).isNotNull();
    }

    @Test
    @DisplayName("등록되지 않은 제공자는 예외 대신 요청을 만들지 않는다")
    void skipsUnregisteredProvider() {
        assertThat(resolver.resolve(request(BASE_URI + "/naver"))).isNull();
        assertThat(resolver.resolve(request("/anything"), "naver")).isNull();
    }

    private MockHttpServletRequest request(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setServletPath(uri);
        return request;
    }
}
