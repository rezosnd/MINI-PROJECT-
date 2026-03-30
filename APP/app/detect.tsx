import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DetectScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['rgba(2,12,27,0.9)', 'rgba(2,12,27,1)']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header with Icon */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="radar" size={48} color="#3b82f6" />
            <Text style={styles.title}>DETECTION & RADAR</Text>
            <Text style={styles.subtitle}>Environmental threat monitoring</Text>
          </View>

          {/* Radar Status Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="pulse" size={24} color="#3b82f6" />
              <Text style={styles.cardTitle}>Radar Status</Text>
            </View>
            <Text style={styles.cardContent}>Scanning Environment</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Detection: Active</Text>
            </View>
          </View>

          {/* Detection Parameters */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detection Parameters</Text>
            <TouchableOpacity style={styles.parameterRow}>
              <MaterialCommunityIcons name="thermometer" size={20} color="#3b82f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paramLabel}>Temperature Anomaly</Text>
                <Text style={styles.paramValue}>Monitoring...</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.parameterRow}>
              <MaterialCommunityIcons name="water-wave" size={20} color="#3b82f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paramLabel}>Atmospheric Pressure</Text>
                <Text style={styles.paramValue}>1013.25 hPa</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.parameterRow}>
              <MaterialCommunityIcons name="waves" size={20} color="#3b82f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paramLabel}>Seismic Activity</Text>
                <Text style={styles.paramValue}>No threats detected</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.parameterRow}>
              <MaterialCommunityIcons name="cloud-alert" size={20} color="#3b82f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paramLabel}>Weather Patterns</Text>
                <Text style={styles.paramValue}>Normal conditions</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons name="refresh" size={20} color="#3b82f6" />
              <Text style={styles.actionText}>Refresh Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialCommunityIcons name="history" size={20} color="#3b82f6" />
              <Text style={styles.actionText}>Detection History</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#8892B0" />
            <Text style={styles.infoText}>Real-time detection of environmental threats and anomalies.</Text>
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
  title: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 12 },
  subtitle: { color: '#64FFDA', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.1)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  cardContent: { color: '#8892B0', fontSize: 14 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginRight: 8 },
  statusText: { color: '#3b82f6', fontWeight: '700' },
  parameterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(59,130,246,0.06)' },
  paramLabel: { color: '#ccd6f6', fontWeight: '700', fontSize: 13 },
  paramValue: { color: '#8892B0', fontSize: 12, marginTop: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  actionText: { color: '#ccd6f6', marginLeft: 12, fontWeight: '700' },
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  infoText: { color: '#8892B0', marginLeft: 12, flex: 1, fontSize: 13 }
});
