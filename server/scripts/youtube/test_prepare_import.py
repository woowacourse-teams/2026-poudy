import copy
import unittest
from prepare_import import sql, validate


def bundle():
    return {
        'schema_version': 'youtube-service-transfer/v1', 'source_batch_hash': 'a' * 64,
        'channels': [{'id': 'channel', 'name': '유튜버', 'metadata_checked_at': '2026-11-05T00:00:00Z'}],
        'videos': [{'id': 'abcdefghij1', 'channel_id': 'channel', 'title': '영상', 'description': '',
                    'duration_ms': 120000, 'published_at': '2026-11-01T00:00:00Z',
                    'metadata_checked_at': '2026-11-05T00:00:00Z', 'visible': False}],
        'products': [{'id': 1, 'name': '정식명', 'brand_name': '브랜드'}],
        'video_products': [{'video_id': 'abcdefghij1', 'product_id': 1, 'recommendation': 'recommended'}],
        'mentions': [{'video_id': 'abcdefghij1', 'ordinal': 1, 'product_id': 1, 'spoken_name': '발언명',
                      'start_ms': 64000, 'end_ms': 65000, 'summary': '추천', 'recommendation': 'recommended'}],
    }


class ImportContractTest(unittest.TestCase):
    def test_repeated_segments_have_one_mapping(self):
        data = bundle()
        other = copy.deepcopy(data['mentions'][0])
        other.update(ordinal=2, start_ms=68000, end_ms=70000)
        data['mentions'].append(other)
        validate(data)
        data['video_products'].append(copy.deepcopy(data['video_products'][0]))
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            validate(data)

    def test_opposition_cannot_be_hidden_in_positive_video_assessment(self):
        for rating in ['mixed', 'uncertain', 'not_recommended']:
            data = bundle()
            data['mentions'][0]['recommendation'] = rating
            with self.assertRaisesRegex(ValueError, 'opposing'):
                validate(data)
            data['video_products'][0]['recommendation'] = rating
            validate(data)

    def test_invalid_time_and_missing_mapping_are_rejected(self):
        for changes in [{'start_ms': -1}, {'end_ms': 120001}, {'end_ms': 64000}, {'product_id': 2}]:
            data = bundle()
            data['mentions'][0].update(changes)
            with self.assertRaises(ValueError):
                validate(data)

    def test_explicit_visibility_database_and_original_speech(self):
        data = bundle()
        del data['videos'][0]['visible']
        with self.assertRaises(KeyError):
            validate(data)
        data = bundle()
        data['mentions'][0]['spoken_name'] = "실제 '발언'; \\ 소리"
        result = sql(data, 'preview')
        self.assertIn("실제 ''발언'';", result)
        self.assertIn("SET LOCAL standard_conforming_strings = on", result)
        self.assertIn("Wrong database", result)
        self.assertIn('BEGIN;', result)
        self.assertTrue(result.endswith('COMMIT;\n'))


if __name__ == '__main__':
    unittest.main()
