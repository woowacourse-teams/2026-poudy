import Svg, { Path } from 'react-native-svg';

import type { AppTopBarIconName } from '@/types/appTopBar';

const SIZE = 24;
const COLOR = '#202124';
const STROKE_WIDTH = 1.5;

const PATHS: Record<AppTopBarIconName, readonly string[]> = {
  back: ['m15 18-6-6 6-6'],
  home: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  share: ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 8 5-5 5 5'],
};

export default function AppTopBarIcon({ name }: { readonly name: AppTopBarIconName }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox='0 0 24 24' fill='none'>
      {PATHS[name].map((d) => (
        <Path key={d} d={d} stroke={COLOR} strokeWidth={STROKE_WIDTH} strokeLinecap='round' strokeLinejoin='round' />
      ))}
    </Svg>
  );
}
