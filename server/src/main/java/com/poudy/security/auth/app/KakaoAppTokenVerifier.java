package com.poudy.security.auth.app;

import com.poudy.security.domain.AppLoginFailedException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class KakaoAppTokenVerifier implements ProviderTokenVerifier {

    private static final String TOKEN_INFO_URI = "https://kapi.kakao.com/v1/user/access_token_info";
    private static final String USER_URI = "https://kapi.kakao.com/v2/user/me";
    private static final String APP_ID = "app_id";
    private static final ParameterizedTypeReference<Map<String, Object>> ATTRIBUTES = new ParameterizedTypeReference<>() {
    };

    private static final Logger log = LoggerFactory.getLogger(KakaoAppTokenVerifier.class);

    private final RestClient restClient;
    private final String appId;

    @Autowired
    public KakaoAppTokenVerifier(@Value("${poudy.auth.app-login.kakao-app-id}") String appId) {
        this(RestClient.builder().requestFactory(TimeoutRequestFactory.create()).build(), appId);
    }

    public KakaoAppTokenVerifier(RestClient restClient, String appId) {
        this.restClient = restClient;
        this.appId = appId;
    }

    @Override
    public OAuthProvider provider() {
        return OAuthProvider.KAKAO;
    }

    @Override
    public OAuthAccount verify(String token) {
        try {
            Map<String, Object> tokenInfo = call(TOKEN_INFO_URI, token);
            if (!appId.equals(String.valueOf(tokenInfo.get(APP_ID)))) {
                throw new AppLoginFailedException();
            }
            return OAuthProvider.KAKAO.parseAccount(call(USER_URI, token));
        } catch (HttpClientErrorException rejected) {
            throw new AppLoginFailedException();
        } catch (RestClientException unavailable) {
            log.warn("Kakao API could not verify app login token", unavailable);
            throw new AppLoginFailedException();
        }
    }

    private Map<String, Object> call(String uri, String token) {
        return restClient.get()
            .uri(uri)
            .headers(headers -> headers.setBearerAuth(token))
            .retrieve()
            .body(ATTRIBUTES);
    }
}
