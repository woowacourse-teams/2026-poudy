package com.poudy.error;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        ErrorCode code = exception.getParameter().hasParameterAnnotation(PathVariable.class)
                ? ErrorCode.INVALID_PATH_PARAMETER : ErrorCode.INVALID_QUERY_PARAMETER;

        return toResponse(code, "%s 값이 올바르지 않습니다.".formatted(exception.getName()));
    }

    @ExceptionHandler({BindException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<ErrorResponse> handleBind(BindException exception) {
        return toResponse(ErrorCode.INVALID_QUERY_PARAMETER, firstFieldMessage(exception));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException exception) {
        return toResponse(ErrorCode.INVALID_QUERY_PARAMETER, "요청 파라미터 값이 올바르지 않습니다.");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException exception) {
        return toResponse(ErrorCode.INVALID_QUERY_PARAMETER, "%s 파라미터가 필요합니다.".formatted(exception.getParameterName()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(RuntimeException exception) {
        return toResponse(ErrorCode.INTERNAL_SERVER_ERROR, "서버에서 요청을 처리하지 못했습니다.");
    }

    private String firstFieldMessage(BindException exception) {
        return exception.getFieldErrors().stream().findFirst()
                .map(error -> "%s 값이 올바르지 않습니다.".formatted(error.getField())).orElse("요청 파라미터 값이 올바르지 않습니다.");
    }

    private ResponseEntity<ErrorResponse> toResponse(ErrorCode code, String message) {
        return ResponseEntity.status(code.status()).body(ErrorResponse.of(code, message));
    }
}
