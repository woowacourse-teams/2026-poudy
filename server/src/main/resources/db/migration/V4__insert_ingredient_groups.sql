INSERT INTO ingredient_group (code, display_name, description) VALUES
    ('CERAMIDES', '세라마이드', '피부 장벽을 구성하는 지질 성분으로 수분 손실을 막음.'),
    ('HYALURONIC_ACID', '히알루론산', '주변의 수분을 강력하게 끌어당기는 천연 보습 인자.'),
    ('GLYCERIN', '글리세린', '가장 대중적이고 효과적인 기초 수분 보습 성분.'),
    ('PANTHENOL', '판테놀', '비타민 B5 전환 성분으로 수분 공급과 장벽 복구를 동시에 수행.'),
    ('SQUALANE', '스쿠알란', '피부 유분과 유사한 구조의 천연 보호막 형성 오일.'),
    ('NIACINAMIDE', '나이아신아마이드', '비타민 B3 성분으로 미백 기능성 고시 성분이자 트러블 케어에도 효과적.'),
    ('VITAMIN_C', '비타민C', '강력한 항산화 작용과 멜라닌 생성을 억제하는 대표 미백 성분.'),
    ('ARBUTIN', '알부틴', '월귤나무 등에서 추출한 성분으로 기미와 잡티 예방에 탁월.'),
    ('GLUTATHIONE', '글루타치온', '''백옥 주사''의 주성분으로 피부의 산화 스트레스를 줄여 톤을 맑게 개선.'),
    ('RETINOIDS', '레티놀·레티노이드', '비타민 A 유도체로 세포 턴오버를 촉진하는 대표적인 주름 개선 성분.'),
    ('PEPTIDES', '펩타이드', '단백질의 구성 요소로 피부에 탄력 신호를 전달하는 아미노산 결합체.'),
    ('ADENOSINE', '아데노신', '식약처 인증 주름 개선 고시 성분으로 세포 내 에너지 대사를 활성화.'),
    ('COLLAGEN', '콜라겐', '피부 진피층의 대부분을 차지하며 탄력과 수분감을 유지하는 단백질.'),
    ('CENTELLA', '병풀·시카', '호랑이 풀로 불리며 상처 치유와 피부 재생, 진정에 탁월.'),
    ('TEA_TREE', '티트리', '항균 및 항염 효과가 뛰어나 여드름과 트러블 피부 진정에 다수 사용.'),
    ('HOUTTUYNIA', '어성초', '해독 작용이 뛰어나 피부 속 염증과 붉은 기를 가라앉힘.'),
    ('MADECASSOSIDE', '마데카소사이드', '병풀에서 추출한 핵심 유효 성분으로 강력한 손상 개선 효과.'),
    ('AZULENE', '아줄렌', '캐모마일에서 추출한 푸른빛의 성분으로 열감 가라앉히기에 특화.'),
    ('AHA', 'AHA', '글라이콜릭산, 락틱산 등 수용성 성분으로 피부 표면의 각질 제거.'),
    ('BHA', 'BHA', '지용성 성분으로 모공 속 피지와 블랙헤드를 녹이는 데 효과적.'),
    ('PHA', 'PHA', 'AHA보다 분자가 커 자극이 적고 보습 효과가 있는 차세대 각질 제거 성분.'),
    ('LHA', 'LHA', '약산성 성분으로 자극이 매우 적어 민감성 피부용 각질 케어에 사용.');

WITH rules (code, rule) AS (VALUES
    ('CERAMIDES', 'ceramide'),
    ('HYALURONIC_ACID', 'hyalur'),
    ('GLYCERIN', '^glycerin$'),
    ('PANTHENOL', '^(dex)?panthenol$|^panthenyl (ethyl ether|triacetate)$'),
    ('SQUALANE', 'squal'),
    ('NIACINAMIDE', '^niacinamide'),
    ('VITAMIN_C', 'ascorb'),
    ('ARBUTIN', 'arbutin'),
    ('GLUTATHIONE', 'glutathione'),
    ('RETINOIDS', '\m(retinol|retinal|retinyl|retinoate|retinamide)'),
    ('PEPTIDES', '(di|tri|tetra|penta|hexa|hepta|octa|nona|deca|oligo)peptide-[0-9]'),
    ('ADENOSINE', '^adenosine$'),
    ('COLLAGEN', '^(hydrolyzed |soluble |succinoyl )?(atelo)?collagen( extract| amino acids)?$'),
    ('CENTELLA', 'centella asiatica|^asiaticoside$|^asiatic acid$|^madecassic acid$'),
    ('TEA_TREE', 'melaleuca alternifolia'),
    ('HOUTTUYNIA', 'houttuynia cordata'),
    ('MADECASSOSIDE', '^madecassoside$'),
    ('AZULENE', '^(guai|cham)?azulene$|azulene sulfonate$'),
    ('AHA', '^(glycolic|lactic|mandelic|malic|tartaric) acid$'),
    ('BHA', '^salicylic acid$|^betaine salicylate$'),
    ('PHA', '^gluconolactone$|^lactobionic acid$'),
    ('LHA', '^capryloyl salicylic acid$')
), candidates AS (
    SELECT i.id, i.korean_name, replace(coalesce(i.english_name, ''), E'\n', ' ') AS english_name
    FROM ingredient i
), members AS (
    SELECT r.code, c.id
    FROM rules r
    JOIN candidates c
      ON c.english_name ~* r.rule
      OR (r.code = 'SQUALANE' AND c.korean_name ~ '스쿠알')
    WHERE c.english_name !~* 'ferment|filtrate|polymer|vesicles'
      AND NOT (
          c.english_name ~ '/'
          AND c.english_name !~* '^[^/]*(flower|leaf|stem|root|seed|fruit)(/(flower|leaf|stem|root|seed|fruit))+ '
      )
      AND NOT (c.english_name = '' AND c.korean_name ~ '/')
)
INSERT INTO ingredient_group_ingredient (group_code, ingredient_id, display_order)
SELECT code, id, row_number() OVER (PARTITION BY code ORDER BY id) - 1
FROM members;

CREATE OR REPLACE VIEW exclude_code AS
SELECT code, display_name, description, created_at, updated_at
FROM ingredient_group
WHERE code IN (
    'FRAGRANCE_ALLERGENS', 'DRYING_ALCOHOLS', 'HARSH_PRESERVATIVES', 'SULFATES', 'CYCLIC_SILICONES', 'SYNTHETIC_COLORANTS'
);

CREATE OR REPLACE VIEW exclude_code_ingredient AS
SELECT group_code AS exclude_code, ingredient_id, display_order, created_at, updated_at
FROM ingredient_group_ingredient
WHERE group_code IN (
    'FRAGRANCE_ALLERGENS', 'DRYING_ALCOHOLS', 'HARSH_PRESERVATIVES', 'SULFATES', 'CYCLIC_SILICONES', 'SYNTHETIC_COLORANTS'
);
