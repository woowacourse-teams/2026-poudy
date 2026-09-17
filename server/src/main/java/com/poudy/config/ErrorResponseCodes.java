package com.poudy.config;

import com.poudy.exception.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class ErrorResponseCodes {

    private static final String PRODUCTS_PATH = "/api/products";
    private static final String PRODUCTS_COUNT_PATH = "/api/products/count";
    private static final String PRODUCT_REQUESTS_PATH = "/api/products/registration-requests";
    private static final String FEEDBACK_PATH = "/api/feedbacks";
    private static final String PRODUCT_CORRECTION_REQUESTS_PATH = "/api/products/{productId}/correction-requests";
    private static final String PENDING_IMAGES_PATH = "/api/pending-images";
    private static final String ADMIN_LOGIN_PATH = "/api/admin/login";
    private static final String ADMIN_FEEDBACKS_PATH = "/api/admin/feedbacks";
    private static final String ADMIN_PRODUCT_REQUESTS_PATH = "/api/admin/product-requests";

    private static final Map<String, ErrorCode> NOT_FOUND_CODES = Map.of(
        "brands",
        ErrorCode.BRAND_NOT_FOUND,
        "curations",
        ErrorCode.CURATION_NOT_FOUND,
        "ingredients",
        ErrorCode.INGREDIENT_NOT_FOUND,
        "products",
        ErrorCode.PRODUCT_NOT_FOUND
    );

    private ErrorResponseCodes() {
    }

    public static List<ErrorCode> badRequest(String path) {
        if (PRODUCT_REQUESTS_PATH.equals(path)) {
            return List.of(ErrorCode.INVALID_REQUEST_BODY);
        }
        if (FEEDBACK_PATH.equals(path)) {
            return List.of(ErrorCode.INVALID_REQUEST_BODY, ErrorCode.INVALID_FEEDBACK_IMAGE_ID);
        }
        if (PRODUCT_CORRECTION_REQUESTS_PATH.equals(path)) {
            return List.of(
                ErrorCode.INVALID_QUERY_PARAMETER,
                ErrorCode.INVALID_REQUEST_BODY,
                ErrorCode.INVALID_FEEDBACK_IMAGE_ID
            );
        }
        if (PENDING_IMAGES_PATH.equals(path)) {
            return List.of(ErrorCode.INVALID_FEEDBACK_IMAGE);
        }
        if (ADMIN_LOGIN_PATH.equals(path)) {
            return List.of(ErrorCode.INVALID_REQUEST_BODY);
        }
        if (path.startsWith(ADMIN_FEEDBACKS_PATH) || path.startsWith(ADMIN_PRODUCT_REQUESTS_PATH)) {
            return List.of(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.INVALID_REQUEST_BODY);
        }
        if (isProductFilterPath(path)) {
            return List.of(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.CONFLICTING_INGREDIENT_FILTER);
        }

        return List.of(ErrorCode.INVALID_QUERY_PARAMETER);
    }

    public static boolean rateLimited(String path) {
        return PRODUCT_REQUESTS_PATH.equals(path)
            || FEEDBACK_PATH.equals(path)
            || PRODUCT_CORRECTION_REQUESTS_PATH.equals(path)
            || PENDING_IMAGES_PATH.equals(path);
    }

    public static boolean payloadLimited(String path) {
        return PENDING_IMAGES_PATH.equals(path);
    }

    public static Optional<ErrorCode> notFound(String path) {
        if (!path.contains("{")) {
            return Optional.empty();
        }

        if (path.startsWith("/api/admin/feedbacks/")) {
            return Optional.of(ErrorCode.FEEDBACK_NOT_FOUND);
        }
        if (path.startsWith("/api/admin/product-requests/")) {
            return Optional.of(ErrorCode.PRODUCT_REQUEST_NOT_FOUND);
        }

        String[] segments = path.split("/");

        if (segments.length <= 2) {
            return Optional.empty();
        }

        return Optional.ofNullable(NOT_FOUND_CODES.get(segments[2]));
    }

    private static boolean isProductFilterPath(String path) {
        return PRODUCTS_PATH.equals(path) || PRODUCTS_COUNT_PATH.equals(path);
    }
}
