import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuditScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['rgba(2,12,27,0.9)', 'rgba(2,12,27,1)']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header with Icon */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="camera" size={48} color="#f59e0b" />
            <Text style={styles.title}>PHOTO AUDIT</Text>
            <Text style={styles.subtitle}>Visual documentation & analysis</Text>
          </View>

          {/* Camera Status Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="camera-check" size={24} color="#f59e0b" />
              <Text style={styles.cardTitle}>Camera Status</Text>
            </View>
            <Text style={styles.cardContent}>Ready to capture</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Camera: Active</Text>
            </View>
          </View>

          {/* Capture Options */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Capture Options</Text>
            <TouchableOpacity style={styles.optionButton}>
              <MaterialCommunityIcons name="camera" size={20} color="#f59e0b" />
              <Text style={styles.optionText}>Take Photo</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#8892B0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton}>
              <MaterialCommunityIcons name="video" size={20} color="#f59e0b" />
              <Text style={styles.optionText}>Record Video</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#8892B0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton}>
              <MaterialCommunityIcons name="panorama" size={20} color="#f59e0b" />
              <Text style={styles.optionText}>Panoramic Capture</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#8892B0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton}>
              <MaterialCommunityIcons name="timelapse" size={20} color="#f59e0b" />
              <Text style={styles.optionText}>Time-lapse Mode</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#8892B0" />
            </TouchableOpacity>
          </View>

          {/* Analysis Tools */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Analysis Tools</Text>
            <TouchableOpacity style={styles.toolButton}>
              <MaterialCommunityIcons name="ruler" size={20} color="#f59e0b" />
              <Text style={styles.toolText}>Measurement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolButton}>
              <MaterialCommunityIcons name="contrast-box" size={20} color="#f59e0b" />
              <Text style={styles.toolText}>Color Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolButton}>
              <MaterialCommunityIcons name="image-search" size={20} color="#f59e0b" />
              <Text style={styles.toolText}>Pattern Detection</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Audits */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="history" size={24} color="#f59e0b" />
              <Text style={styles.cardTitle}>Recent Audits</Text>
            </View>
            <Text style={styles.noDataText}>No audits yet. Start capturing to build your audit library.</Text>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#8892B0" />
            <Text style={styles.infoText}>Capture and analyze photos for comprehensive site documentation.</Text>
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
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.1)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  cardContent: { color: '#8892B0', fontSize: 14 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b', marginRight: 8 },
  statusText: { color: '#f59e0b', fontWeight: '700' },
  optionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  optionText: { color: '#ccd6f6', marginLeft: 12, flex: 1, fontWeight: '700' },
  toolButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, marginBottom: 8 },
  toolText: { color: '#ccd6f6', marginLeft: 12, fontWeight: '700' },
  noDataText: { color: '#8892B0', fontSize: 13, marginTop: 8 },
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  infoText: { color: '#8892B0', marginLeft: 12, flex: 1, fontSize: 13 }
});
