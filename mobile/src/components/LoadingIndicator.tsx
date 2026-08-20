import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

interface LoadingIndicatorProps {
  readonly label?: string;
  readonly size?: number;
  readonly style?: StyleProp<ViewStyle>;
}

interface FacetDefinition {
  readonly angle: string;
  readonly axisRotation: string;
  readonly color: string;
  readonly counterRotation: string;
  readonly hinge: readonly [x: number, y: number];
  readonly points: string;
}

interface FoldCurve {
  readonly inputRange: readonly number[];
  readonly outputRange: readonly number[];
}

const EDGE_OPACITY_START = 0.68;
const PERSPECTIVE_MULTIPLIER = 8;
const VIEW_BOX_SIZE = 256;
const UNFOLD_EASING = Easing.bezier(0.22, 0.8, 0.3, 1);
const REFOLD_EASING = Easing.bezier(0.7, 0, 0.78, 0.2);

/** 접히는 구간을 몇 조각으로 잘라 가속 곡선을 옮겨 담을지. 크면 곡선이 더 매끄럽다. */
const EASING_SAMPLE_COUNT = 12;

const FACETS: readonly FacetDefinition[] = [
  {
    color: '#F5698C',
    points: '89 27 156 27 101 82 50 133 50 68',
    hinge: [122.5, 27],
    axisRotation: '0deg',
    counterRotation: '0deg',
    angle: '90deg',
  },
  {
    color: '#F894AD',
    points: '101 82 101 178 50 229 50 133',
    hinge: [75.5, 107.5],
    axisRotation: '-45deg',
    counterRotation: '45deg',
    angle: '-90deg',
  },
  {
    color: '#FBC3D1',
    points: '158 27 204 73 204 130 129 56',
    hinge: [143.5, 41.5],
    axisRotation: '-45deg',
    counterRotation: '45deg',
    angle: '90deg',
  },
  {
    color: '#DC4F73',
    points: '175 102 204 131 160 178 104 178',
    hinge: [189.5, 116.5],
    axisRotation: '45deg',
    counterRotation: '-45deg',
    angle: '90deg',
  },
];

const EASING_STEPS = Array.from({ length: EASING_SAMPLE_COUNT }, (_, index) => (index + 1) / EASING_SAMPLE_COUNT);

/* 한 바퀴의 시간표(ms). 조각의 차례는 여기서 나오므로 조각 정의에는 적지 않는다. */

/** 조각 하나가 접히거나 펴지는 데 걸리는 시간. */
const FOLD_DURATION = 253;
/** 앞 조각이 움직이기 시작하고 다음 조각이 따라 나설 때까지의 간격. */
const FACET_STAGGER = 184;
/** 네 조각이 다 선 로고를 그대로 두는 시간. */
const COMPLETE_HOLD = 575;
/** 다 접힌 뒤 다시 펼치기 전까지 비워 두는 시간. */
const RESTART_PAUSE = 330;

const LAST_FACET_INDEX = FACETS.length - 1;
const UNFOLD_SPAN = LAST_FACET_INDEX * FACET_STAGGER + FOLD_DURATION;
const REFOLD_BEGIN = UNFOLD_SPAN + COMPLETE_HOLD;
const CYCLE_DURATION = REFOLD_BEGIN + UNFOLD_SPAN + RESTART_PAUSE;

const unfoldStartOf = (index: number) => (index * FACET_STAGGER) / CYCLE_DURATION;
const refoldStartOf = (index: number) => (REFOLD_BEGIN + (LAST_FACET_INDEX - index) * FACET_STAGGER) / CYCLE_DURATION;
const foldPortion = FOLD_DURATION / CYCLE_DURATION;

/** 네 조각이 모두 누워 있는 한복판. 동작 줄이기가 켜졌을 때 시계를 여기에 세운다. */
const RESTING_PROGRESS = (UNFOLD_SPAN + REFOLD_BEGIN) / 2 / CYCLE_DURATION;

/**
 * 한 바퀴를 도는 시계 값(0 → 1)을 조각의 접힘 정도(1 = 모로 섬, 0 = 누움)로 옮기는 표.
 *
 * `interpolate` 는 점과 점 사이를 직선으로 잇는다. 가속 곡선을 살리려면 접히는 구간을
 * 여러 조각으로 잘라 곡선 위의 값을 직접 찍어 두어야 한다.
 */
const createFoldCurve = (index: number): FoldCurve => {
  const unfoldStart = unfoldStartOf(index);
  const refoldStart = refoldStartOf(index);
  const inputRange = [
    unfoldStart,
    ...EASING_STEPS.map((step) => unfoldStart + foldPortion * step),
    refoldStart,
    ...EASING_STEPS.map((step) => refoldStart + foldPortion * step),
    1,
  ];
  const outputRange = [
    1,
    ...EASING_STEPS.map((step) => 1 - UNFOLD_EASING(step)),
    0,
    ...EASING_STEPS.map(REFOLD_EASING),
    1,
  ];

  return unfoldStart > 0
    ? { inputRange: [0, ...inputRange], outputRange: [1, ...outputRange] }
    : { inputRange, outputRange };
};

const FOLD_CURVES = FACETS.map((_, index) => createFoldCurve(index));

/**
 * 로고 조각이 1 → 4 순서로 펼쳐지고 4 → 1 순서로 다시 접히는
 * SVG 모바일 로딩 인디케이터. 동작 줄이기가 켜지면 완성된 로고만 보여 준다.
 *
 * 네 조각은 시계 하나를 나눠 쓴다. 조각마다 따로 돌리면 `Animated.delay` 가 JS 타이머라
 * 한 바퀴마다 조금씩 밀리고, 오래 틀수록 조각끼리 어긋난다.
 */
export default function LoadingIndicator({ label = '불러오는 중', size = 64, style }: LoadingIndicatorProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!controller.signal.aborted) {
        setReduceMotionEnabled(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);

    return () => {
      controller.abort();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      progress.setValue(RESTING_PROGRESS);
      return;
    }

    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotionEnabled]);

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole='progressbar'
      accessible
      style={[styles.container, { width: size, height: size }, style]}
    >
      {FACETS.map((facet, index) => {
        const hingeX = (size * facet.hinge[0]) / VIEW_BOX_SIZE;
        const hingeY = (size * facet.hinge[1]) / VIEW_BOX_SIZE;
        const curve = FOLD_CURVES[index];
        const fold = progress.interpolate({
          inputRange: [...curve.inputRange],
          outputRange: [...curve.outputRange],
        });
        const rotation = fold.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', facet.angle],
        });
        const opacity = fold.interpolate({
          inputRange: [0, EDGE_OPACITY_START, 1],
          outputRange: [1, 1, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={facet.color}
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
            style={[
              styles.facet,
              {
                width: size * 2,
                height: size * 2,
                left: hingeX - size,
                top: hingeY - size,
                opacity,
                transform: [
                  { perspective: size * PERSPECTIVE_MULTIPLIER },
                  { rotateZ: facet.axisRotation },
                  { rotateX: rotation },
                  { rotateZ: facet.counterRotation },
                ],
              },
            ]}
          >
            <Svg
              height={size}
              pointerEvents='none'
              style={{ left: size - hingeX, position: 'absolute', top: size - hingeY }}
              viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
              width={size}
            >
              <Polygon fill={facet.color} points={facet.points} />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  facet: {
    position: 'absolute',
  },
});
