package com.poudy.product.search.indexing.command;

import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import com.poudy.product.search.indexing.ProductSearchIndexRows;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.Set;
import java.util.stream.Collectors;

/** 배치 프로토콜은 UTF-8 TSV이며 원문과 검색 문자열은 Base64로 전달한다. DB 접속은 하지 않는다. */
public final class ProductSearchAnalysisCommand {
    private ProductSearchAnalysisCommand() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--version")) {
            System.out.println(ProductSearchAnalyzer.VERSION);
            return;
        }
        ProductSearchIndexRows analyzer = new ProductSearchIndexRows();
        try (var input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
            var output = new PrintWriter(System.out, false, StandardCharsets.UTF_8)) {
            String line;
            while ((line = input.readLine()) != null) {
                String[] fields = line.split("\t", -1);
                if (fields.length != 3
                    || !Set.of("PRODUCT_NAME", "BRAND_NAME", "BRAND_ENGLISH_NAME").contains(fields[1])) {
                    throw new IllegalArgumentException("분석 입력은 product_id, field, Base64 원문이어야 합니다.");
                }
                String source = new String(Base64.getDecoder().decode(fields[2]), StandardCharsets.UTF_8);
                for (var row : analyzer.analyze(Long.parseLong(fields[0]), fields[1], source)) {
                    output.println(
                        row.productId() + "\t" + row.field() + "\t" + row.kind() + "\t" + row.version() + "\t"
                            + encode(row.source()) + "\t" + encode(row.normalized()) + "\t" + encode(row.expression())
                            + "\t"
                            + numbers(row.starts()) + "\t" + numbers(row.ends())
                    );
                }
            }
        }
    }

    private static String encode(String text) {
        return Base64.getEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8));
    }

    private static String numbers(int[] positions) {
        return Arrays.stream(positions).mapToObj(Integer::toString).collect(Collectors.joining(","));
    }
}
