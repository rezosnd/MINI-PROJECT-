import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ScannerScreen() {
  const [loading, setLoading] = useState(true);
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    spinLoop.start();

    const timer = setTimeout(() => setLoading(false), 1400);
    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072' }}
          style={styles.backgroundImage}
          blurRadius={100}
        >
          <LinearGradient colors={['rgba(2,12,27,0.7)', 'rgba(2,12,27,1)']} style={styles.darkOverlay}>
            <View style={styles.loaderWrap}>
              <Animated.View style={[styles.loaderRingOuter, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
              <Animated.View style={[styles.loaderRingInner, { transform: [{ rotate }] }]}>
                <View style={styles.loaderCore}>
                  <MaterialCommunityIcons name="radar" size={22} color="#64FFDA" />
                </View>
              </Animated.View>
              <Text style={styles.loaderTitle}>Preparing Signal Sweep</Text>
              <Text style={styles.loaderSubtitle}>Calibrating live channels</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072' }}
        style={styles.backgroundImage}
        blurRadius={100}
      >
        <LinearGradient colors={['rgba(2,12,27,0.7)', 'rgba(2,12,27,1)']} style={styles.darkOverlay}>
          <ScrollView style={styles.safeFrame} showsVerticalScrollIndicator={false}>
            <View style={styles.headerSection}>
              <Text style={styles.brandTitle}>ALPHA EARTH</Text>
              <View style={styles.locRow}>
                <Ionicons name="scan" size={11} color="#64FFDA" />
                <Text style={styles.locText}>Signal Sweep</Text>
              </View>
            </View>

            <View style={styles.heroCard}>
              <LinearGradient colors={['rgba(100,255,218,0.03)', 'rgba(10,25,47,0.9)']} style={styles.heroGradient}>
                <Text style={styles.heroLabel}>Live Signal Sweep</Text>
                <Text style={styles.heroTitle}>Field channels are ready</Text>
                <Text style={styles.heroDescription}>
                  Run a quick sweep to catch abnormal readings and route alerts to your response workflow.
                </Text>
                <TouchableOpacity style={styles.scanButton} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="radar" size={16} color="#020c1b" />
                  <Text style={styles.scanButtonText}>Begin Sweep</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>Live Overview</Text>
            <View style={styles.grid}>
              <StatusCard icon="pulse" title="Signal Health" value="Stable" />
              <StatusCard icon="access-point-network" title="Sensor Nodes" value="18 Online" />
              <StatusCard icon="shield-alert-outline" title="Anomalies" value="2 Detected" />
              <StatusCard icon="clock-outline" title="Last Sweep" value="12s ago" />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

type StatusCardProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  value: string;
};

function StatusCard({ icon, title, value }: StatusCardProps) {
  return (
    <View style={styles.moduleCard}>
      <MaterialCommunityIcons name={icon} size={22} color="#64FFDA" />
      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.moduleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020c1b' },
  backgroundImage: { flex: 1 },
  darkOverlay: { flex: 1 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loaderRingOuter: {
    position: 'absolute',
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.35)',
  },
  loaderRingInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.6)',
    borderTopColor: '#64FFDA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(17, 34, 64, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderTitle: { color: '#e6f1ff', fontSize: 17, fontWeight: '800', marginTop: 24 },
  loaderSubtitle: { color: '#8892B0', fontSize: 12, marginTop: 6 },
  safeFrame: { flex: 1, paddingHorizontal: 25, paddingTop: 20 },
  headerSection: { marginBottom: 20 },
  brandTitle: { color: '#ccd6f6', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locText: { color: '#64FFDA', fontSize: 11, fontWeight: '700', marginLeft: 5 },
  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.1)',
  },
  heroGradient: { padding: 20 },
  heroLabel: { color: '#8892B0', fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 10 },
  heroDescription: { color: '#9fb0ce', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 16 },
  scanButton: {
    backgroundColor: '#64FFDA',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  scanButtonText: { color: '#020c1b', fontSize: 13, fontWeight: '800', marginLeft: 8 },
  sectionTitle: { color: '#ccd6f6', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: {
    width: (width - 65) / 2,
    backgroundColor: 'rgba(17, 34, 64, 0.6)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.05)',
  },
  moduleTitle: { color: '#8892B0', fontSize: 11, fontWeight: '700', marginTop: 8 },
  moduleValue: { color: '#e6f1ff', fontSize: 13, fontWeight: '800', marginTop: 4 },
});
