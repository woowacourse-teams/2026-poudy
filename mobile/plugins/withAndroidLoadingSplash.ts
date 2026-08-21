import * as fs from 'node:fs';
import * as path from 'node:path';

import { type ConfigPlugin, withDangerousMod } from 'expo/config-plugins';

import animation from '../src/constants/loadingAnimation.json';

interface FoldFrame {
  readonly at: number;
  readonly fold: number;
}

const CANVAS_SIZE = 288;
const ARTWORK_SCALE = 0.25;
const ARTWORK_OFFSET = 112;
const KEYFRAME_PRECISION = 5;
const BISECTION_STEPS = 24;

const { facets, timing, easing, easingSampleCount, edgeOpacityStart } = animation;

const LAST_FACET_INDEX = facets.length - 1;
const UNFOLD_SPAN = LAST_FACET_INDEX * timing.facetStagger + timing.foldDuration;

/**
 * 스플래시는 한 바퀴를 다 돌지 않고 펴지는 데까지만 재생하고 멈춘다. 인계 시점이 언제든
 * 양쪽이 "다 펴진" 같은 그림이라, RN 으로 넘어갈 때 조각이 되감기지 않는다.
 * Android 가 아이콘 애니메이션을 1초까지만 붙잡아 두는 상한 안에도 들어온다.
 */
export const SPLASH_ANIMATION_DURATION = UNFOLD_SPAN;

/**
 * CSS cubic-bezier. RN 의 `Easing.bezier` 와 같은 값을 내야 두 화면이 이어진다.
 * x 에 해당하는 매개변수는 이분법으로 좁힌다.
 */
const toEasing = (curve: readonly number[]) => {
  const [x1, y1, x2, y2] = curve;
  const axis = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;

  return (x: number) => {
    const range = Array.from({ length: BISECTION_STEPS }).reduce<{ low: number; high: number }>(
      (current) => {
        const mid = (current.low + current.high) / 2;
        return axis(x1, x2, mid) < x ? { low: mid, high: current.high } : { low: current.low, high: mid };
      },
      { low: 0, high: 1 },
    );

    return axis(y1, y2, (range.low + range.high) / 2);
  };
};

const unfoldEasing = toEasing(easing.unfold);
const easingSteps = Array.from({ length: easingSampleCount }, (_, index) => (index + 1) / easingSampleCount);
const foldPortion = timing.foldDuration / UNFOLD_SPAN;

/** 펴지는 구간만의 시계 값과 그때의 접힘 정도(1 = 모로 섬, 0 = 누움). 끝나면 그대로 선다. */
const createFoldFrames = (index: number): readonly FoldFrame[] => {
  const unfoldStart = (index * timing.facetStagger) / UNFOLD_SPAN;

  const frames: readonly FoldFrame[] = [
    { at: unfoldStart, fold: 1 },
    ...easingSteps.map((step) => ({ at: unfoldStart + foldPortion * step, fold: 1 - unfoldEasing(step) })),
    { at: 1, fold: 0 },
  ];

  return unfoldStart > 0 ? [{ at: 0, fold: 1 }, ...frames] : frames;
};

/** AVD 는 3D 회전과 원근을 못 쓴다. 접힘을 세로 수축으로 근사해 90도에서 두께가 0 이 된다. */
const foldToScale = (fold: number) => Math.cos((fold * Math.PI) / 2);

const foldToAlpha = (fold: number) =>
  fold <= edgeOpacityStart ? 1 : Math.max(0, 1 - (fold - edgeOpacityStart) / (1 - edgeOpacityStart));

const toFixed = (value: number) => Number(value.toFixed(KEYFRAME_PRECISION)).toString();

/** 마지막 표본이 이미 끝에 닿으면 종료 프레임과 겹친다. 같은 지점은 뒤엣것만 남긴다. */
const toKeyframes = (frames: readonly FoldFrame[], toValue: (fold: number) => number) => {
  const rows = frames.map((frame) => ({
    at: toFixed(Math.min(1, Math.max(0, frame.at))),
    value: toFixed(toValue(frame.fold)),
  }));

  return rows
    .filter((row, index) => index === rows.length - 1 || rows[index + 1].at !== row.at)
    .map((row) => `    <keyframe android:fraction="${row.at}" android:value="${row.value}" />`)
    .join('\n');
};

const toAnimator = (property: string, keyframes: string) => `<?xml version="1.0" encoding="utf-8"?>
<objectAnimator xmlns:android="http://schemas.android.com/apk/res/android"
    android:duration="${UNFOLD_SPAN}"
    android:interpolator="@android:interpolator/linear"
    android:repeatCount="0"
    android:valueType="floatType">
  <propertyValuesHolder android:propertyName="${property}">
${keyframes}
  </propertyValuesHolder>
</objectAnimator>
`;

const toPathData = (points: string) => {
  const values = points.split(' ');
  const pairs = values.filter((_, index) => index % 2 === 0).map((x, index) => `${x},${values[index * 2 + 1]}`);

  return `M${pairs.join(' L')} Z`;
};

/**
 * 조각 하나를 경첩 기준으로 접는다. 바깥에서 축을 세우고, 가운데에서 두께를 줄이고,
 * 안쪽에서 축을 되돌린다. RN 쪽 `rotateZ → rotateX → rotateZ` 와 같은 차례다.
 */
const toFacetGroup = (facet: (typeof facets)[number], index: number) => {
  const [pivotX, pivotY] = facet.hinge;

  return `    <group
        android:name="facet${index}_axis"
        android:pivotX="${pivotX}"
        android:pivotY="${pivotY}"
        android:rotation="${facet.axisRotation}">
      <group
          android:name="facet${index}_fold"
          android:pivotX="${pivotX}"
          android:pivotY="${pivotY}"
          android:scaleY="1">
        <group
            android:name="facet${index}_counter"
            android:pivotX="${pivotX}"
            android:pivotY="${pivotY}"
            android:rotation="${facet.counterRotation}">
          <path
              android:name="facet${index}_path"
              android:fillAlpha="1"
              android:fillColor="${facet.color}"
              android:pathData="${toPathData(facet.points)}" />
        </group>
      </group>
    </group>`;
};

const LOADER_VECTOR = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${CANVAS_SIZE}dp"
    android:height="${CANVAS_SIZE}dp"
    android:viewportWidth="${CANVAS_SIZE}"
    android:viewportHeight="${CANVAS_SIZE}">
  <group
      android:scaleX="${ARTWORK_SCALE}"
      android:scaleY="${ARTWORK_SCALE}"
      android:translateX="${ARTWORK_OFFSET}"
      android:translateY="${ARTWORK_OFFSET}">
${facets.map(toFacetGroup).join('\n')}
  </group>
</vector>
`;

const ANIMATED_LOADER = `<?xml version="1.0" encoding="utf-8"?>
<animated-vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@drawable/splashscreen_loader_static">
${facets
  .map(
    (
      _,
      index,
    ) => `  <target android:name="facet${index}_fold" android:animation="@animator/splashscreen_facet${index}_fold" />
  <target android:name="facet${index}_path" android:animation="@animator/splashscreen_facet${index}_alpha" />`,
  )
  .join('\n')}
</animated-vector>
`;

const writeResource = (resourceRoot: string, directory: string, filename: string, contents: string) => {
  const targetDirectory = path.join(resourceRoot, directory);
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(path.join(targetDirectory, filename), contents);
};

/** Android 12+ 에서는 로더가 접혔다 펴지고, 하위 버전에는 다 펴진 정지 화면을 둔다. */
const withAndroidLoadingSplash: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const resourceRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');

      // 같은 그림을 두 이름으로 둔다. v31 에서 splashscreen_loader 는 애니메이션이라
      // 그 원본을 같은 이름으로 가리키면 자기 자신을 참조하게 된다.
      writeResource(resourceRoot, 'drawable', 'splashscreen_loader.xml', LOADER_VECTOR);
      writeResource(resourceRoot, 'drawable', 'splashscreen_loader_static.xml', LOADER_VECTOR);
      writeResource(resourceRoot, 'drawable-v31', 'splashscreen_loader.xml', ANIMATED_LOADER);

      facets.forEach((_, index) => {
        const frames = createFoldFrames(index);

        writeResource(
          resourceRoot,
          'animator-v31',
          `splashscreen_facet${index}_fold.xml`,
          toAnimator('scaleY', toKeyframes(frames, foldToScale)),
        );
        writeResource(
          resourceRoot,
          'animator-v31',
          `splashscreen_facet${index}_alpha.xml`,
          toAnimator('fillAlpha', toKeyframes(frames, foldToAlpha)),
        );
      });

      return modConfig;
    },
  ]);

export default withAndroidLoadingSplash;
