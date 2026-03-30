import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

export default function Profile() {
  const [security, setSecurity] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Security System</Text>
        <Switch value={security} onValueChange={setSecurity} />
      </View>
      <Text style={styles.note}>Account: demo@riskshield.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 16 },
  note: { color: 'gray', marginTop: 20 },
});
