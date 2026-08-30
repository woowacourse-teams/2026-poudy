package com.poudy.product.logging;

import com.poudy.exception.ErrorCode;
import com.poudy.product.domain.ProductSort;
import com.poudy.search.domain.SearchKeyword;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import java.util.function.ToLongFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ProductSearchLogger {

    static final int MAX_KEYWORD_CODE_POINTS = 100;

    private static final Logger log = LoggerFactory.getLogger(ProductSearchLogger.class);

    public <T> T analyze(
        Context context,
        Supplier<T> search,
        ToLongFunction<T> resultCount
    ) {
        Objects.requireNonNull(context);
        Objects.requireNonNull(search);
        Objects.requireNonNull(resultCount);

        long startedAt = System.nanoTime();

        try {
            T result = search.get();
            long count = resultCount.applyAsLong(result);
            logCompleted(context, elapsedMillis(startedAt), count);
            return result;
        } catch (RuntimeException exception) {
            logFailed(context, elapsedMillis(startedAt));
            throw exception;
        }
    }

    private void logCompleted(Context context, String durationMillis, long resultCount) {
        log.info(
            "event=search_completed searchType=PRODUCT_SEARCH keyword=\"{}\" page={} size={} sort={} filtered={} durationMs={} resultCount={} outcome={}",
            safeKeyword(context.keyword()),
            context.page(),
            context.size(),
            context.sort(),
            context.filtered(),
            durationMillis,
            resultCount,
            resultCount == 0 ? SearchOutcome.NO_RESULT : SearchOutcome.SUCCESS
        );
    }

    private void logFailed(Context context, String durationMillis) {
        log.warn(
            "event=search_completed searchType=PRODUCT_SEARCH keyword=\"{}\" page={} size={} sort={} filtered={} durationMs={} outcome={} errorCode={}",
            safeKeyword(context.keyword()),
            context.page(),
            context.size(),
            context.sort(),
            context.filtered(),
            durationMillis,
            SearchOutcome.ERROR,
            ErrorCode.INTERNAL_SERVER_ERROR
        );
    }

    private static String elapsedMillis(long startedAt) {
        long elapsedMicros = TimeUnit.NANOSECONDS.toMicros(System.nanoTime() - startedAt);
        return "%d.%03d".formatted(elapsedMicros / 1_000, elapsedMicros % 1_000);
    }

    private static String safeKeyword(String keyword) {
        String normalized = new SearchKeyword(keyword).value();
        StringBuilder safe = new StringBuilder();

        normalized.codePoints()
            .filter(codePoint -> !Character.isISOControl(codePoint))
            .limit(MAX_KEYWORD_CODE_POINTS)
            .forEach(safe::appendCodePoint);

        return safe.toString()
            .replace("\\", "\\\\")
            .replace("\"", "\\\"");
    }

    public record Context(String keyword, int page, int size, ProductSort sort, boolean filtered) {

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
