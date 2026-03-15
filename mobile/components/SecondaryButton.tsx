import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export default function SecondaryButton({
  label,
  onPress
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: 'rgba(27, 26, 23, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center'
  },
  text: {
    color: theme.ink,
    fontWeight: '600'
  }
});
