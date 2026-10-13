package com.poudy.security.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.session.LoginChannel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

@DisplayName("OAuth 로그인 시작 정보")
class OAuthLoginStartTest {

    private static final String PREVIEW = "https://pr-111.preview.poudy.site";
    private static final String STATE = "state-1";

    @Test
    @DisplayName("맡겨 둔 시작 정보는 같은 state의 콜백에서 한 번만 꺼낼 수 있다")
    void takesStartOnce() {
        MockHttpServletRequest start = new MockHttpServletRequest();
        new OAuthLoginStart(STATE, PREVIEW, LoginChannel.APP).rememberIn(start);
        MockHttpServletRequest callback = callbackOf(start, STATE);

        OAuthLoginStart taken = OAuthLoginStart.takeFrom(callback);

        assertThat(taken.returnOriginOr("https://poudy.site")).isEqualTo(PREVIEW);
        assertThat(taken.channel()).isEqualTo(LoginChannel.APP);
        assertThat(OAuthLoginStart.takeFrom(callback)).isEqualTo(OAuthLoginStart.unknown());
    }

    @Test
    @DisplayName("state가 다르거나 없는 콜백은 시작 정보를 꺼내지 못하고 남겨 둔다")
    void keepsStartForOtherState() {
        MockHttpServletRequest start = new MockHttpServletRequest();
        new OAuthLoginStart(STATE, PREVIEW, LoginChannel.APP).rememberIn(start);

        assertThat(OAuthLoginStart.takeFrom(callbackOf(start, "other-state"))).isEqualTo(OAuthLoginStart.unknown());
        assertThat(OAuthLoginStart.takeFrom(callbackOf(start, null))).isEqualTo(OAuthLoginStart.unknown());
        assertThat(OAuthLoginStart.takeFrom(callbackOf(start, STATE)).channel()).isEqualTo(LoginChannel.APP);
    }

    @Test
    @DisplayName("시작 정보가 없으면 기본 주소로 돌아가는 웹 로그인으로 보고, 세션을 만들지 않는다")
    void treatsMissingStartAsWebLogin() {
        MockHttpServletRequest callback = new MockHttpServletRequest();
        callback.setParameter("state", STATE);

        OAuthLoginStart taken = OAuthLoginStart.takeFrom(callback);

        assertThat(taken.returnOriginOr("https://poudy.site")).isEqualTo("https://poudy.site");
        assertThat(taken.channel()).isEqualTo(LoginChannel.WEB);
        assertThat(callback.getSession(false)).isNull();
    }

    private MockHttpServletRequest callbackOf(MockHttpServletRequest start, String state) {
        MockHttpServletRequest callback = new MockHttpServletRequest();
        callback.setSession(start.getSession());
        if (state != null) {
            callback.setParameter("state", state);
        }
        return callback;
    }
}
