package com.poudy.share.domain;

import com.poudy.common.domain.NameMatch;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * 공유 텍스트로 제품 하나를 확정한 결과.
 *
 * <p>확정은 이름이 검색어와 정확히 같은 제품 하나, 후보 자체가 하나, 축약 재검색 순으로 시도한다.
 * 확정하지 못하면 결과가 있는 검색어를 함께 돌려주어 검색 화면으로 이어지게 한다.
 *
 * @param status    확정 여부
 * @param product   확정한 제품. 확정하지 못하면 비어 있다
 * @param keyword   확정하지 못했을 때 검색에 넘길 검색어
 */
public record ShareMatch(ShareMatchStatus status, Optional<Product> product, String keyword) {

    public ShareMatch {
        product = Objects.requireNonNullElse(product, Optional.empty());
        keyword = Objects.requireNonNullElse(keyword, "");
    }

    public static ShareMatch of(SharedProductName name, Products products) {
        Optional<Product> confirmed = confirm(candidatesOf(name, products, name.keyword()), name.keyword());

        if (confirmed.isPresent()) {
            return matched(confirmed.get());
        }

        for (String shortened : name.shortenedKeywords()) {
            List<Product> candidates = candidatesOf(name, products, shortened);
            Optional<Product> found = confirm(candidates, shortened);

            if (found.isPresent()) {
                return matched(found.get());
            }
            // 여러 건이면 확정하지 않는다. 대신 화면이 빈 결과를 보여주지 않도록 이 검색어를 넘긴다.
            if (!candidates.isEmpty()) {
                return notFound(shortened);
            }
        }

        return notFound(name.keyword());
    }

    public boolean isNotFound() {
        return status == ShareMatchStatus.NOT_FOUND;
    }

    private static ShareMatch matched(Product product) {
        return new ShareMatch(ShareMatchStatus.MATCHED, Optional.of(product), "");
    }

    private static ShareMatch notFound(String keyword) {
        return new ShareMatch(ShareMatchStatus.NOT_FOUND, Optional.empty(), keyword);
    }

    /**
     * 브랜드를 알아냈다면 그 브랜드 안에서만 찾는다. 다른 브랜드의 비슷한 이름을 집으면 사용자는 알아채지 못한다.
     */
    private static List<Product> candidatesOf(SharedProductName name, Products products, String keyword) {
        List<Product> found = products.search(keyword);

        return name.brand()
                .map(
                        brand -> found.stream()
                                .filter(product -> Objects.equals(product.brand().id(), brand.id()))
                                .toList())
                .orElse(found);
    }

    private static Optional<Product> confirm(List<Product> candidates, String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);
        List<Product> exact = candidates.stream()
                .filter(product -> searchKeyword.match(product.name()) == NameMatch.EXACT)
                .toList();

        if (exact.size() == 1) {
            return Optional.of(exact.getFirst());
        }
        if (exact.isEmpty() && candidates.size() == 1) {
            return Optional.of(candidates.getFirst());
        }

        return Optional.empty();
    }
}
