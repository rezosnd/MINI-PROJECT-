import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScannerScreen() {
  const [scanning, setScanning] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Property Scanner</Text>
      <Text style={styles.subtitle}>Use this screen to scan a property (placeholder).</Text>

      <TouchableOpacity
        style={[styles.button, scanning && styles.buttonDisabled]}
        onPress={() => setScanning(true)}
        disabled={scanning}
      >
        <Text style={styles.buttonText}>{scanning ? 'Scanning...' : 'Start Scan'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: 'gray', marginBottom: 20 },
  button: { backgroundColor: '#0064ff', padding: 12, borderRadius: 8 },
  buttonDisabled: { backgroundColor: '#999' },
  buttonText: { color: 'white', fontWeight: '600' },
});
