import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = 'https://cyberxkiit-backend-bot.onrender.com';

const EMERGENCY_TYPES = [
  { id: 'medical', label: 'Medical', icon: 'medkit' },
  { id: 'fire', label: 'Fire', icon: 'flame' },
  { id: 'disaster', label: 'Natural disaster', icon: 'alert-circle' },
  { id: 'accident', label: 'Accident', icon: 'car' },
  { id: 'crime', label: 'Crime', icon: 'shield' },
  { id: 'hazard', label: 'Hazard', icon: 'warning' },
] as const;

export default function EmergencyScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('Location not shared yet');

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    const loc = await Location.getCurrentPositionAsync({});
    const reverse = await Location.reverseGeocodeAsync(loc.coords);
    const city = reverse[0]?.city || reverse[0]?.district || 'Unknown';
    const region = reverse[0]?.region || 'Unknown';
    setLocationLabel(`${city}, ${region}`);
    return loc;
  };

  const sendEmergencyAlert = async () => {
    if (!selectedType) {
      Alert.alert('Emergency', 'Please choose an emergency type first.');
      return;
    }

    try {
      setLoading(true);
      const loc = await fetchLocation();

      const payload = {
        userId: `usr_${Math.random().toString(36).slice(2, 9)}`,
        emergencyType: selectedType,
        coordinates: `${loc.coords.latitude},${loc.coords.longitude}`,
        location: locationLabel,
        text: `Emergency alert: ${selectedType}`,
      };

      const res = await fetch(`${BACKEND_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to send emergency alert');

      Alert.alert('Alert sent', 'Emergency services have been notified.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to send alert right now.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#64FFDA" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#020c1b', '#061428']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="alert-circle" size={36} color="#64FFDA" />
            <Text style={styles.title}>Emergency</Text>
            <Text style={styles.subtitle}>Fast emergency alert and location sharing</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your location</Text>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={18} color="#64FFDA" />
              <Text style={styles.rowText}>{locationLabel}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select emergency type</Text>
            <View style={styles.typesWrap}>
              {EMERGENCY_TYPES.map((item) => {
                const active = selectedType === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.typeBtn, active && styles.typeBtnActive]}
                    onPress={() => setSelectedType(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={item.icon} size={18} color={active ? '#02202a' : '#64FFDA'} />
                    <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.alertBtn} onPress={sendEmergencyAlert} activeOpacity={0.85}>
            <MaterialCommunityIcons name="alarm-light" size={20} color="#02202a" />
            <Text style={styles.alertBtnText}>Send emergency alert</Text>
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              Use this feature only for real emergencies.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020c1b' },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  loaderWrap: { flex: 1, backgroundColor: '#020c1b', justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 14 },
  title: { color: '#ccd6f6', fontSize: 22, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#64FFDA', fontSize: 12, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { color: '#ccd6f6', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { color: '#cbd5e1', marginLeft: 8 },
  typesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.35)',
    backgroundColor: 'transparent',
  },
  typeBtnActive: { backgroundColor: '#64FFDA', borderColor: '#64FFDA' },
  typeLabel: { color: '#64FFDA', marginLeft: 8, fontWeight: '700', fontSize: 12 },
  typeLabelActive: { color: '#02202a' },
  alertBtn: {
    backgroundColor: '#64FFDA',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  alertBtnText: { color: '#02202a', fontWeight: '800', fontSize: 15 },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
  },
  noteText: { color: '#8892B0', textAlign: 'center', fontSize: 12 },
});
