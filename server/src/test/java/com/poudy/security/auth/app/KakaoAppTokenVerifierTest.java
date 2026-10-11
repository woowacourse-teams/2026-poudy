package com.poudy.security.auth.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.poudy.security.domain.AppLoginFailedException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

@DisplayName("앱 카카오 토큰 확인")
class KakaoAppTokenVerifierTest {

    private static final String KAKAO_APP_ID = "1595861";
    private static final String TOKEN_INFO_URI = "https://kapi.kakao.com/v1/user/access_token_info";
    private static final String USER_URI = "https://kapi.kakao.com/v2/user/me";

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer kakao = MockRestServiceServer.bindTo(builder).build();
    private final KakaoAppTokenVerifier verifier = new KakaoAppTokenVerifier(builder.build(), KAKAO_APP_ID);

    @Test
    @DisplayName("카카오 토큰이 Poudy 앱에서 발급됐으면 회원 정보로 계정을 만든다")
    void readsKakaoAccount() {
        kakao.expect(requestTo(TOKEN_INFO_URI))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer kakao-token"))
            .andRespond(withSuccess("{\"id\":4321,\"app_id\":1595861}", MediaType.APPLICATION_JSON));
        kakao.expect(requestTo(USER_URI))
            .andRespond(
                withSuccess(
                    """
                        {"id":4321,"kakao_account":{"email":"Member@Example.com","is_email_valid":true,"is_email_verified":true}}
                        """,
                    MediaType.APPLICATION_JSON
                )
            );

        OAuthAccount account = verifier.verify("kakao-token");

        assertThat(account.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(account.providerId()).isEqualTo("4321");
        assertThat(account.verifiedEmail()).isEqualTo("member@example.com");
        kakao.verify();
    }

    @Test
    @DisplayName("다른 앱에서 발급한 카카오 토큰은 회원 정보를 묻지 않고 거절한다")
    void rejectsKakaoTokenOfOtherApp() {
        kakao.expect(requestTo(TOKEN_INFO_URI))
            .andRespond(withSuccess("{\"id\":4321,\"app_id\":999}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> verifier.verify("kakao-token"))
            .isInstanceOf(AppLoginFailedException.class);
        kakao.verify();
    }

    @Test
    @DisplayName("카카오가 토큰을 거절하면 로그인 실패로 본다")
    void rejectsExpiredKakaoToken() {
        kakao.expect(requestTo(TOKEN_INFO_URI)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> verifier.verify("expired"))
            .isInstanceOf(AppLoginFailedException.class);
    }

    @Test
    @DisplayName("카카오 API가 응답하지 않거나 장애면 로그인 실패로 본다")
    void treatsKakaoOutageAsLoginFailure() {
        kakao.expect(requestTo(TOKEN_INFO_URI)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> verifier.verify("kakao-token"))
            .isInstanceOf(AppLoginFailedException.class);
    }
}
