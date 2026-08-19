package com.poudy.share.domain;

import com.poudy.common.domain.NameMatch;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public record ShareMatch(ShareMatchStatus status, Optional<Product> product, String keyword) {

    public ShareMatch {
        product = Objects.requireNonNullElse(product, Optional.empty());
        keyword = Objects.requireNonNullElse(keyword, "");
    }

    public static ShareMatch of(SharedProductName name, Products products) {
        return of(List.of(name), products);
    }

    public static ShareMatch of(List<SharedProductName> names, Products products) {
        ShareMatch unmatched = notFound("");

        for (SharedProductName name : names) {
            ShareMatch match = confirmOne(name, products);

            if (!match.isNotFound()) {
                return match;
            }
            unmatched = match;
        }

        return unmatched;
    }

    private static ShareMatch confirmOne(SharedProductName name, Products products) {
        Optional<Product> confirmed = confirm(candidatesOf(name, products, name.keyword()), name.keyword());

        if (confirmed.isPresent()) {
            return matched(confirmed.get());
        }

        // 낱말 하나만 덜어 내도 다른 제품 이름에 들어맞아 확정에는 쓰지 않는다. 넘길 검색어만 고른다.
        for (String shortened : name.shortenedKeywords()) {
            if (!candidatesOf(name, products, shortened).isEmpty()) {
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

    // 다른 브랜드의 비슷한 이름을 집으면 사용자가 알아채지 못한다.
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
