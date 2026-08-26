package com.poudy.exception;

import com.poudy.feedback.domain.InvalidFeedbackException;
import com.poudy.feedback.domain.InvalidFeedbackImageException;
import com.poudy.feedback.domain.InvalidFeedbackImageIdException;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.core.JacksonException;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    public static final String CODE_PROPERTY = "code";

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ProblemDetail> handleInvalidRequestException(InvalidRequestException exception) {
        return problem(HttpStatus.BAD_REQUEST, exception.code(), exception.getMessage());
    }

    @ExceptionHandler(InvalidFeedbackException.class)
    public ResponseEntity<ProblemDetail> handleInvalidFeedbackException(InvalidFeedbackException exception) {
        return problem(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_REQUEST_BODY,
                ErrorCode.INVALID_REQUEST_BODY.message());
    }

    @ExceptionHandler(InvalidFeedbackImageException.class)
    public ResponseEntity<ProblemDetail> handleInvalidFeedbackImageException(InvalidFeedbackImageException exception) {
        return problem(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_FEEDBACK_IMAGE,
                ErrorCode.INVALID_FEEDBACK_IMAGE.message());
    }

    @ExceptionHandler(InvalidFeedbackImageIdException.class)
    public ResponseEntity<ProblemDetail> handleInvalidFeedbackImageIdException(
            InvalidFeedbackImageIdException exception) {
        return problem(
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_FEEDBACK_IMAGE_ID,
                ErrorCode.INVALID_FEEDBACK_IMAGE_ID.message());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFoundException(ResourceNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, exception.code(), exception.getMessage());
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ProblemDetail> handleTooManyRequestsException(TooManyRequestsException exception) {
        long retryAfterSeconds = exception.retryAfter().getSeconds();
        if (exception.retryAfter().getNano() > 0) {
            retryAfterSeconds++;
        }
        retryAfterSeconds = Math.max(1, retryAfterSeconds);

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(retryAfterSeconds))
                .body(problemDetail(HttpStatus.TOO_MANY_REQUESTS, ErrorCode.TOO_MANY_REQUESTS, exception.getMessage()));
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
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            @NonNull MaxUploadSizeExceededException exception,
            @NonNull HttpHeaders headers,
            @NonNull HttpStatusCode status,
            @NonNull WebRequest request) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(
                        problemDetail(
                                HttpStatus.PAYLOAD_TOO_LARGE,
                                ErrorCode.PAYLOAD_TOO_LARGE,
                                ErrorCode.PAYLOAD_TOO_LARGE.message()));
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
        if (status.isSameCodeAs(HttpStatus.PAYLOAD_TOO_LARGE)) {
            return ErrorCode.PAYLOAD_TOO_LARGE;
        }

        return ErrorCode.UNSUPPORTED_REQUEST;
    }

    private ErrorCode bindingCode(Exception exception) {
        if (exception instanceof HttpMessageNotReadableException unreadableException) {
            return readsFeedbackImageId(unreadableException)
                    ? ErrorCode.INVALID_FEEDBACK_IMAGE_ID
                    : ErrorCode.INVALID_REQUEST_BODY;
        }

        if (exception instanceof BindException bindException) {
            return bindException.getAllErrors().stream().map(ObjectError::getDefaultMessage)
                    .flatMap(message -> ErrorCode.from(message).stream()).findFirst()
                    .orElse(ErrorCode.INVALID_QUERY_PARAMETER);
        }
        if (exception instanceof MissingServletRequestPartException) {
            return ErrorCode.INVALID_FEEDBACK_IMAGE;
        }

        return ErrorCode.INVALID_QUERY_PARAMETER;
    }

    private static boolean readsFeedbackImageId(HttpMessageNotReadableException exception) {
        return exception.getCause() instanceof JacksonException jacksonException
                && jacksonException.getPath().stream()
                        .anyMatch(reference -> "imageIds".equals(reference.getPropertyName()));
    }

    private ResponseEntity<ProblemDetail> serverError() {
        return problem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR,
                ErrorCode.INTERNAL_SERVER_ERROR.message());
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatusCode status, ErrorCode code, String detail) {
        return ResponseEntity.status(status).body(problemDetail(status, code, detail));
    }

    private ProblemDetail problemDetail(HttpStatusCode status, ErrorCode code, String detail) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
        problemDetail.setProperty(CODE_PROPERTY, code);
        return problemDetail;
    }
}
