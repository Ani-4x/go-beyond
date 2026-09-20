import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

type Item = { label: string; kind: 'zone' | 'edge' | 'focus' };

/** Key for the radar chart. */
export function Legend({ items }: { items: Item[] }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View key={it.label} style={styles.item}>
          {it.kind === 'zone' && <View style={{ width: 22, borderTopWidth: 2.5, borderColor: t.accent }} />}
          {it.kind === 'edge' && <View style={{ width: 22, borderTopWidth: 2, borderStyle: 'dashed', borderColor: t.muted }} />}
          {it.kind === 'focus' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.ember }} />}
          <AppText variant="caption" muted>{it.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
