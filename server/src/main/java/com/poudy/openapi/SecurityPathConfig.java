package com.poudy.openapi;

import com.poudy.exception.ErrorCode;
import com.poudy.security.SecurityConfig;
import com.poudy.security.domain.OAuthProvider;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.PathParameter;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

@Configuration
public class SecurityPathConfig {

    private static final String TAG = "인증";

    @Bean
    public OpenApiCustomizer securityPathCustomizer() {
        return openApi -> openApi.getPaths()
            .addPathItem(ErrorResponseCodes.SOCIAL_LOGIN_PATH, socialLoginPath())
            .addPathItem(SecurityConfig.LOGOUT_URI, logoutPath());
    }

    private PathItem socialLoginPath() {
        List<String> providers = Arrays.stream(OAuthProvider.values())
            .map(provider -> provider.name().toLowerCase(Locale.ROOT))
            .toList();

        return new PathItem().get(
            new Operation()
                .addTagsItem(TAG)
                .operationId("startSocialLogin")
                .summary("소셜 로그인 시작")
                .description(
                    "제공자 로그인 화면으로 보낸다. fetch가 아니라 페이지 이동으로 연다. "
                        + "로그인을 마치면 프론트의 /login/callback으로 돌아오고, "
                        + "실패하면 error(오류 코드)와 이메일 중복 시 provider(기존 제공자)를 붙인다."
                )
                .addParametersItem(
                    new PathParameter().name("provider").required(true).schema(new StringSchema()._enum(providers))
                )
                .responses(
                    new ApiResponses()
                        .addApiResponse(
                            "302",
                            new ApiResponse()
                                .description("제공자 로그인 화면으로 이동")
                                .addHeaderObject(HttpHeaders.LOCATION, new Header().schema(new StringSchema()))
                        )
                        .addApiResponse(
                            "404",
                            ProblemDetailResponses.of(
                                "대상을 찾을 수 없음",
                                HttpStatus.NOT_FOUND,
                                ErrorResponseCodes.notFound(ErrorResponseCodes.SOCIAL_LOGIN_PATH)
                            )
                        )
                        .addApiResponse(
                            "500",
                            ProblemDetailResponses.of(
                                "서버 오류",
                                HttpStatus.INTERNAL_SERVER_ERROR,
                                ErrorCode.INTERNAL_SERVER_ERROR
                            )
                        )
                )
        );
    }

    private PathItem logoutPath() {
        return new PathItem().post(
            new Operation()
                .addTagsItem(TAG)
                .operationId("logout")
                .summary("로그아웃")
                .description("로그인 세션을 끝낸다. 로그인하지 않았어도 성공한다.")
                .responses(
                    new ApiResponses()
                        .addApiResponse("204", new ApiResponse().description("로그아웃 성공"))
                        .addApiResponse(
                            "500",
                            ProblemDetailResponses.of(
                                "서버 오류",
                                HttpStatus.INTERNAL_SERVER_ERROR,
                                ErrorCode.INTERNAL_SERVER_ERROR
                            )
                        )
                )
        );
    }
}
