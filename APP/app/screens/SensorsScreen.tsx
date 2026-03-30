import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SensorsScreen() {
  const [sensors, setSensors] = useState<any[]>([]);

  useEffect(() => {
    setSensors([
      { id: '1', name: 'Temperature', value: '24.5°C' },
      { id: '2', name: 'Humidity', value: '65%' },
      { id: '3', name: 'Water Level', value: '45cm' },
    ]);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>IoT Sensors</Text>
      {sensors.map(s => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>{s.name}</Text>
          <Text style={styles.cardValue}>{s.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 10 },
  cardTitle: { fontWeight: '600' },
  cardValue: { marginTop: 6, color: '#0064ff', fontWeight: '700' },
});
