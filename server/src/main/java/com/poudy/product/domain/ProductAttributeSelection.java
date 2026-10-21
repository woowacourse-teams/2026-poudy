package com.poudy.product.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;
import java.util.regex.Pattern;

public record ProductAttributeSelection(String attributeCode, String valueCode) {

    private static final Pattern CODE = Pattern.compile("[A-Z][A-Z0-9_]{0,49}");

    public ProductAttributeSelection {
        if (attributeCode == null || valueCode == null
            || !CODE.matcher(attributeCode).matches() || !CODE.matcher(valueCode).matches()) {
            throw new InvalidAttributeSelectionException();
        }
    }

    public static ProductAttributeSelection parse(String text) {
        if (text == null || text.indexOf(':') < 0) {
            throw new InvalidAttributeSelectionException();
        }
        int separator = text.indexOf(':');
        return new ProductAttributeSelection(text.substring(0, separator), text.substring(separator + 1));
    }

    public String key() {
        return attributeCode + ":" + valueCode;
    }

    private static final class InvalidAttributeSelectionException extends RuleViolationException {
        private InvalidAttributeSelectionException() {
            super(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.INVALID_QUERY_PARAMETER.message());
        }
    }
}
