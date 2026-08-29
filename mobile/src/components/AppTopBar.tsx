import { Pressable, StyleSheet, View } from 'react-native';

import AppTopBarIcon from '@/components/AppTopBarIcon';
import type { AppTopBarProps } from '@/types/appTopBar';

export default function AppTopBar({ onBack, onHome, onShare }: AppTopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.group}>
        <Pressable accessibilityLabel='뒤로 가기' accessibilityRole='button' onPress={onBack} style={styles.button}>
          <AppTopBarIcon name='back' />
        </Pressable>
        <Pressable accessibilityLabel='홈으로' accessibilityRole='button' onPress={onHome} style={styles.button}>
          <AppTopBarIcon name='home' />
        </Pressable>
      </View>

      <Pressable accessibilityLabel='공유하기' accessibilityRole='button' onPress={onShare} style={styles.button}>
        <AppTopBarIcon name='share' />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e9ec',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
