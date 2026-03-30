import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([
    { id: 1, title: 'High Temperature', time: '2 mins ago', read: false },
    { id: 2, title: 'Flood Warning', time: '15 mins ago', read: true },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Risk Alerts</Text>
      {alerts.map(a => (
        <View key={a.id} style={[styles.card, !a.read && styles.unread]}>
          <Text style={styles.cardTitle}>{a.title}</Text>
          <Text style={styles.cardTime}>{a.time}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={() => setAlerts([])}>
        <Text style={styles.buttonText}>Clear Alerts</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 10 },
  unread: { borderLeftWidth: 4, borderLeftColor: '#0064ff' },
  cardTitle: { fontWeight: '600' },
  cardTime: { color: 'gray', marginTop: 6 },
  button: { marginTop: 12, backgroundColor: '#0064ff', padding: 10, borderRadius: 8, alignSelf: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});
