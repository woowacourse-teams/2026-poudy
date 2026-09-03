package com.poudy.product.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.TextMatch;
import java.util.Comparator;

public final class MatchedProduct {

    private static final Comparator<MatchedProduct> ORDER = Comparator
        .comparing(MatchedProduct::rank)
        .thenComparing(matched -> matched.product().id());

    private final Product product;
    private final ProductMatchField field;
    private final TextMatch textMatch;
    private final MatchRank rank;

    public MatchedProduct(Product product, ProductMatchField field, TextMatch textMatch) {
        this(product, field, textMatch, directRankOf(textMatch));
    }

    private MatchedProduct(
        Product product,
        ProductMatchField field,
        TextMatch textMatch,
        MatchRank rank
    ) {
        if (product == null || field == null || textMatch == null || rank == null) {
            throw new IllegalArgumentException("제품 검색 일치 결과의 값이 필요합니다.");
        }
        this.product = product;
        this.field = field;
        this.textMatch = textMatch;
        this.rank = rank;
    }

    public static MatchedProduct combined(Product product, TextMatch brandMatch, TextMatch productMatch) {
        return new MatchedProduct(
            product,
            ProductMatchField.PRODUCT_NAME,
            productMatch,
            MatchRank.combined(brandMatch, productMatch)
        );
    }

    public static Comparator<MatchedProduct> order() {
        return ORDER;
    }

    private MatchRank rank() {
        return rank;
    }

    private static MatchRank directRankOf(TextMatch match) {
        return match == null ? null : MatchRank.direct(match);
    }

    public Product product() {
        return product;
    }

    public ProductMatchField field() {
        return field;
    }

    public TextMatch textMatch() {
        return textMatch;
    }

    private record MatchRank(boolean combined, NameRank primary, NameRank secondary)
        implements
            Comparable<MatchRank> {

        private static MatchRank direct(TextMatch match) {
            return new MatchRank(false, match.rank(), NameRank.NONE);
        }

        private static MatchRank combined(TextMatch brandMatch, TextMatch productMatch) {
            return new MatchRank(true, brandMatch.rank(), productMatch.rank());
        }

        @Override
        public int compareTo(MatchRank other) {
            int byCombined = Boolean.compare(combined, other.combined);
            if (byCombined != 0) {
                return byCombined;
            }

            int byPrimary = primary.compareTo(other.primary);
            if (byPrimary != 0 || !combined) {
                return byPrimary;
            }

            return secondary.compareTo(other.secondary);
        }
    }
}
