package com.poudy.config;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.GlobalExceptionHandler;
import io.swagger.v3.oas.models.examples.Example;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

public final class ProblemDetailResponses {

    public static final String SCHEMA_NAME = "ProblemDetail";

    private static final String SCHEMA_REF = "#/components/schemas/" + SCHEMA_NAME;
    private static final String PROBLEM_JSON = org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE;

    private ProblemDetailResponses() {
    }

    public static Schema<?> schema() {
        List<String> codes = Arrays.stream(ErrorCode.values()).map(Enum::name).toList();
        ObjectSchema schema = new ObjectSchema();
        schema.addProperty("type", new StringSchema().format("uri").example("about:blank"));
        schema.addProperty("title", new StringSchema().example("Bad Request"));
        schema.addProperty("status", new IntegerSchema().example(400));
        schema.addProperty("detail", new StringSchema().example(ErrorCode.INVALID_QUERY_PARAMETER.message()));
        schema.addProperty("instance", new StringSchema().format("uri-reference").example("/api/products"));
        schema.addProperty(GlobalExceptionHandler.CODE_PROPERTY, new StringSchema()._enum(codes));
        schema.setRequired(List.of("title", "status", "detail", GlobalExceptionHandler.CODE_PROPERTY));

        return schema;
    }

    public static ApiResponse of(String description, HttpStatus status, ErrorCode code) {
        return of(description, status, List.of(code));
    }

    public static ApiResponse of(String description, HttpStatus status, List<ErrorCode> codes) {
        MediaType mediaType = new MediaType().schema(new Schema<>().$ref(SCHEMA_REF));

        if (codes.size() == 1) {
            mediaType.example(example(status, codes.getFirst()));
        }
        if (codes.size() > 1) {
            for (ErrorCode code : codes) {
                mediaType.addExamples(code.name(), new Example().value(example(status, code)));
            }
        }

        return new ApiResponse().description(description).content(new Content().addMediaType(PROBLEM_JSON, mediaType));
    }

    private static Map<String, Object> example(HttpStatus status, ErrorCode code) {
        Map<String, Object> example = new LinkedHashMap<>();
        example.put("title", status.getReasonPhrase());
        example.put("status", status.value());
        example.put("detail", code.message());
        example.put(GlobalExceptionHandler.CODE_PROPERTY, code.name());

        return example;
    }
}
