package com.poudy.product.search.support;

import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import com.poudy.product.search.indexing.ProductSearchIndexRows;
import com.poudy.product.search.indexing.ProductSearchNameRow;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** 호출자의 트랜잭션에 참여한다. 커밋은 적재기를 포함한 호출자가 소유한다. */
public final class ProductSearchIndexer {
    public void rebuild(Connection connection) throws SQLException {
        if (connection.getAutoCommit()) {
            throw new IllegalStateException("검색 자료는 명시적 트랜잭션에서 생성해야 합니다.");
        }
        try (var lock = connection.createStatement()) {
            lock.execute("lock table brand,product in share mode");
            lock.execute("lock table product_search_name in share row exclusive mode");
        }
        ProductSearchIndexRows analyzer = new ProductSearchIndexRows();
        List<ProductSearchNameRow> rows = new ArrayList<>();
        try (var select = connection.createStatement();
            var products = select.executeQuery(
                "select p.id,p.product_name,b.korean_name,b.english_name from product p join brand b on b.id=p.brand_id order by p.id"
            )) {
            while (products.next()) {
                long id = products.getLong("id");
                rows.addAll(analyzer.analyze(id, "PRODUCT_NAME", products.getString("product_name")));
                rows.addAll(analyzer.analyze(id, "BRAND_NAME", products.getString("korean_name")));
                rows.addAll(analyzer.analyze(id, "BRAND_ENGLISH_NAME", products.getString("english_name")));
            }
        }
        try (var delete = connection.prepareStatement("delete from product_search_name where analysis_version=?")) {
            delete.setInt(1, ProductSearchAnalyzer.VERSION);
            delete.executeUpdate();
        }
        try (var insert = connection.prepareStatement(
            "insert into product_search_name "
                + "(product_id,field,kind,analysis_version,source_text,normalized,search_text,source_starts,source_ends) values (?,?,?,?,?,?,?,?,?)"
        )) {
            int pending = 0;
            for (ProductSearchNameRow row : rows) {
                insert.setLong(1, row.productId());
                insert.setString(2, row.field());
                insert.setString(3, row.kind());
                insert.setInt(4, row.version());
                insert.setString(5, row.source());
                insert.setString(6, row.normalized());
                insert.setString(7, row.expression());
                insert.setArray(8, connection.createArrayOf("integer", Arrays.stream(row.starts()).boxed().toArray()));
                insert.setArray(9, connection.createArrayOf("integer", Arrays.stream(row.ends()).boxed().toArray()));
                insert.addBatch();
                pending++;
                if (pending == 500) {
                    insert.executeBatch();
                    pending = 0;
                }
            }
            if (pending > 0) {
                insert.executeBatch();
            }
        }
    }
}
