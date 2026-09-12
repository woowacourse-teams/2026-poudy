package com.poudy.product.logging;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.domain.ProductSort;
import com.poudy.search.domain.SearchKeyword;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@DisplayName("제품 검색 로거")
class ProductSearchLoggerTest {

    private static final long ELAPSED_NANOS = 1_234_567L;

    private final ProductSearchLogger logger = new ProductSearchLogger();

    @Test
    @DisplayName("검색 결과가 있으면 검색 조건과 처리 결과를 기록한다")
    void logsSuccessfulSearch(CapturedOutput output) {
        logger.completed(context("토너", ProductSort.PRICE_ASC, true), ELAPSED_NANOS, 3);

        assertThat(output).contains(
            "event=search_completed",
            "searchType=PRODUCT_SEARCH",
            "keyword=\"토너\"",
            "page=0",
            "size=20",
            "sort=PRICE_ASC",
            "filtered=true",
            "durationMs=1.234",
            "resultCount=3",
            "outcome=SUCCESS"
        );
    }

    @Test
    @DisplayName("검색 결과가 없으면 결과 없음으로 기록한다")
    void logsSearchWithoutResult(CapturedOutput output) {
        logger.completed(context("없는 제품", ProductSort.NAME_ASC, false), ELAPSED_NANOS, 0);

        assertThat(output).contains("resultCount=0", "outcome=NO_RESULT");
    }

    @Test
    @DisplayName("검색 오류는 안전한 오류 코드만 기록한다")
    void logsSearchErrorWithoutExceptionDetail(CapturedOutput output) {
        logger.failed(context("토너", ProductSort.NAME_ASC, false), ELAPSED_NANOS);

        assertThat(output).contains(
            "keyword=\"토너\"",
            "durationMs=1.234",
            "outcome=ERROR",
            "errorCode=INTERNAL_SERVER_ERROR"
        );
        assertThat(output).doesNotContain("resultCount=");
    }

    @Test
    @DisplayName("검색어를 정규화하고 로그에 안전한 길이와 형식으로 기록한다")
    void logsSafeKeyword(CapturedOutput output) {
        String keyword = " 토 너\\\"" + "가".repeat(ProductSearchLogger.MAX_KEYWORD_CODE_POINTS + 1);

        logger.completed(context(keyword, ProductSort.NAME_ASC, false), ELAPSED_NANOS, 1);

        assertThat(output).contains(
            "keyword=\"토너\\\\\\\"" + "가".repeat(ProductSearchLogger.MAX_KEYWORD_CODE_POINTS - 4)
        );
        assertThat(output).doesNotContain(
            "토\n너",
            "가".repeat(ProductSearchLogger.MAX_KEYWORD_CODE_POINTS + 1)
        );
    }

    @Test
    @DisplayName("검색어의 생김새와 무관하게 입력을 그대로 기록한다")
    void logsEveryKeyword(CapturedOutput output) {
        for (String keyword : java.util.List.of("person@example.com", "010-1234-5678")) {
            logger.completed(context(keyword, ProductSort.NAME_ASC, false), ELAPSED_NANOS, 1);

            assertThat(output).contains("keyword=\"" + keyword + "\"");
        }
    }

    private static ProductSearchLogger.Context context(String keyword, ProductSort sort, boolean filtered) {
        return new ProductSearchLogger.Context(new SearchKeyword(keyword), 0, 20, sort, filtered);
    }
}
