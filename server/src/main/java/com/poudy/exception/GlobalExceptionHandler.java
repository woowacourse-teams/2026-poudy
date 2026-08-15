package com.poudy.exception;

import com.poudy.product.controller.dto.ConflictingIngredientFilter;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanInstantiationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    public static final String CODE_PROPERTY = "code";

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ProblemDetail> handleInvalidRequestException(InvalidRequestException exception) {
        return problem(HttpStatus.BAD_REQUEST, exception.code(), exception.getMessage());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFoundException(ResourceNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, exception.code(), exception.getMessage());
    }

    // 바인딩 중 요청 DTO 생성자가 던진 예외는 스프링이 BeanInstantiationException 으로 감싼다.
    // 풀지 않으면 요청 오류가 500 으로 나간다.
    @ExceptionHandler(BeanInstantiationException.class)
    public ResponseEntity<ProblemDetail> handleBeanInstantiationException(BeanInstantiationException exception) {
        if (exception.getCause() instanceof InvalidRequestException cause) {
            return problem(HttpStatus.BAD_REQUEST, cause.code(), cause.getMessage());
        }

        log.error("Request binding failure", exception);

        return serverError();
    }

    @ExceptionHandler(InfrastructureException.class)
    public ResponseEntity<ProblemDetail> handleInfrastructureException(InfrastructureException exception) {
        log.error("Infrastructure failure", exception);

        return serverError();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleAllUncaughtException(Exception exception) {
        log.error("Unexpected exception occurred", exception);

        return serverError();
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            @NonNull Exception exception,
            Object body,
            @NonNull HttpHeaders headers,
            @NonNull HttpStatusCode status,
            @NonNull WebRequest request) {
        ResponseEntity<Object> response = super.handleExceptionInternal(exception, body, headers, status, request);

        if (response != null && response.getBody() instanceof ProblemDetail problemDetail) {
            ErrorCode code = frameworkCode(status, exception);
            problemDetail.setDetail(code.message());
            problemDetail.setProperty(CODE_PROPERTY, code);
        }

        return response;
    }

    private ErrorCode frameworkCode(HttpStatusCode status, Exception exception) {
        if (status.is5xxServerError()) {
            return ErrorCode.INTERNAL_SERVER_ERROR;
        }

        if (status.isSameCodeAs(HttpStatus.BAD_REQUEST)) {
            return bindingCode(exception);
        }
        if (status.isSameCodeAs(HttpStatus.NOT_FOUND)) {
            return ErrorCode.ENDPOINT_NOT_FOUND;
        }

        return ErrorCode.UNSUPPORTED_REQUEST;
    }

    // 바인딩 검증 실패는 모두 400 이라 상태만으로는 구분되지 않는다. 전용 코드를 가진 제약은
    // 위반 목록에서 찾아 그 코드로 돌려준다.
    private ErrorCode bindingCode(Exception exception) {
        if (exception instanceof BindException bindException) {
            return bindException.getAllErrors().stream().map(ObjectError::getCode)
                    .filter(ConflictingIngredientFilter.NAME::equals).findFirst()
                    .map(code -> ErrorCode.CONFLICTING_INGREDIENT_FILTER).orElse(ErrorCode.INVALID_QUERY_PARAMETER);
        }

        return ErrorCode.INVALID_QUERY_PARAMETER;
    }

    private ResponseEntity<ProblemDetail> serverError() {
        return problem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR.message());
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatusCode status, ErrorCode code, String detail) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
        problemDetail.setProperty(CODE_PROPERTY, code);

        return ResponseEntity.status(status).body(problemDetail);
    }
}
