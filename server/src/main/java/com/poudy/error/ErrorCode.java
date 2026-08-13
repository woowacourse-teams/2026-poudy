package com.poudy.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    INVALID_PATH_PARAMETER(HttpStatus.BAD_REQUEST), INVALID_QUERY_PARAMETER(
            HttpStatus.BAD_REQUEST), CONFLICTING_INGREDIENT_FILTER(HttpStatus.BAD_REQUEST), PRODUCT_NOT_FOUND(
                    HttpStatus.NOT_FOUND), BRAND_NOT_FOUND(HttpStatus.NOT_FOUND), INGREDIENT_NOT_FOUND(
                            HttpStatus.NOT_FOUND), INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
