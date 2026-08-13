package com.poudy.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
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

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> handleConflictException(ConflictException exception) {
        return problem(HttpStatus.CONFLICT, exception.code(), exception.getMessage());
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
            Exception exception,
            Object body,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        ResponseEntity<Object> response = super.handleExceptionInternal(exception, body, headers, status, request);

        if (response != null && response.getBody() instanceof ProblemDetail problemDetail) {
            ErrorCode code = frameworkCode(status);
            problemDetail.setDetail(code.message());
            problemDetail.setProperty(CODE_PROPERTY, code);
        }

        return response;
    }

    private ErrorCode frameworkCode(HttpStatusCode status) {
        if (status.is5xxServerError()) {
            return ErrorCode.INTERNAL_SERVER_ERROR;
        }

        if (status.isSameCodeAs(HttpStatus.BAD_REQUEST)) {
            return ErrorCode.INVALID_QUERY_PARAMETER;
        }
        if (status.isSameCodeAs(HttpStatus.NOT_FOUND)) {
            return ErrorCode.ENDPOINT_NOT_FOUND;
        }

        return ErrorCode.UNSUPPORTED_REQUEST;
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
