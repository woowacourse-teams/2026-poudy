package com.poudy.exception;

import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public static final String CODE_PROPERTY = "code";
    public static final String ERRORS_PROPERTY = "errors";

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String SERVER_ERROR_MESSAGE = "서버에서 요청을 처리하지 못했습니다.";
    private static final Set<String> PAGINATION_FIELDS = Set.of("page", "size");
    private static final String INVALID_VALUE_MESSAGE = "%s 값이 올바르지 않습니다.";
    private static final String INVALID_INPUT_MESSAGE = "입력값이 올바르지 않습니다.";

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetail> handleArgumentTypeMismatch(MethodArgumentTypeMismatchException exception) {
        ErrorCode code = exception.getParameter().hasParameterAnnotation(PathVariable.class)
                ? ErrorCode.INVALID_PATH_PARAMETER : ErrorCode.INVALID_QUERY_PARAMETER;

        return problem(HttpStatus.BAD_REQUEST, code, INVALID_VALUE_MESSAGE.formatted(exception.getName()));
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ProblemDetail> handleBindException(BindException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(validationProblem(HttpStatus.BAD_REQUEST, exception.getFieldErrors()));
    }

    @ExceptionHandler(UnknownProductException.class)
    public ResponseEntity<ProblemDetail> handleUnknownProductException(UnknownProductException exception) {
        return problem(HttpStatus.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(UnknownBrandException.class)
    public ResponseEntity<ProblemDetail> handleUnknownBrandException(UnknownBrandException exception) {
        return problem(HttpStatus.NOT_FOUND, ErrorCode.BRAND_NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(UnknownIngredientException.class)
    public ResponseEntity<ProblemDetail> handleUnknownIngredientException(UnknownIngredientException exception) {
        return problem(HttpStatus.NOT_FOUND, ErrorCode.INGREDIENT_NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(IncompatibleIngredientFilterException.class)
    public ResponseEntity<ProblemDetail> handleIncompatibleIngredientFilterException(
            IncompatibleIngredientFilterException exception) {
        return problem(HttpStatus.CONFLICT, ErrorCode.CONFLICTING_INGREDIENT_FILTER, exception.getMessage());
    }

    @ExceptionHandler(CatalogAccessException.class)
    public ResponseEntity<ProblemDetail> handleCatalogAccessException(CatalogAccessException exception) {
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, SERVER_ERROR_MESSAGE);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(validationProblem(HttpStatus.BAD_REQUEST, exception.getFieldErrors()));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemDetail> handleHandlerMethodValidationException(
            HandlerMethodValidationException exception) {
        return problem(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_QUERY_PARAMETER,
                ErrorCode.INVALID_QUERY_PARAMETER.message());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProblemDetail> handleMissingServletRequestParameter(
            MissingServletRequestParameterException exception) {
        return problem(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_QUERY_PARAMETER,
                "%s 파라미터가 필요합니다.".formatted(exception.getParameterName()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ProblemDetail> handleNoResourceFoundException(NoResourceFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, ErrorCode.ENDPOINT_NOT_FOUND, ErrorCode.ENDPOINT_NOT_FOUND.message());
    }

    @ExceptionHandler({
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class,
            HttpMessageNotReadableException.class})
    public ResponseEntity<ProblemDetail> handleUnsupportedRequest(Exception exception) {
        HttpStatusCode status = ((ErrorResponse) exception).getStatusCode();

        return problem(status, ErrorCode.UNSUPPORTED_REQUEST, ErrorCode.UNSUPPORTED_REQUEST.message());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleAllUncaughtException(Exception exception) {
        log.error("Unexpected exception occurred", exception);

        return problem(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, SERVER_ERROR_MESSAGE);
    }

    private ProblemDetail validationProblem(HttpStatusCode status, List<FieldError> fieldErrors) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, INVALID_INPUT_MESSAGE);
        problemDetail.setProperty(CODE_PROPERTY, bindErrorCode(fieldErrors));
        problemDetail.setProperty(
                ERRORS_PROPERTY,
                fieldErrors.stream().map(error -> new ValidationError(error.getField(), error.getDefaultMessage()))
                        .toList());

        return problemDetail;
    }

    private ErrorCode bindErrorCode(FieldError error) {
        return !error.isBindingFailure() && PAGINATION_FIELDS.contains(error.getField())
                ? ErrorCode.INVALID_PAGINATION_PARAMETER : ErrorCode.INVALID_QUERY_PARAMETER;
    }

    private ErrorCode bindErrorCode(List<FieldError> fieldErrors) {
        return fieldErrors.stream().findFirst().map(this::bindErrorCode).orElse(ErrorCode.INVALID_QUERY_PARAMETER);
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatusCode status, ErrorCode code, String detail) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
        problemDetail.setProperty(CODE_PROPERTY, code);

        return ResponseEntity.status(status).body(problemDetail);
    }
}
