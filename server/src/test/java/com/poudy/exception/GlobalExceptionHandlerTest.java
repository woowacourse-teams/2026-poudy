package com.poudy.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanInstantiationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

@DisplayName("전역 예외 처리기")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("커스텀 예외를 각각의 상태 코드로 변환한다")
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
                handler.handleInvalidRequestException(
                        new InvalidRequestException(ErrorCode.CONFLICTING_INGREDIENT_FILTER)),
                HttpStatus.BAD_REQUEST,
                ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }

    @Test
    @DisplayName("대상 구분은 예외 타입이 아니라 ErrorCode 가 한다")
    void distinguishesTargetsByErrorCodeAlone() {
        ResponseEntity<ProblemDetail> product = handler
                .handleResourceNotFoundException(new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        ResponseEntity<ProblemDetail> ingredient = handler
                .handleResourceNotFoundException(new ResourceNotFoundException(ErrorCode.INGREDIENT_NOT_FOUND));

        assertProblem(product, HttpStatus.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
        assertProblem(ingredient, HttpStatus.NOT_FOUND, ErrorCode.INGREDIENT_NOT_FOUND);
    }

    @Test
    @DisplayName("바인딩 중 생성자가 던진 요청 예외를 원래 코드와 400 으로 되돌린다")
    void unwrapsInvalidRequestExceptionThrownWhileBinding() {
        BeanInstantiationException exception = new BeanInstantiationException(
                Object.class,
                "Constructor threw exception",
                new InvalidRequestException(ErrorCode.CONFLICTING_INGREDIENT_FILTER));

        assertProblem(
                handler.handleBeanInstantiationException(exception),
                HttpStatus.BAD_REQUEST,
                ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }

    @Test
    @DisplayName("바인딩 실패의 원인이 요청 예외가 아니면 500 으로 처리한다")
    void keepsOtherBindingFailuresAsServerError() {
        BeanInstantiationException exception = new BeanInstantiationException(
                Object.class,
                "Constructor threw exception",
                new IllegalStateException("database password"));

        ResponseEntity<ProblemDetail> response = handler.handleBeanInstantiationException(exception);

        assertProblem(response, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.message());
    }

    @Test
    @DisplayName("인프라 예외의 원인 메시지를 응답에 싣지 않는다")
    void infrastructureExceptionHidesInternalMessage() {
        ResponseEntity<ProblemDetail> response = handler.handleInfrastructureException(
                new InfrastructureException("database password", new RuntimeException()));

        assertProblem(response, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.message());
    }

    @Test
    @DisplayName("처리하지 못한 예외의 메시지를 응답에 싣지 않는다")
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
