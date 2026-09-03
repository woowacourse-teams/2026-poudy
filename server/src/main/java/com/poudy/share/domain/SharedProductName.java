package com.poudy.share.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.search.domain.SearchKeyword;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

public final class SharedProductName {

    private static final String UNKNOWN_BRAND = "미상";
    private static final int MINIMUM_WORDS = 2;
    private static final int MINIMUM_LETTERS = 4;
    private static final int MINIMUM_SIMILAR_NAME_LENGTH = 6;
    private static final int MINIMUM_COMMON_TOKENS = 3;
    private static final double MINIMUM_SHORTER_NAME_RATIO = 0.80;
    private static final double MINIMUM_LONGER_NAME_RATIO = 0.55;
    private static final double MINIMUM_TOKEN_OVERLAP_RATIO = 0.75;
    private static final double MINIMUM_SIMILARITY_ADVANTAGE = 0.05;
    private static final double MINIMUM_STRONG_TOKEN_SCORE = 0.75;
    private static final double MINIMUM_TOKEN_SCORE_ADVANTAGE = 0.20;
    private static final String NEW_PRODUCT_MARKER = "[NEW]";
    private static final String PRODUCT_FORM_EXPRESSION = "선크림|선세럼|선스틱|선베이스|아이크림|클렌징폼|클렌징밀크|클렌징오일|"
        + "토너|스킨|로션|에멀전|에멀젼|에센스|세럼|앰플|크림|젤|패드|마스크|클렌저|폼|미스트|오일|부스터";
    private static final Pattern PRODUCT_FORM = Pattern.compile(PRODUCT_FORM_EXPRESSION);
    private static final Pattern CONNECTED_PRODUCT_FORMS = Pattern.compile(
        "(?:" + PRODUCT_FORM_EXPRESSION + ")[/&+](?:" + PRODUCT_FORM_EXPRESSION + ")"
    );
    private static final Pattern SUN_PROTECTION_GRADE = Pattern.compile(
        "spf\\d+\\+?|pa\\+{1,4}",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern PH_MARKER = Pattern.compile(
        "(?<![A-Za-z])ph(?=[^A-Za-z]|$)",
        Pattern.CASE_INSENSITIVE
    );
    private static final Set<String> PRODUCT_SCOPES = Set.of(
        "포맨",
        "옴므",
        "베이비",
        "바디",
        "페이셜",
        "아이",
        "립",
        "핸드",
        "넥",
        "스팟",
        "라이트",
        "리치",
        "소용량",
        "ex"
    );

    private final Optional<Brand> brand;
    private final String keyword;

    private SharedProductName(Optional<Brand> brand, String keyword) {
        this.brand = Objects.requireNonNullElse(brand, Optional.empty());
        this.keyword = Objects.requireNonNullElse(keyword, "").trim();
    }

    public static SharedProductName of(String productPhrase, Brands brands) {
        List<String> words = ShareWords.of(productPhrase);
        int brandStart = startsWithNewProductMarker(words) ? 1 : 0;

        for (int size = words.size(); size > brandStart; size--) {
            Optional<Brand> found = brands.findByName(ShareWords.join(words.subList(brandStart, size)));

            if (found.isPresent()) {
                List<String> productWords = new ArrayList<>(words.subList(0, brandStart));
                productWords.addAll(words.subList(size, words.size()));
                return new SharedProductName(found, ShareWords.join(productWords));
            }
        }

        return new SharedProductName(Optional.empty(), productPhrase);
    }

    public Optional<Brand> brand() {
        return brand;
    }

    public String keyword() {
        return keyword;
    }

    public boolean isEmpty() {
        return fallbackKeyword().isEmpty();
    }

    public String brandName() {
        return brand.map(Brand::koreanName).orElse(UNKNOWN_BRAND);
    }

    public ShareMatch matchIn(Products products) {
        List<String> matchingKeywords = matchingKeywords(products);

        for (String searched : matchingKeywords) {
            Optional<Product> confirmed = confirm(candidatesIn(products, searched), searched);

            if (confirmed.isPresent()) {
                return ShareMatch.matched(confirmed.get());
            }
        }

        for (String searched : matchingKeywords) {
            Optional<Product> similar = brand
                .flatMap(owner -> confirmSimilar(products.findAllByBrand(owner), searched));

            if (similar.isPresent()) {
                return ShareMatch.matched(similar.get());
            }
        }

        for (String shortened : shortenedKeywords()) {
            if (!candidatesIn(products, shortened).isEmpty()) {
                return ShareMatch.notFound(shortened);
            }
        }

        return ShareMatch.notFound(fallbackKeyword());
    }

    public List<String> shortenedKeywords() {
        List<String> words = ShareWords.of(fallbackKeyword());

        return IntStream.iterate(words.size() - 1, size -> size >= MINIMUM_WORDS, size -> size - 1)
            .mapToObj(size -> ShareWords.join(words.subList(0, size)))
            .filter(shortened -> ShareWords.letterCount(shortened) >= MINIMUM_LETTERS)
            .toList();
    }

    private List<String> matchingKeywords(Products products) {
        String fallback = fallbackKeyword();

        if (keyword.equals(fallback) || !candidatesIn(products, keyword).isEmpty()) {
            return List.of(keyword);
        }
        return List.of(keyword, fallback);
    }

    private String fallbackKeyword() {
        List<String> words = ShareWords.of(keyword);

        if (!startsWithNewProductMarker(words)) {
            return keyword;
        }
        return ShareWords.join(words.subList(1, words.size()));
    }

    private static boolean startsWithNewProductMarker(List<String> words) {
        return !words.isEmpty() && words.getFirst().equalsIgnoreCase(NEW_PRODUCT_MARKER);
    }

    private List<Product> candidatesIn(Products products, String searched) {
        List<Product> found = products.searchByProductName(searched);

        return brand.map(owner -> found.stream().filter(product -> product.hasBrand(owner)).toList())
            .orElse(found);
    }

    private static Optional<Product> confirm(List<Product> candidates, String searched) {
        Optional<Product> exact = confirmExact(candidates, searched);

        if (exact.isPresent()) {
            return exact;
        }
        if (candidates.size() == 1) {
            return Optional.of(candidates.getFirst());
        }

        return Optional.empty();
    }

    private static Optional<Product> confirmExact(List<Product> candidates, String searched) {
        SearchKeyword searchKeyword = new SearchKeyword(searched);
        List<Product> exact = candidates.stream()
            .filter(product -> product.matchesNameExactly(searchKeyword))
            .toList();

        if (exact.size() == 1) {
            return Optional.of(exact.getFirst());
        }

        return Optional.empty();
    }

    private static Optional<Product> confirmSimilar(List<Product> candidates, String sharedName) {
        List<SimilarityCandidate> similar = candidates.stream()
            .filter(product -> hasCompatibleNewMarker(sharedName, product.name()))
            .filter(product -> hasSameVersionSign(sharedName, product.name()))
            .filter(product -> hasSamePrimaryForm(sharedName, product.name()))
            .filter(product -> hasSameScopes(sharedName, product.name()))
            .filter(product -> isSimilarName(sharedName, product.name()))
            .map(product -> similarityCandidateOf(product, sharedName))
            .sorted(Comparator.comparingDouble(SimilarityCandidate::score).reversed())
            .toList();

        if (similar.size() == 1) {
            return Optional.of(similar.getFirst().product());
        }
        Optional<Product> tokenWinner = confirmByTokenScore(similar);
        if (tokenWinner.isPresent()) {
            return tokenWinner;
        }
        if (similar.size() > 1 && hasClearAdvantage(similar.getFirst(), similar.get(1))) {
            return Optional.of(similar.getFirst().product());
        }
        return Optional.empty();
    }

    private static Optional<Product> confirmByTokenScore(List<SimilarityCandidate> candidates) {
        if (candidates.size() < 2) {
            return Optional.empty();
        }
        List<SimilarityCandidate> byTokenScore = candidates.stream()
            .sorted(Comparator.comparingDouble(SimilarityCandidate::tokenScore).reversed())
            .toList();
        SimilarityCandidate first = byTokenScore.getFirst();
        SimilarityCandidate second = byTokenScore.get(1);

        if (first.tokenScore() >= MINIMUM_STRONG_TOKEN_SCORE
            && first.tokenScore() - second.tokenScore() >= MINIMUM_TOKEN_SCORE_ADVANTAGE) {
            return Optional.of(first.product());
        }
        return Optional.empty();
    }

    private static boolean hasClearAdvantage(SimilarityCandidate first, SimilarityCandidate second) {
        return first.score() - second.score() >= MINIMUM_SIMILARITY_ADVANTAGE;
    }

    private static boolean hasCompatibleNewMarker(String sharedName, String productName) {
        if (!startsWithNewProductMarker(ShareWords.of(sharedName))) {
            return true;
        }
        return startsWithNewProductMarker(ShareWords.of(productName));
    }

    private static boolean hasSameVersionSign(String sharedName, String productName) {
        return normalizedName(sharedName).contains("+") == normalizedName(productName).contains("+");
    }

    private static boolean hasSamePrimaryForm(String sharedName, String productName) {
        if (hasConnectedProductForms(sharedName) || hasConnectedProductForms(productName)) {
            return false;
        }
        Optional<String> sharedForm = primaryProductFormOf(sharedName);
        Optional<String> productForm = primaryProductFormOf(productName);

        return sharedForm.isPresent() && sharedForm.equals(productForm);
    }

    private static boolean hasConnectedProductForms(String productName) {
        return CONNECTED_PRODUCT_FORMS.matcher(normalizedName(productName)).find();
    }

    private static Optional<String> primaryProductFormOf(String productName) {
        Matcher matcher = PRODUCT_FORM.matcher(normalizedName(productName));
        String form = null;

        while (matcher.find()) {
            form = matcher.group();
        }
        return Optional.ofNullable(form);
    }

    private static boolean hasSameScopes(String sharedName, String productName) {
        String normalizedShared = normalizedName(sharedName);
        String normalizedProduct = normalizedName(productName);

        return PRODUCT_SCOPES.stream()
            .allMatch(scope -> normalizedShared.contains(scope) == normalizedProduct.contains(scope));
    }

    private static boolean isSimilarName(String sharedName, String productName) {
        String normalizedShared = normalizedName(sharedName);
        String normalizedProduct = normalizedName(productName);

        if (new SearchKeyword(productName).matches(sharedName)) {
            return true;
        }
        if (Math.min(normalizedShared.length(), normalizedProduct.length()) < MINIMUM_SIMILAR_NAME_LENGTH) {
            return false;
        }

        int commonLength = longestCommonSubsequenceLength(normalizedShared, normalizedProduct);
        int shorterLength = Math.min(normalizedShared.length(), normalizedProduct.length());
        int longerLength = Math.max(normalizedShared.length(), normalizedProduct.length());
        boolean hasEnoughCommonSequence = (double) commonLength / shorterLength >= MINIMUM_SHORTER_NAME_RATIO
            && (double) commonLength / longerLength >= MINIMUM_LONGER_NAME_RATIO;

        return hasEnoughCommonSequence || hasEnoughCommonTokens(sharedName, productName);
    }

    private static String normalizedName(String name) {
        String withoutSunProtectionGrade = SUN_PROTECTION_GRADE.matcher(name).replaceAll("");
        String withoutPhMarker = PH_MARKER.matcher(withoutSunProtectionGrade).replaceAll("");
        return new SearchKeyword(withoutPhMarker.replace("앤", "&")).value();
    }

    private static boolean hasEnoughCommonTokens(String sharedName, String productName) {
        Set<String> sharedTokens = normalizedTokensOf(sharedName);
        Set<String> productTokens = normalizedTokensOf(productName);
        Set<String> commonTokens = new HashSet<>(sharedTokens);
        commonTokens.retainAll(productTokens);
        int smallerTokenCount = Math.min(sharedTokens.size(), productTokens.size());

        return commonTokens.size() >= MINIMUM_COMMON_TOKENS
            && (double) commonTokens.size() / smallerTokenCount >= MINIMUM_TOKEN_OVERLAP_RATIO;
    }

    private static SimilarityCandidate similarityCandidateOf(Product product, String sharedName) {
        String productName = product.name();
        String normalizedShared = normalizedName(sharedName);
        String normalizedProduct = normalizedName(productName);
        int commonLength = longestCommonSubsequenceLength(normalizedShared, normalizedProduct);
        double sequenceScore = (double) (2 * commonLength)
            / (normalizedShared.length() + normalizedProduct.length());

        Set<String> sharedTokens = normalizedTokensOf(sharedName);
        Set<String> productTokens = normalizedTokensOf(productName);
        Set<String> commonTokens = new HashSet<>(sharedTokens);
        commonTokens.retainAll(productTokens);
        double tokenScore = (double) (2 * commonTokens.size())
            / (sharedTokens.size() + productTokens.size());

        return new SimilarityCandidate(product, sequenceScore, tokenScore);
    }

    private static Set<String> normalizedTokensOf(String name) {
        return ShareWords.of(name).stream()
            .map(SharedProductName::normalizedName)
            .filter(token -> !token.isEmpty())
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private static int longestCommonSubsequenceLength(String left, String right) {
        int[] previous = new int[right.length() + 1];

        for (int leftIndex = 1; leftIndex <= left.length(); leftIndex++) {
            int[] current = new int[right.length() + 1];
            for (int rightIndex = 1; rightIndex <= right.length(); rightIndex++) {
                if (left.charAt(leftIndex - 1) == right.charAt(rightIndex - 1)) {
                    current[rightIndex] = previous[rightIndex - 1] + 1;
                } else {
                    current[rightIndex] = Math.max(previous[rightIndex], current[rightIndex - 1]);
                }
            }
            previous = current;
        }

        return previous[right.length()];
    }

    private record SimilarityCandidate(Product product, double sequenceScore, double tokenScore) {

        private double score() {
            return Math.max(sequenceScore, tokenScore);
        }
    }
}
