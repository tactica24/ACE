import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export default function PrimaryButton({
  label,
  onPress,
  disabled
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.button, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.brand,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center'
  },
  text: {
    color: 'white',
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.6
  }
});
