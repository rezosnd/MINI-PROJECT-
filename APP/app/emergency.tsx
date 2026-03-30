import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmergencyScreen() {
  const handleSOS = () => {
    Alert.alert('SOS Triggered', 'Emergency services have been notified.');
  };

  const handleAlert = () => {
    Alert.alert('Alert Sent', 'Emergency alert sent to contacts.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['rgba(255,59,48,0.1)', 'rgba(139,0,0,0.1)']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header with Icon */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="alert-circle" size={56} color="#FF3B30" />
            <Text style={styles.title}>EMERGENCY SOS</Text>
            <Text style={styles.subtitle}>Immediate response system</Text>
          </View>

          {/* Large SOS Button */}
          <TouchableOpacity onPress={handleSOS} style={styles.sosButton}>
            <MaterialCommunityIcons name="phone-alert" size={48} color="#fff" />
            <Text style={styles.sosText}>TRIGGER SOS</Text>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity onPress={handleAlert} style={styles.actionButton}>
              <MaterialCommunityIcons name="bell-alert" size={20} color="#FF3B30" />
              <Text style={styles.actionText}>Send Alert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons name="phone" size={20} color="#FF3B30" />
              <Text style={styles.actionText}>Call Emergency Services</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#FF3B30" />
              <Text style={styles.actionText}>Share Location</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emergency Status</Text>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="wifi" size={18} color="#10b981" />
              <Text style={styles.statusText}>Network: Connected</Text>
            </View>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="signal-cellular-3" size={18} color="#10b981" />
              <Text style={styles.statusText}>Signal: Strong</Text>
            </View>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="battery" size={18} color="#10b981" />
              <Text style={styles.statusText}>Battery: 85%</Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <MaterialCommunityIcons name="alert" size={20} color="#FF3B30" />
            <Text style={styles.warningText}>Use this feature only in genuine emergencies.</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1B' },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { color: '#FF3B30', fontSize: 24, fontWeight: '900', marginTop: 12 },
  subtitle: { color: '#FF8A80', fontSize: 13, marginTop: 4 },
  sosButton: { backgroundColor: '#FF3B30', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 24, elevation: 8 },
  sosText: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 12 },
  card: { backgroundColor: 'rgba(255,59,48,0.08)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,59,48,0.1)' },
  actionText: { color: '#ccd6f6', marginLeft: 12, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,59,48,0.1)' },
  statusText: { color: '#8892B0', marginLeft: 12, fontWeight: '700' },
  warningBox: { flexDirection: 'row', backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  warningText: { color: '#FF8A80', marginLeft: 12, flex: 1, fontSize: 13, fontWeight: '700' }
});
