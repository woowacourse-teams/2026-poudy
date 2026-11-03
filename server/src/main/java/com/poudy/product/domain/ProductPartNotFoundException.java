package com.poudy.product.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;

public final class ProductPartNotFoundException extends ResourceNotFoundException {
    public ProductPartNotFoundException() {
        super(ErrorCode.PRODUCT_PART_NOT_FOUND);
    }
}
