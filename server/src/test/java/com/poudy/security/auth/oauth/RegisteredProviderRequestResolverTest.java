package com.poudy.security.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.ClientOrigins;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

@DisplayName("등록된 제공자만 받는 로그인 시작 요청 해석")
class RegisteredProviderRequestResolverTest {

    private static final String BASE_URI = "/api/oauth2/authorization";
    private static final String PREVIEW = "https://pr-111.preview.poudy.site";
    private static final String DEFAULT_ORIGIN = "https://poudy.site";

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
        BASE_URI,
        ClientOrigins.from(List.of("https://*.preview.poudy.site"))
    );

    @Test
    @DisplayName("등록된 제공자는 로그인 요청을 만든다")
    void resolvesRegisteredProvider() {
        assertThat(resolver.resolve(request(BASE_URI + "/kakao"))).isNotNull();
        assertThat(resolver.resolve(request("/anything"), "kakao")).isNotNull();
    }

    @Test
    @DisplayName("로그인된 제공자 계정이 있어도 계정을 고르게 한다")
    void asksToSelectAccount() {
        assertThat(resolver.resolve(request(BASE_URI + "/kakao")).getAuthorizationRequestUri())
            .contains("prompt=select_account");
    }

    @Test
    @DisplayName("등록되지 않은 제공자는 예외 대신 요청을 만들지 않는다")
    void skipsUnregisteredProvider() {
        assertThat(resolver.resolve(request(BASE_URI + "/naver"))).isNull();
        assertThat(resolver.resolve(request("/anything"), "naver")).isNull();
    }

    @Test
    @DisplayName("등록된 제공자의 로그인을 시작할 때만 복귀 오리진을 기억한다")
    void remembersReturnOriginOnlyForRegisteredProvider() {
        MockHttpServletRequest login = request(BASE_URI + "/kakao");
        login.setParameter("returnOrigin", PREVIEW);
        OAuth2AuthorizationRequest authorization = resolver.resolve(login);
        assertThat(OAuthLoginStart.takeFrom(callbackOf(login, authorization.getState())).returnOriginOr(DEFAULT_ORIGIN))
            .isEqualTo(PREVIEW);

        MockHttpServletRequest unknown = request(BASE_URI + "/naver");
        unknown.setParameter("returnOrigin", PREVIEW);
        resolver.resolve(unknown);
        assertThat(unknown.getSession(false)).isNull();
    }

    @Test
    @DisplayName("허용하지 않은 복귀 오리진은 기억하지 않는다")
    void ignoresUntrustedReturnOrigin() {
        MockHttpServletRequest login = request(BASE_URI + "/kakao");
        login.setParameter("returnOrigin", "https://evil.com/.preview.poudy.site");
        OAuth2AuthorizationRequest authorization = resolver.resolve(login);

        assertThat(OAuthLoginStart.takeFrom(callbackOf(login, authorization.getState())).returnOriginOr(DEFAULT_ORIGIN))
            .isEqualTo(DEFAULT_ORIGIN);
    }

    @Test
    @DisplayName("복귀 오리진 없이 로그인을 다시 시작하면 이전 값을 버린다")
    void forgetsPreviousReturnOriginWithoutParameter() {
        MockHttpServletRequest first = request(BASE_URI + "/kakao");
        first.setParameter("returnOrigin", PREVIEW);
        resolver.resolve(first);
        MockHttpServletRequest second = request(BASE_URI + "/kakao");
        second.setSession(first.getSession());
        OAuth2AuthorizationRequest authorization = resolver.resolve(second);

        assertThat(
            OAuthLoginStart.takeFrom(callbackOf(second, authorization.getState())).returnOriginOr(DEFAULT_ORIGIN)
        ).isEqualTo(DEFAULT_ORIGIN);
    }

    private MockHttpServletRequest callbackOf(MockHttpServletRequest start, String state) {
        MockHttpServletRequest callback = request("/api/login/oauth2/code/kakao");
        callback.setSession(start.getSession());
        callback.setParameter("state", state);
        return callback;
    }

    private MockHttpServletRequest request(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setServletPath(uri);
        return request;
    }
}
