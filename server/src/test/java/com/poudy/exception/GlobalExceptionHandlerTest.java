package com.poudy.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsEachCustomExceptionToItsStatus() {
        assertProblem(
                handler.handleInvalidRequestException(new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER)),
                HttpStatus.BAD_REQUEST,
                ErrorCode.INVALID_QUERY_PARAMETER);
        assertProblem(
                handler.handleResourceNotFoundException(new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND)),
                HttpStatus.NOT_FOUND,
                ErrorCode.PRODUCT_NOT_FOUND);
        assertProblem(
                handler.handleConflictException(new ConflictException(ErrorCode.CONFLICTING_INGREDIENT_FILTER)),
                HttpStatus.CONFLICT,
                ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }

    @Test
    void distinguishesTargetsByErrorCodeAlone() {
        ResponseEntity<ProblemDetail> brand = handler
                .handleResourceNotFoundException(new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));

        assertProblem(brand, HttpStatus.NOT_FOUND, ErrorCode.BRAND_NOT_FOUND);
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

    private void assertProblem(ResponseEntity<ProblemDetail> response, HttpStatus status, ErrorCode code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).containsEntry(GlobalExceptionHandler.CODE_PROPERTY, code);
    }
}
