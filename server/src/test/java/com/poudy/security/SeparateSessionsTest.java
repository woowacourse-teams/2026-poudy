package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import com.poudy.SharedMockBeans;
import com.poudy.security.auth.app.ProviderTokenVerifiers;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.AdminSessionRepository;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.apache.catalina.Context;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.tomcat.TomcatWebServer;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.session.MapSession;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@SharedMockBeans
@DisplayName("실제 HTTP 관리자·사용자 세션 분리")
class SeparateSessionsTest {

    private static final String ADMIN_COOKIE = "POUDY_ADMIN_SESSION";
    private static final AtomicInteger CLIENT_SEQUENCE = new AtomicInteger();

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private UserRepository users;

    @Autowired
    private ProviderTokenVerifiers tokenVerifiers;

    @Autowired
    private AdminSessionRepository adminSessions;

    @Autowired
    private WebServerApplicationContext application;

    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final Map<String, String> cookies = new HashMap<>();
    private String clientAddress;
    private OAuthAccount account;

    @BeforeEach
    void prepareAccount() {
        clientAddress = "203.0.113." + CLIENT_SEQUENCE.incrementAndGet();
        String id = UUID.randomUUID().toString();
        account = new OAuthAccount(OAuthProvider.KAKAO, id, id + "@example.com", true);
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString())).willReturn(account);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @DisplayName("어느 쪽을 먼저 로그인해도 별도 쿠키로 두 API를 사용할 수 있다")
    void keepsBothLogins(boolean adminFirst) throws Exception {
        if (adminFirst) {
            signInAdmin();
            signInUser();
        } else {
            signInUser();
            signInAdmin();
        }
        assertThat(cookies).containsKeys("JSESSIONID", ADMIN_COOKIE);
        assertThat(cookies.get(ADMIN_COOKIE)).isNotEqualTo(cookies.get("JSESSIONID"));
        assertBothSignedIn();
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @DisplayName("한쪽 로그아웃은 다른 쪽 인증을 유지하고 로그아웃한 세션은 재사용할 수 없다")
    void logsOutOnlySelectedSession(boolean adminLogout) throws Exception {
        signInUser();
        signInAdmin();
        Map<String, String> previous = Map.copyOf(cookies);
        String logout = "/api/users/logout";
        String signedInPath = "/api/admin/me";
        String signedOutPath = "/api/users/me";
        if (adminLogout) {
            logout = "/api/admin/logout";
            signedInPath = "/api/users/me";
            signedOutPath = "/api/admin/me";
        }
        assertThat(send("POST", logout, "").statusCode()).isEqualTo(204);
        assertThat(send("GET", signedInPath, "").statusCode()).isEqualTo(200);
        cookies.clear();
        cookies.putAll(previous);
        assertThat(send("GET", signedOutPath, "").statusCode()).isEqualTo(401);
    }

    @Test
    @DisplayName("쿠키를 바꿔 보내거나 다른 역할 쿠키만 보내도 권한을 대신하지 않는다")
    void rejectsOtherSessionCookie() throws Exception {
        signInUser();
        signInAdmin();
        String user = cookies.get("JSESSIONID");
        String admin = cookies.get(ADMIN_COOKIE);
        cookies.remove(ADMIN_COOKIE);
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(401);
        cookies.clear();
        cookies.put(ADMIN_COOKIE, admin);
        assertThat(send("GET", "/api/users/me", "").statusCode()).isEqualTo(401);
        cookies.put(ADMIN_COOKIE, user);
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(401);
        cookies.clear();
        cookies.put("JSESSIONID", admin);
        assertThat(send("GET", "/api/users/me", "").statusCode()).isEqualTo(401);
    }

    @Test
    @DisplayName("관리자 쿠키는 안전한 속성으로 발급하고 재로그인하면 관리자 세션만 교체한다")
    void rotatesOnlyAdminSession() throws Exception {
        signInUser();
        HttpResponse<String> login = signInAdmin();
        String user = cookies.get("JSESSIONID");
        String previous = cookies.get(ADMIN_COOKIE);
        assertThat(login.headers().allValues("set-cookie"))
            .anySatisfy(
                value -> assertThat(value)
                    .startsWith(ADMIN_COOKIE + "=")
                    .contains("Path=/api/admin", "Secure", "HttpOnly", "SameSite=Lax")
                    .doesNotContain("Domain=")
            );
        signInAdmin();
        assertThat(cookies.get("JSESSIONID")).isEqualTo(user);
        assertThat(cookies.get(ADMIN_COOKIE)).isNotEqualTo(previous);
        assertThat(adminSessions.findById(previous)).isNull();
        assertBothSignedIn();
    }

    @Test
    @DisplayName("사용자 재로그인은 사용자 세션만 교체하고 관리자 인증을 유지한다")
    void rotatesOnlyUserSession() throws Exception {
        signInUser();
        signInAdmin();
        String user = cookies.get("JSESSIONID");
        String admin = cookies.get(ADMIN_COOKIE);

        assertThat(send("POST", "/api/auth/kakao/app-login", "{\"token\":\"test-token\"}").statusCode())
            .isEqualTo(200);

        assertThat(cookies.get("JSESSIONID")).isNotEqualTo(user);
        assertThat(cookies.get(ADMIN_COOKIE)).isEqualTo(admin);
        assertBothSignedIn();
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @DisplayName("관리자 비활동·절대 만료가 사용자 세션을 종료하지 않는다")
    void expiresOnlyAdmin(boolean idleExpiry) throws Exception {
        signInUser();
        signInAdmin();
        MapSession session = adminSessions.findById(cookies.get(ADMIN_COOKIE));
        assertThat(session).isNotNull();
        if (idleExpiry) {
            session.setLastAccessedTime(Instant.now().minus(Duration.ofHours(2)));
        } else {
            String deadline = session.getAttributeNames().stream()
                .filter(name -> name.endsWith(".expiresAt"))
                .findFirst().orElseThrow();
            session.setAttribute(deadline, Instant.now().minusSeconds(1));
        }
        adminSessions.save(session);
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(401);
        assertThat(send("GET", "/api/users/me", "").statusCode()).isEqualTo(200);
    }

    @Test
    @DisplayName("사용자 요청과 OAuth 시작·실패는 관리자 세션의 비활동 시각을 갱신하지 않는다")
    void doesNotTouchAdminOnUserRequests() throws Exception {
        signInUser();
        signInAdmin();
        String id = cookies.get(ADMIN_COOKIE);
        Instant lastAccess = Objects.requireNonNull(adminSessions.findById(id)).getLastAccessedTime();
        assertThat(send("GET", "/api/users/me", "").statusCode()).isEqualTo(200);
        assertThat(send("GET", "/api/oauth2/authorization/kakao", "").statusCode()).isEqualTo(302);
        assertThat(send("GET", "/api/login/oauth2/code/kakao?error=access_denied&state=invalid", "").statusCode())
            .isEqualTo(302);
        assertThat(Objects.requireNonNull(adminSessions.findById(id)).getLastAccessedTime()).isEqualTo(lastAccess);
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(200);
    }

    @Test
    @DisplayName("가입 대기·가입 완료·회원 탈퇴 후에도 관리자 인증은 유지된다")
    void keepsAdminThroughSignupAndWithdrawal() throws Exception {
        signInAdmin();
        assertThat(send("POST", "/api/auth/kakao/app-login", "{\"token\":\"test-token\"}").body())
            .contains("SIGNUP_REQUIRED");
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(200);
        assertThat(send("POST", "/api/auth/signup", "").statusCode()).isEqualTo(204);
        assertBothSignedIn();
        assertThat(send("DELETE", "/api/users/me", "").statusCode()).isEqualTo(204);
        assertThat(send("GET", "/api/users/me", "").statusCode()).isEqualTo(401);
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(200);
    }

    @Test
    @DisplayName("관리자 요청은 사용자 세션을 연장하지 않고 사용자 만료도 관리자 인증을 종료하지 않는다")
    void doesNotTouchUserOnAdminRequests() throws Exception {
        signInUser();
        signInAdmin();
        TomcatWebServer server = (TomcatWebServer) application.getWebServer();
        assert server != null;
        Context context = (Context) server.getTomcat().getHost().findChildren()[0];
        org.apache.catalina.Session session = context.getManager().findSession(cookies.get("JSESSIONID"));
        assertThat(session).isNotNull();
        long lastAccess = session.getLastAccessedTime();
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(200);
        assertThat(session.getLastAccessedTime()).isEqualTo(lastAccess);
        session.expire();
        assertThat(send("GET", "/api/users/me", "").statusCode()).isEqualTo(401);
        assertThat(send("GET", "/api/admin/me", "").statusCode()).isEqualTo(200);
    }

    private HttpResponse<String> signInAdmin() throws Exception {
        HttpResponse<String> response = send(
            "POST",
            "/api/admin/login",
            "{\"username\":\"admin-test\",\"password\":\"secret-test\"}"
        );
        assertThat(response.statusCode()).isEqualTo(200);
        return response;
    }

    private void signInUser() throws Exception {
        users.save(UserSignup.from(account));
        HttpResponse<String> response = send("POST", "/api/auth/kakao/app-login", "{\"token\":\"test-token\"}");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("SIGNED_IN");
    }

    private void assertBothSignedIn() throws Exception {
        HttpResponse<String> user = send("GET", "/api/users/me", "");
        assertThat(user.statusCode()).isEqualTo(200);
        assertThat(user.body()).contains(account.verifiedEmail());
        HttpResponse<String> admin = send("GET", "/api/admin/me", "");
        assertThat(admin.statusCode()).isEqualTo(200);
        assertThat(admin.body()).contains("admin-test");
    }

    private HttpResponse<String> send(String method, String path, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/json")
            .header("X-Real-IP", clientAddress)
            .method(method, HttpRequest.BodyPublishers.ofString(body));
        if (!cookies.isEmpty()) {
            request.header(
                "Cookie",
                cookies.entrySet().stream()
                    .map(entry -> entry.getKey() + "=" + entry.getValue()).collect(Collectors.joining("; "))
            );
        }
        HttpResponse<String> response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        response.headers().allValues("set-cookie").stream().flatMap(value -> HttpCookie.parse(value).stream())
            .forEach(cookie -> {
                if (cookie.getMaxAge() == 0) {
                    cookies.remove(cookie.getName());
                } else {
                    cookies.put(cookie.getName(), cookie.getValue());
                }
            });
        return response;
    }
}
