import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import loadingAnimation from '@/constants/loadingAnimation.json';
import type { FacetDefinition, FoldCurve } from '@/types/loadingIndicator';

interface LoadingIndicatorProps {
  readonly label?: string;
  readonly onInitialFoldComplete?: () => void;
  readonly isRunning?: boolean;
  readonly size?: number;
  readonly style?: StyleProp<ViewStyle>;
}

const toEasing = (curve: readonly number[]) => Easing.bezier(curve[0], curve[1], curve[2], curve[3]);
const toDegrees = (value: number) => `${value}deg`;

const PERSPECTIVE_MULTIPLIER = 8;
const EDGE_OPACITY_START = loadingAnimation.edgeOpacityStart;
const VIEW_BOX_SIZE = loadingAnimation.viewBoxSize;
const UNFOLD_EASING = toEasing(loadingAnimation.easing.unfold);
const REFOLD_EASING = toEasing(loadingAnimation.easing.refold);

const EASING_SAMPLE_COUNT = loadingAnimation.easingSampleCount;

const FACETS: readonly FacetDefinition[] = loadingAnimation.facets.map((facet) => ({
  color: facet.color,
  points: facet.points,
  hinge: [facet.hinge[0], facet.hinge[1]],
  axisRotation: toDegrees(facet.axisRotation),
  counterRotation: toDegrees(facet.counterRotation),
  angle: toDegrees(facet.angle),
}));

const EASING_STEPS = Array.from({ length: EASING_SAMPLE_COUNT }, (_, index) => (index + 1) / EASING_SAMPLE_COUNT);

const FOLD_DURATION = loadingAnimation.timing.foldDuration;
const FACET_STAGGER = loadingAnimation.timing.facetStagger;
const COMPLETE_HOLD = loadingAnimation.timing.completeHold;
const RESTART_PAUSE = loadingAnimation.timing.restartPause;

const LAST_FACET_INDEX = FACETS.length - 1;
const UNFOLD_SPAN = LAST_FACET_INDEX * FACET_STAGGER + FOLD_DURATION;
const REFOLD_BEGIN = UNFOLD_SPAN + COMPLETE_HOLD;
const REFOLD_END = REFOLD_BEGIN + UNFOLD_SPAN;
const CYCLE_DURATION = REFOLD_BEGIN + UNFOLD_SPAN + RESTART_PAUSE;

const unfoldStartOf = (index: number) => (index * FACET_STAGGER) / CYCLE_DURATION;
const refoldStartOf = (index: number) => (REFOLD_BEGIN + (LAST_FACET_INDEX - index) * FACET_STAGGER) / CYCLE_DURATION;
const foldPortion = FOLD_DURATION / CYCLE_DURATION;

const REFOLD_END_PROGRESS = REFOLD_END / CYCLE_DURATION;

const RESTING_PROGRESS = (UNFOLD_SPAN + REFOLD_BEGIN) / 2 / CYCLE_DURATION;

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

export default function LoadingIndicator({
  label = '불러오는 중',
  onInitialFoldComplete,
  isRunning = true,
  size = 64,
  style,
}: LoadingIndicatorProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!controller.signal.aborted) {
        setIsReduceMotionEnabled(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReduceMotionEnabled);

    return () => {
      controller.abort();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      progress.setValue(0);
      return;
    }

    if (isReduceMotionEnabled) {
      progress.setValue(RESTING_PROGRESS);
      onInitialFoldComplete?.();
      return;
    }

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    progress.setValue(0);
    const initialFold = Animated.timing(progress, {
      toValue: REFOLD_END_PROGRESS,
      duration: REFOLD_END,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const restartPause = Animated.timing(progress, {
      toValue: 1,
      duration: RESTART_PAUSE,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    initialFold.start(({ finished }) => {
      if (!finished) {
        return;
      }

      onInitialFoldComplete?.();
      restartPause.start(({ finished: pauseFinished }) => {
        if (!pauseFinished) {
          return;
        }

        progress.setValue(0);
        loop.start();
      });
    });

    return () => {
      initialFold.stop();
      restartPause.stop();
      loop.stop();
    };
  }, [isReduceMotionEnabled, isRunning, onInitialFoldComplete, progress]);

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
            renderToHardwareTextureAndroid
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
