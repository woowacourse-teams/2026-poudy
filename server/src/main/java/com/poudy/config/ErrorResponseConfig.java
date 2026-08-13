package com.poudy.config;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.GlobalExceptionHandler;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;

@Configuration
public class ErrorResponseConfig {

    private static final String SCHEMA_NAME = "ProblemDetail";
    private static final String SCHEMA_REF = "#/components/schemas/" + SCHEMA_NAME;
    private static final String PROBLEM_JSON = org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE;

    private static final Map<String, ErrorCode> NOT_FOUND_CODES = Map.of(
            "brands",
            ErrorCode.BRAND_NOT_FOUND,
            "ingredients",
            ErrorCode.INGREDIENT_NOT_FOUND,
            "products",
            ErrorCode.PRODUCT_NOT_FOUND);

    @Bean
    public OpenApiCustomizer errorResponseCustomizer() {
        return openApi -> {
            openApi.getComponents().addSchemas(SCHEMA_NAME, problemDetailSchema());

            openApi.getPaths().forEach((path, pathItem) -> pathItem.readOperations().forEach(operation -> {
                ApiResponses responses = operation.getResponses();
                responses.addApiResponse(
                        "400",
                        errorResponse("잘못된 요청", HttpStatus.BAD_REQUEST, ErrorCode.INVALID_QUERY_PARAMETER));
                notFoundCode(path).ifPresent(
                        code -> responses
                                .addApiResponse("404", errorResponse("대상을 찾을 수 없음", HttpStatus.NOT_FOUND, code)));
                if (isProductFilterPath(path)) {
                    responses.addApiResponse(
                            "409",
                            errorResponse("요청 충돌", HttpStatus.CONFLICT, ErrorCode.CONFLICTING_INGREDIENT_FILTER));
                }
                responses.addApiResponse(
                        "500",
                        errorResponse("서버 오류", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR));
            }));
        };
    }

    private boolean isProductFilterPath(String path) {
        return "/api/products".equals(path) || "/api/products/count".equals(path);
    }

    private Optional<ErrorCode> notFoundCode(String path) {
        if (!path.contains("{")) {
            return Optional.empty();
        }

        String[] segments = path.split("/");

        return segments.length > 2 ? Optional.ofNullable(NOT_FOUND_CODES.get(segments[2])) : Optional.empty();
    }

    private Schema<?> problemDetailSchema() {
        List<String> codes = Arrays.stream(ErrorCode.values()).map(Enum::name).toList();
        ObjectSchema schema = new ObjectSchema();
        schema.addProperty("type", new StringSchema().format("uri").example("about:blank"));
        schema.addProperty("title", new StringSchema().example("Bad Request"));
        schema.addProperty("status", new IntegerSchema().example(400));
        schema.addProperty("detail", new StringSchema().example(ErrorCode.INVALID_QUERY_PARAMETER.message()));
        schema.addProperty("instance", new StringSchema().format("uri").example("/api/products"));
        schema.addProperty(GlobalExceptionHandler.CODE_PROPERTY, new StringSchema()._enum(codes));
        schema.setRequired(List.of("title", "status", "detail", GlobalExceptionHandler.CODE_PROPERTY));

        return schema;
    }

    private ApiResponse errorResponse(String description, HttpStatus status, ErrorCode code) {
        Map<String, Object> example = new LinkedHashMap<>();
        example.put("title", status.getReasonPhrase());
        example.put("status", status.value());
        example.put("detail", code.message());
        example.put(GlobalExceptionHandler.CODE_PROPERTY, code.name());

        MediaType mediaType = new MediaType().schema(new Schema<>().$ref(SCHEMA_REF)).example(example);

        return new ApiResponse().description(description).content(new Content().addMediaType(PROBLEM_JSON, mediaType));
    }
}
