package com.poudy.openapi;

import com.poudy.exception.ErrorCode;
import com.poudy.security.AccessRule;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.login.web.RegisteredProviderRequestResolver;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.PathParameter;
import io.swagger.v3.oas.models.parameters.QueryParameter;
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
    private static final String MEMBER_TAG = "회원";
    private static final String ADMIN_TAG = "관리자";

    @Bean
    public OpenApiCustomizer securityPathCustomizer() {
        return openApi -> openApi.getPaths()
            .addPathItem(ErrorResponseCodes.SOCIAL_LOGIN_PATH, socialLoginPath())
            .addPathItem(
                AccessRule.MEMBER.logoutPath(),
                logoutPath(MEMBER_TAG, "logout", "로그아웃", "회원 세션을 끝낸다. 관리자 세션은 끝내지 않는다.")
            )
            .addPathItem(
                AccessRule.ADMIN.logoutPath(),
                logoutPath(ADMIN_TAG, "adminLogout", "관리자 로그아웃", "관리자 세션을 끝낸다. 회원 세션은 끝내지 않는다.")
            );
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
                        + "status에 SIGNED_IN, 탈퇴한 계정이면 WITHDRAWN, 이미 복구를 요청했으면 RESTORE_REQUESTED를 붙인다. "
                        + "실패하면 error(오류 코드)와 이메일 중복 시 provider(기존 제공자)를 붙인다."
                )
                .addParametersItem(
                    new PathParameter().name("provider").required(true).schema(new StringSchema()._enum(providers))
                )
                .addParametersItem(
                    new QueryParameter().name(RegisteredProviderRequestResolver.RETURN_ORIGIN_PARAMETER).required(false)
                        .description("Preview의 복귀 오리진. 허용된 오리진만 사용하며 누락되거나 유효하지 않으면 기본 프론트로 돌아간다.")
                        .schema(new StringSchema().example("https://pr-111.preview.poudy.site"))
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

    private PathItem logoutPath(String tag, String operationId, String summary, String description) {
        return new PathItem().post(
            new Operation()
                .addTagsItem(tag)
                .operationId(operationId)
                .summary(summary)
                .description(description)
                .responses(
                    new ApiResponses()
                        .addApiResponse("204", new ApiResponse().description("로그아웃 성공"))
                        .addApiResponse(
                            "401",
                            ProblemDetailResponses.of("로그인 필요", HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED)
                        )
                        .addApiResponse(
                            "403",
                            ProblemDetailResponses.of("다른 역할의 세션", HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN)
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
}
