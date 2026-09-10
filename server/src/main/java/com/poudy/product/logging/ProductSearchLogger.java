package com.poudy.product.logging;

import com.poudy.exception.ErrorCode;
import com.poudy.product.domain.ProductSort;
import com.poudy.search.domain.SearchKeyword;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ProductSearchLogger {

    static final int MAX_KEYWORD_CODE_POINTS = 100;

    private static final Logger log = LoggerFactory.getLogger(ProductSearchLogger.class);

    public void completed(Context context, long elapsedNanos, long resultCount) {
        Objects.requireNonNull(context);
        log.info(
            "event=search_completed searchType=PRODUCT_SEARCH keyword=\"{}\" page={} size={} sort={} filtered={} durationMs={} resultCount={} outcome={}",
            safeKeyword(context.keyword()),
            context.page(),
            context.size(),
            context.sort(),
            context.filtered(),
            elapsedMillis(elapsedNanos),
            resultCount,
            outcomeOf(resultCount)
        );
    }

    public void failed(Context context, long elapsedNanos) {
        Objects.requireNonNull(context);
        log.warn(
            "event=search_completed searchType=PRODUCT_SEARCH keyword=\"{}\" page={} size={} sort={} filtered={} durationMs={} outcome={} errorCode={}",
            safeKeyword(context.keyword()),
            context.page(),
            context.size(),
            context.sort(),
            context.filtered(),
            elapsedMillis(elapsedNanos),
            SearchOutcome.ERROR,
            ErrorCode.INTERNAL_SERVER_ERROR
        );
    }

    private static SearchOutcome outcomeOf(long resultCount) {
        if (resultCount == 0) {
            return SearchOutcome.NO_RESULT;
        }
        return SearchOutcome.SUCCESS;
    }

    private static String elapsedMillis(long elapsedNanos) {
        long elapsedMicros = TimeUnit.NANOSECONDS.toMicros(elapsedNanos);
        return "%d.%03d".formatted(elapsedMicros / 1_000, elapsedMicros % 1_000);
    }

    private static String safeKeyword(SearchKeyword keyword) {
        String normalized = keyword.value();
        StringBuilder safe = new StringBuilder();

        normalized.codePoints()
            .filter(codePoint -> !Character.isISOControl(codePoint))
            .limit(MAX_KEYWORD_CODE_POINTS)
            .forEach(safe::appendCodePoint);

        return safe.toString()
            .replace("\\", "\\\\")
            .replace("\"", "\\\"");
    }

    public record Context(
        SearchKeyword keyword,
        int page,
        int size,
        ProductSort sort,
        boolean filtered) {

        public Context {
            Objects.requireNonNull(keyword);
            Objects.requireNonNull(sort);
        }
    }

    private enum SearchOutcome {
        SUCCESS,
        NO_RESULT,
        ERROR
    }
}
