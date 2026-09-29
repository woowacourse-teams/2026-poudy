ALTER TABLE ingredient_group ADD COLUMN english_name VARCHAR(100);

UPDATE ingredient_group SET english_name = CASE code
    WHEN 'FRAGRANCE_ALLERGENS' THEN 'Fragrance Allergens'
    WHEN 'DRYING_ALCOHOLS' THEN 'Drying Alcohols'
    WHEN 'HARSH_PRESERVATIVES' THEN 'Harsh Preservatives'
    WHEN 'SULFATES' THEN 'Sulfates'
    WHEN 'CYCLIC_SILICONES' THEN 'Cyclic Silicones'
    WHEN 'SYNTHETIC_COLORANTS' THEN 'Synthetic Colorants'
END;

INSERT INTO ingredient_group (code, display_name, english_name, description) VALUES
    ('CERAMIDES', '세라마이드', 'Ceramides', '피부 장벽을 구성하는 지질 성분으로 수분 손실을 막아요.'),
    ('HYALURONIC_ACID', '히알루론산', 'Hyaluronic Acid', '주변의 수분을 강력하게 끌어당기는 천연 보습 인자예요.'),
    ('GLYCERIN', '글리세린', 'Glycerin', '가장 대중적이고 효과적인 기초 수분 보습 성분이에요.'),
    ('PANTHENOL', '판테놀', 'Panthenol', '비타민 B5 전환 성분으로 수분 공급과 장벽 복구를 동시에 해요.'),
    ('SQUALANE', '스쿠알란', 'Squalane', '피부 유분과 유사한 구조의 천연 보호막 형성 오일이에요.'),
    ('NIACINAMIDE', '나이아신아마이드', 'Niacinamide', '비타민 B3 성분으로 미백 기능성 고시 성분이자 트러블 케어에도 효과적이에요.'),
    ('VITAMIN_C', '비타민C', 'Vitamin C', '강력한 항산화 작용과 멜라닌 생성을 억제하는 대표 미백 성분이에요.'),
    ('ARBUTIN', '알부틴', 'Arbutin', '월귤나무 등에서 추출한 성분으로 기미와 잡티 예방에 탁월해요.'),
    ('GLUTATHIONE', '글루타치온', 'Glutathione', '''백옥 주사''의 주성분으로 피부의 산화 스트레스를 줄여 톤을 맑게 개선해요.'),
    ('RETINOIDS', '레티놀·레티노이드', 'Retinol & Retinoids', '비타민 A 유도체로 세포 턴오버를 촉진하는 대표적인 주름 개선 성분이에요.'),
    ('PEPTIDES', '펩타이드', 'Peptides', '단백질의 구성 요소로 피부에 탄력 신호를 전달하는 아미노산 결합체예요.'),
    ('ADENOSINE', '아데노신', 'Adenosine', '식약처 인증 주름 개선 고시 성분으로 세포 내 에너지 대사를 활성화해요.'),
    ('COLLAGEN', '콜라겐', 'Collagen', '피부 진피층의 대부분을 차지하며 탄력과 수분감을 유지하는 단백질이에요.'),
    ('CENTELLA', '병풀·시카', 'Centella Asiatica (Cica)', '호랑이 풀로 불리며 상처 치유와 피부 재생, 진정에 탁월해요.'),
    ('TEA_TREE', '티트리', 'Tea Tree', '항균 및 항염 효과가 뛰어나 여드름과 트러블 피부 진정에 많이 쓰여요.'),
    ('HOUTTUYNIA', '어성초', 'Houttuynia Cordata', '해독 작용이 뛰어나 피부 속 염증과 붉은 기를 가라앉혀요.'),
    ('MADECASSOSIDE', '마데카소사이드', 'Madecassoside', '병풀에서 추출한 핵심 유효 성분으로 손상 개선 효과가 강력해요.'),
    ('AZULENE', '아줄렌', 'Azulene', '캐모마일에서 추출한 푸른빛의 성분으로 열감을 가라앉히는 데 특화돼 있어요.'),
    ('AHA', 'AHA', 'Alpha Hydroxy Acids', '글라이콜릭산, 락틱산 등 수용성 성분으로 피부 표면의 각질을 제거해요.'),
    ('BHA', 'BHA', 'Beta Hydroxy Acids', '지용성 성분으로 모공 속 피지와 블랙헤드를 녹이는 데 효과적이에요.'),
    ('PHA', 'PHA', 'Polyhydroxy Acids', 'AHA보다 분자가 커 자극이 적고 보습 효과가 있는 차세대 각질 제거 성분이에요.'),
    ('LHA', 'LHA', 'Lipohydroxy Acids', '약산성 성분으로 자극이 매우 적어 민감성 피부의 각질 케어에 쓰여요.');

WITH rules (code, rule, korean_rule) AS (VALUES
    ('CERAMIDES', 'ceramide', '세라마이드'),
    ('HYALURONIC_ACID', 'hyalur', '하이알루로|히알루론'),
    ('GLYCERIN', '^glycerin$', '^글리세린$'),
    ('PANTHENOL', '^(dex)?panthenol$|^panthenyl (ethyl ether|triacetate)$', '^(덱스)?판테놀$|^판테닐(에틸에터|트라이아세테이트)$'),
    ('SQUALANE', 'squalane', '스쿠알란'),
    ('NIACINAMIDE', '^niacinamide', '^나이아신아마이드'),
    ('VITAMIN_C', '(?<!iso)ascorb', '(?<!아이소)(아스코빅|아스코빌|아스코베이트)'),
    ('ARBUTIN', 'arbutin', '알부틴'),
    ('GLUTATHIONE', 'glutathione', '글루타(티|치)온'),
    ('RETINOIDS', '\m(retinol|retinal|retinyl|retinamide|retinoyl)|retinoate', '레티놀|레틴알|레티닐|레틴아마이드|레티노일|레티노에이트'),
    ('PEPTIDES', '(di|tri|tetra|penta|hexa|hepta|octa|nona|deca|oligo)peptide-[0-9]|^palmitoyl oligopeptide$|^dipeptide diaminobutyroyl benzylamide diacetate$', '(다이|트라이|테트라|펜타|헥사|헵타|옥타|노나|데카|올리고)펩타이드'),
    ('ADENOSINE', '^adenosine$', '^아데노신$'),
    ('COLLAGEN', '^(hydrolyzed |soluble |succinoyl |desamido )?(atelo)?collagen( extract| amino acids| crosspolymer)?$', '콜라겐'),
    ('CENTELLA', 'centella asiatica|^asiaticoside$|^asiatic acid$|^madecassic acid$', '병풀|^아시아티코사이드$|^아시아틱애씨드$|^마데카식애씨드$'),
    ('TEA_TREE', 'melaleuca alternifolia', '^티트리'),
    ('HOUTTUYNIA', 'houttuynia cordata', '약모밀|어성초'),
    ('MADECASSOSIDE', '^madecassoside$', '^마데카소사이드$'),
    ('AZULENE', '^(guai|cham)?azulene$|azulene sulfonate$', '아줄렌'),
    ('AHA', '^(glycolic|lactic|mandelic|malic|tartaric) acid$', '^(글라이콜릭|락틱|만델릭|말릭|타타릭)애씨드$'),
    ('BHA', '^salicylic acid$|^betaine salicylate$', '^살리실릭애씨드$|^베타인살리실레이트$'),
    ('PHA', '^gluconolactone$|^lactobionic acid$', '^글루코노락톤$|^락토바이오닉애씨드$'),
    ('LHA', '^capryloyl salicylic acid$', '^카프릴로일살리실릭애씨드$')
), candidates AS (
    SELECT i.id, replace(i.korean_name, E'\n', '') AS korean_name, replace(coalesce(i.english_name, ''), E'\n', ' ') AS english_name
    FROM ingredient i
), members AS (
    SELECT r.code, c.id
    FROM rules r
    JOIN candidates c
      ON (c.english_name <> '' AND c.english_name ~* r.rule)
      OR (c.english_name = '' AND c.korean_name ~ r.korean_rule)
    WHERE c.english_name !~* 'ferment|filtrate'
      AND c.english_name !~* '^hyaluronidase$|^niacinamide riboside chloride$'
      AND NOT (
          c.english_name ~ '/'
          AND c.english_name !~* '^[^/]*(flower|leaf|stem|root|seed|fruit)(/(flower|leaf|stem|root|seed|fruit))+ '
      )
      AND NOT (c.english_name = '' AND c.korean_name ~ '/|발효|여과물')
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
