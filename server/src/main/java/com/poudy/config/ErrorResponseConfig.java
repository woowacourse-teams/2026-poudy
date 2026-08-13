package com.poudy.config;

import com.poudy.error.ErrorResponse;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.Map;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 에러 응답은 모든 엔드포인트가 같은 형태를 쓰므로 컨트롤러마다 애노테이션을 붙이지 않고
 * 문서를 만들 때 한 곳에서 채운다. 경로 변수가 있는 엔드포인트에만 404 를 붙인다.
 */
@Configuration
public class ErrorResponseConfig {

    private static final String SCHEMA_NAME = "ErrorResponse";
    private static final String SCHEMA_REF = "#/components/schemas/" + SCHEMA_NAME;
    private static final String JSON = org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

    @Bean
    public OpenApiCustomizer errorResponseCustomizer() {
        return openApi -> {
            Map<String, Schema> schemas = ModelConverters.getInstance().readAll(ErrorResponse.class);
            schemas.forEach((name, schema) -> openApi.getComponents().addSchemas(name, schema));

            openApi.getPaths().forEach((path, pathItem) -> pathItem.readOperations().forEach(operation -> {
                ApiResponses responses = operation.getResponses();
                responses.addApiResponse("400", errorResponse("잘못된 요청"));
                if (path.contains("{")) {
                    responses.addApiResponse("404", errorResponse("대상을 찾을 수 없음"));
                }
                responses.addApiResponse("500", errorResponse("서버 오류"));
            }));
        };
    }

    private ApiResponse errorResponse(String description) {
        return new ApiResponse().description(description)
                .content(new Content().addMediaType(JSON, new MediaType().schema(new Schema<>().$ref(SCHEMA_REF))));
    }
}
