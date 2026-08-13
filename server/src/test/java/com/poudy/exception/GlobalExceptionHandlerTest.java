package com.poudy.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void invalidInputExceptionReturnsBadRequest() {
        ResponseEntity<ProblemDetail> response = handler
                .handleInvalidInputException(new InvalidInputException(ErrorCode.INVALID_QUERY_PARAMETER));

        assertProblem(response, HttpStatus.BAD_REQUEST, ErrorCode.INVALID_QUERY_PARAMETER);
    }

    @Test
    void entityNotFoundExceptionReturnsNotFound() {
        ResponseEntity<ProblemDetail> response = handler
                .handleEntityNotFoundException(new EntityNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        assertProblem(response, HttpStatus.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    @Test
    void businessRuleViolationExceptionReturnsConflict() {
        ResponseEntity<ProblemDetail> response = handler.handleBusinessRuleViolationException(
                new BusinessRuleViolationException(ErrorCode.CONFLICTING_INGREDIENT_FILTER));

        assertProblem(response, HttpStatus.CONFLICT, ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }

    @Test
    void infrastructureExceptionHidesInternalMessage() {
        ResponseEntity<ProblemDetail> response = handler.handleInfrastructureException(
                new InfrastructureException("database password", new RuntimeException()));

        assertProblem(response, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.message());
    }

    @Test
    void uncaughtExceptionHidesInternalMessage() {
        ResponseEntity<ProblemDetail> response = handler
                .handleAllUncaughtException(new RuntimeException("database password"));

        assertProblem(response, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.message());
    }

    @Test
    void methodArgumentNotValidReturnsValidationErrors() throws Exception {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError("request", "name", "이름은 필수입니다."));
        Method method = ValidationTarget.class.getDeclaredMethod("validate", String.class);
        MethodArgumentNotValidException exception = new MethodArgumentNotValidException(
                new MethodParameter(method, 0),
                bindingResult);

        ResponseEntity<ProblemDetail> response = handler.handleMethodArgumentNotValid(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isInstanceOf(ProblemDetail.class);
        ProblemDetail problemDetail = (ProblemDetail) response.getBody();
        assertThat(problemDetail.getDetail()).isEqualTo("입력값이 올바르지 않습니다.");
        assertThat(problemDetail.getProperties())
                .containsEntry(GlobalExceptionHandler.CODE_PROPERTY, ErrorCode.INVALID_QUERY_PARAMETER);
        assertThat(problemDetail.getProperties()).containsEntry(
                GlobalExceptionHandler.ERRORS_PROPERTY,
                List.of(new ValidationError("name", "이름은 필수입니다.")));
    }

    private void assertProblem(ResponseEntity<ProblemDetail> response, HttpStatus status, ErrorCode code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).containsEntry(GlobalExceptionHandler.CODE_PROPERTY, code);
    }

    private static class ValidationTarget {

        void validate(String name) {
        }
    }
}
