package com.poudy.product.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.product.domain.ProductSort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@DisplayName("제품 검색 로거")
class ProductSearchLoggerTest {

    private final ProductSearchLogger logger = new ProductSearchLogger();

    @Test
    @DisplayName("검색 결과가 있으면 검색 조건과 처리 결과를 기록한다")
    void logsSuccessfulSearch(CapturedOutput output) {
        ProductSearchLogger.Context context = new ProductSearchLogger.Context(
            "토너",
            0,
            20,
            ProductSort.PRICE_ASC,
            true
        );

        String result = logger.analyze(context, () -> "found", ignored -> 3);

        assertThat(result).isEqualTo("found");
        assertThat(output).contains(
            "event=search_completed",
            "searchType=PRODUCT_SEARCH",
            "keyword=\"토너\"",
            "page=0",
            "size=20",
            "sort=PRICE_ASC",
            "filtered=true",
            "resultCount=3",
            "outcome=SUCCESS"
        );
        assertThat(output.getOut()).containsPattern("durationMs=\\d+\\.\\d{3}");
    }

    @Test
    @DisplayName("검색 결과가 없으면 결과 없음으로 기록한다")
    void logsSearchWithoutResult(CapturedOutput output) {
        ProductSearchLogger.Context context = new ProductSearchLogger.Context(
            "없는 제품",
            0,
            20,
            ProductSort.NAME_ASC,
            false
        );

        logger.analyze(context, () -> "not-found", ignored -> 0);

        assertThat(output).contains(
            "resultCount=0",
            "outcome=NO_RESULT"
        );
    }

    @Test
    @DisplayName("검색 오류는 안전한 오류 코드만 기록하고 그대로 전파한다")
    void logsSearchErrorWithoutExceptionDetail(CapturedOutput output) {
        ProductSearchLogger.Context context = new ProductSearchLogger.Context(
            "토너",
            0,
            20,
            ProductSort.NAME_ASC,
            false
        );
        RuntimeException failure = new RuntimeException("로그에 남으면 안 되는 내부 오류입니다.");

        assertThatThrownBy(() -> logger.analyze(context, () -> {
            throw failure;
        }, ignored -> 0))
            .isSameAs(failure);
        assertThat(output).contains(
            "outcome=ERROR",
            "errorCode=INTERNAL_SERVER_ERROR"
        );
        assertThat(output).doesNotContain(failure.getMessage());
    }

    @Test
    @DisplayName("검색어를 정규화하고 로그에 안전한 길이와 형식으로 기록한다")
    void logsSafeKeyword(CapturedOutput output) {
        String keyword = " 토\n너\\\"" + "가".repeat(ProductSearchLogger.MAX_KEYWORD_CODE_POINTS + 1);

        logger.analyze(
            new ProductSearchLogger.Context(keyword, 0, 20, ProductSort.NAME_ASC, false),
            () -> "found",
            ignored -> 1
        );

        assertThat(output).contains(
            "keyword=\"토너\\\\\\\"" + "가".repeat(ProductSearchLogger.MAX_KEYWORD_CODE_POINTS - 4)
        );
        assertThat(output).doesNotContain(
            "토\n너",
            "가".repeat(ProductSearchLogger.MAX_KEYWORD_CODE_POINTS + 1)
        );
    }
}
