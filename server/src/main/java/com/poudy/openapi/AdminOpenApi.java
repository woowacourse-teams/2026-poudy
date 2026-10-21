package com.poudy.openapi;

import com.poudy.security.AccessRule;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class AdminOpenApi implements OpenApiCustomizer {

    @Override
    public void customise(OpenAPI openApi) {
        openApi.getComponents()
            .addSecuritySchemes(
                "UserSession",
                new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                    .in(SecurityScheme.In.COOKIE).name("JSESSIONID")
                    .description("사용자 세션. OAuth 로그인으로 발급되며 브라우저가 자동 전달합니다. 직접 입력하지 않습니다.")
            )
            .addSecuritySchemes(
                "AdminSession",
                new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                    .in(SecurityScheme.In.COOKIE).name("POUDY_ADMIN_SESSION")
                    .description("관리자 세션. 관리자 로그인으로 발급되며 브라우저가 자동 전달합니다. 직접 입력하지 않습니다.")
            );
        openApi.getPaths().forEach((path, item) -> {
            if (AccessRule.USER.protects(path)) {
                item.readOperations()
                    .forEach(operation -> operation.addSecurityItem(new SecurityRequirement().addList("UserSession")));
            }
            if (AccessRule.ADMIN.protects(path)) {
                item.readOperations()
                    .forEach(operation -> operation.addSecurityItem(new SecurityRequirement().addList("AdminSession")));
            }
        });
        openApi.setServers(List.of(new Server().url("/").description("현재 서버")));
        openApi.getInfo().setDescription("""
            ### 사용자 로그인

            [카카오 로그인](/login/swagger?provider=kakao&popup=1) · [구글 로그인](/login/swagger?provider=google&popup=1)

            링크를 누르면 새 탭에서 로그인합니다. 신규 회원은 가입과 프로필 입력(건너뛰기 포함)을 완료하면 로그인 탭이 닫히고 기존 Swagger 탭의 상태가 갱신됩니다.
            이후 회원 API를 실행하면 사용자 세션 쿠키가 자동으로 전달됩니다.
            관리자 로그인과 사용자 로그인은 별도로 유지됩니다.
            API의 자물쇠는 필요한 세션 종류를 나타내며, 실제 로그인 여부는 화면 상단에서 확인합니다.
            """);
    }
}
