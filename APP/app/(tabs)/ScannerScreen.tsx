import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

// --- TACTICAL CONSTANTS ---
const ACTION_WEIGHTS = { fire: 25, drainage: 30, solar: 20, training: 15 };
const BASE_PREMIUM = 5000;
const FALLBACK_INCIDENT_IMAGE = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=1200';

type FeedIncident = {
  id: string;
  loc: string;
  event: string;
  severity: 'LOW' | 'MID' | 'HIGH';
  time: string;
  imageUri: string;
};

type EonetEvent = {
  id: string;
  title: string;
  categories?: Array<{ title?: string }>;
  geometry?: Array<{ date?: string; coordinates?: [number, number] }>;
};

const FALLBACK_COMMUNITY_FEED: FeedIncident[] = [
  {
    id: 'fallback-1',
    loc: 'Regional coverage',
    event: 'No live incidents in nearby range',
    severity: 'LOW',
    time: 'just now',
    imageUri: FALLBACK_INCIDENT_IMAGE,
  },
];

const toRad = (deg: number) => (deg * Math.PI) / 180;

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getRelativeTime = (isoDate?: string) => {
  if (!isoDate) return 'recent';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'recent';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getSeverityFromCategory = (category?: string): 'LOW' | 'MID' | 'HIGH' => {
  const label = (category || '').toLowerCase();
  if (label.includes('wildfire') || label.includes('severe storms') || label.includes('volcanoes')) return 'HIGH';
  if (label.includes('flood') || label.includes('drought') || label.includes('landslides')) return 'MID';
  return 'LOW';
};

const buildEventMapImageUrl = (lat: number, lon: number) =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=7&size=640x420&markers=${lat},${lon},red-pushpin`;

const fetchLiveIncidentFeed = async (lat: number, lon: number): Promise<FeedIncident[]> => {
  try {
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=60');
    if (!response.ok) return FALLBACK_COMMUNITY_FEED;

    const data = await response.json();
    const events: EonetEvent[] = data?.events || [];

    const nearby = events
      .map((event) => {
        const latestGeometry = event.geometry?.[event.geometry.length - 1];
        const coords = latestGeometry?.coordinates;
        if (!coords || coords.length < 2) return null;

        const eventLon = coords[0];
        const eventLat = coords[1];
        const distance = getDistanceKm(lat, lon, eventLat, eventLon);

        return {
          id: event.id,
          title: event.title,
          category: event.categories?.[0]?.title || 'Natural event',
          date: latestGeometry?.date,
          distance,
          eventLat,
          eventLon,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.distance <= 1600)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        loc: `${Math.round(item.distance)} km away`,
        event: `${item.title} (${item.category})`,
        severity: getSeverityFromCategory(item.category),
        time: getRelativeTime(item.date),
        imageUri: buildEventMapImageUrl(item.eventLat, item.eventLon),
      }));

    return nearby.length ? nearby : FALLBACK_COMMUNITY_FEED;
  } catch {
    return FALLBACK_COMMUNITY_FEED;
  }
};

export default function RiskShieldBharatFull() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [geoData, setGeoData] = useState<any>({ city: '---', state: '---' });
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [communityFeed, setCommunityFeed] = useState<FeedIncident[]>(FALLBACK_COMMUNITY_FEED);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  
  // Actuarial State
  const [hazardIndex, setHazardIndex] = useState(1.0); 
  const [actions, setActions] = useState({ fire: 1, drainage: 1, solar: 0, training: 1 });
  const [premium, setPremium] = useState(BASE_PREMIUM);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeTerminal();
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
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, []);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      initializeTerminal();
    }, 3 * 60 * 1000);

    return () => clearInterval(refreshTimer);
  }, []);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  const initializeTerminal = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Access Required', 'Real-time location is needed for accurate risk analysis.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await syncTelemetry(loc.coords.latitude, loc.coords.longitude);
    } catch (e) {
      Alert.alert('Connection Error', 'Unable to sync live telemetry right now.');
    } finally {
      setLoading(false);
    }
  };

  const syncTelemetry = async (lat: number, lon: number) => {
    setLocation({ latitude: lat, longitude: lon });
    
    // 1. Reverse Geocode (Pan-India Support)
    const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const state = geo[0]?.region || 'Unknown';
    const city = geo[0]?.city || geo[0]?.district || 'Unknown';
    setGeoData({ city, state });

    // 2. Fetch Live Environmental Data
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation&timezone=auto`);
    const data = await resp.json();
    setLiveMetrics(data.current);

    const liveFeed = await fetchLiveIncidentFeed(lat, lon);
    setCommunityFeed(liveFeed);
    setLastSyncAt(new Date());

    // 3. Actuarial Hazard Calculation (Hi)
    let h_i = 1.0;
    const cycloneStates = ['Odisha', 'Andhra Pradesh', 'West Bengal', 'Tamil Nadu', 'Gujarat'];
    const floodStates = ['Kerala', 'Assam', 'Bihar', 'Maharashtra'];
    
    if (cycloneStates.includes(state)) h_i += 0.4;
    if (floodStates.includes(state)) h_i += 0.3;
    if (data.current.wind_speed_10m > 15) h_i += 0.25;
    if (data.current.precipitation > 1) h_i += 0.35;
    
    setHazardIndex(h_i);

    // 4. Dynamic Pricing Calculation
    const currentActions = (actions.fire * ACTION_WEIGHTS.fire) + (actions.drainage * ACTION_WEIGHTS.drainage) + (actions.solar * ACTION_WEIGHTS.solar) + (actions.training * ACTION_WEIGHTS.training);
    const p_s = Math.min(100, Math.round((currentActions / h_i)));
    const dynamicTotal = Math.round(BASE_PREMIUM * h_i * (1 - (p_s / 200)));
    setPremium(dynamicTotal);
  };

  const handleManualSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const result = await Location.geocodeAsync(searchQuery);
      if (result.length > 0) {
        await syncTelemetry(result[0].latitude, result[0].longitude);
      } else {
        Alert.alert('Location Not Found', 'Please try a nearby city or district.');
      }
    } finally {
      setLoading(false);
    }
  };

  const p_s_score = Math.min(100, Math.round((( (actions.fire * ACTION_WEIGHTS.fire) + (actions.drainage * ACTION_WEIGHTS.drainage) + (actions.solar * ACTION_WEIGHTS.solar) + (actions.training * ACTION_WEIGHTS.training) ) / hazardIndex)));

  if (loading || !location) return (
    <View style={styles.darkContainer}>
      <Animated.View style={[styles.loaderGlyph, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}>
        <Ionicons name="radio-outline" size={36} color="#64FFDA" />
      </Animated.View>
      <Text style={styles.bootText}>Preparing Signal Sweep</Text>
      <Text style={styles.bootSubText}>Calibrating telemetry channels</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={initializeTerminal} tintColor="#00FFCC" />}
    >
      {/* 1. TACTICAL SEARCH BAR */}
      <View style={styles.searchBox}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search location (e.g. Pune, Bandra, Puri)"
          placeholderTextColor="#6B7A99"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleManualSearch}
        />
        <TouchableOpacity style={styles.searchIcon} onPress={handleManualSearch}>
          <Ionicons name="search" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* 2. HEADER: LOCATION & PREMIUM */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Regional node: {geoData.state}</Text>
          <Text style={styles.headerCity}>{geoData.city}</Text>
          <Text style={styles.syncText}>
            Auto refresh: 3 min{lastSyncAt ? ` • Last sync ${lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        </View>
        <View style={styles.premiumBox}>
          <Text style={styles.premiumLabel}>Projected premium</Text>
          <Text style={styles.premiumVal}>₹{premium.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* 3. CORE SCORE GAUGE */}
      <TouchableOpacity style={styles.scoreCard} onPress={() => setDetailsVisible(true)}>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{p_s_score}%</Text>
          <Text style={styles.scoreLabel}>Resilience Score</Text>
        </View>
        <View style={styles.scoreDetails}>
          <Text style={styles.statusLine}>System status: {p_s_score > 75 ? 'Resilient' : 'Vulnerable'}</Text>
          <Text style={styles.indexLine}>Hazard Index (Hi): {hazardIndex.toFixed(2)}</Text>
          <Text style={styles.tapTip}>Tap to view risk model details</Text>
        </View>
      </TouchableOpacity>

      {/* 4. LIVE TELEMETRY GRID */}
      <View style={styles.grid}>
        <MetricCell label="Wind" val={liveMetrics.wind_speed_10m} unit="km/h" />
        <MetricCell label="Rain" val={liveMetrics.precipitation} unit="mm" />
        <MetricCell label="Humidity" val={liveMetrics.relative_humidity_2m} unit="%" />
        <MetricCell label="Temp" val={liveMetrics.temperature_2m} unit="°C" />
      </View>

      {/* 5. NEIGHBORHOOD FEED */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeader}>Neighborhood risk feed</Text>
      </View>
      {communityFeed.map((item) => (
        <View key={item.id} style={styles.feedItem}>
          <FeedIncidentImage
            uri={item.imageUri}
            fallbackUri={FALLBACK_INCIDENT_IMAGE}
            fromApi={item.imageUri !== FALLBACK_INCIDENT_IMAGE}
          />
          <View style={{flex: 1}}>
            <Text style={styles.feedLoc}>{item.loc} • {item.time}</Text>
            <Text style={styles.feedEvent}>{item.event}</Text>
          </View>
          <View style={[styles.severityTag, {borderColor: item.severity === 'HIGH' ? '#FF3B30' : '#00FFCC'}]}>
            <Text style={[styles.severityText, {color: item.severity === 'HIGH' ? '#FF3B30' : '#00FFCC'}]}>{item.severity}</Text>
          </View>
        </View>
      ))}

      {/* 6. HYBRID MAP RADAR */}
      <View style={styles.mapContainer}>
        <MapView 
          provider={PROVIDER_GOOGLE} 
          style={styles.map} 
          mapType="hybrid"
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          <Circle center={location} radius={1500} fillColor="rgba(0, 255, 204, 0.1)" strokeColor="#00FFCC" strokeWidth={1} />
          <Marker coordinate={location}>
             <Ionicons name="radio-outline" size={30} color="#00FFCC" />
          </Marker>
        </MapView>
      </View>

      {/* 7. ACTUARIAL MODAL */}
      <Modal visible={detailsVisible} animationType="fade" transparent>
        <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Risk Model Details</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#64FFDA" />
              </TouchableOpacity>
            </View>

            <View style={styles.formulaPanel}>
              <Text style={styles.formulaText}>Ps = (Σ(Ai * Wi) / Hi) × 100</Text>
            </View>

            <AuditItem label="Fire Suppression" weight={25} active={actions.fire} />
            <AuditItem label="Flood Drainage" weight={30} active={actions.drainage} />
            <AuditItem label="Solar Resilience" weight={20} active={actions.solar} />
            <AuditItem label="Safety Training" weight={15} active={actions.training} />

            <TouchableOpacity style={styles.improveBtn} onPress={() => Alert.alert('Upgrade Estimate', 'Installing solar adds +20 to the resilience action score.')}>
              <Text style={styles.improveText}>Review upgrade options</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      <View style={{height: 60}} />
    </ScrollView>
  );
}

// --- TACTICAL UI COMPONENTS ---
const MetricCell = ({ label, val, unit }: any) => (
  <View style={styles.cell}>
    <Text style={styles.cellLabel}>{label}</Text>
    <Text style={styles.cellVal}>{val}<Text style={styles.cellUnit}>{unit}</Text></Text>
  </View>
);

const AuditItem = ({ label, weight, active }: any) => (
  <View style={styles.auditRow}>
    <View>
      <Text style={styles.auditLabel}>{label}</Text>
      <Text style={styles.auditWeight}>Weight (Wi): {weight}</Text>
    </View>
    <Ionicons name={active ? 'shield-checkmark-outline' : 'alert-circle-outline'} size={22} color={active ? '#64FFDA' : '#4b5875'} />
  </View>
);

function FeedIncidentImage({ uri, fallbackUri, fromApi }: { uri?: string; fallbackUri: string; fromApi: boolean }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={styles.feedImageWrap}>
      <Image
        source={{ uri: failed ? fallbackUri : uri || fallbackUri }}
        style={styles.feedImage}
        onError={() => setFailed(true)}
      />
      {fromApi && !failed ? <Text style={styles.feedImageApiText}>Live API</Text> : null}
      {failed ? <Text style={styles.feedImageFallbackText}>Image restored</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020c1b', paddingHorizontal: 20 },
  darkContainer: { flex: 1, backgroundColor: '#020c1b', justifyContent: 'center', alignItems: 'center' },
  loaderGlyph: { marginBottom: 6 },
  bootText: { color: '#e6f1ff', marginTop: 20, fontSize: 17, fontWeight: '800' },
  bootSubText: { color: '#8892B0', marginTop: 6, fontSize: 12 },
  
  // Search
  searchBox: {
    marginTop: 56,
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 34, 64, 0.75)',
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.1)',
  },
  searchInput: { flex: 1, height: 48, color: '#fff', fontSize: 13 },
  searchIcon: { backgroundColor: '#64FFDA', padding: 9, borderRadius: 8 },

  // Header
  header: { marginTop: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { color: '#8892B0', fontSize: 10, fontWeight: '600' },
  headerCity: { color: '#fff', fontSize: 24, fontWeight: '800' },
  syncText: { color: '#7f95ba', fontSize: 10, marginTop: 4 },
  premiumBox: { alignItems: 'flex-end' },
  premiumLabel: { color: '#64FFDA', fontSize: 10, fontWeight: '700' },
  premiumVal: { color: '#fff', fontSize: 24, fontWeight: '800' },

  // Score
  scoreCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.72)',
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.1)',
    borderRadius: 14,
  },
  scoreBadge: {
    minWidth: 104,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#64FFDA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(100,255,218,0.04)',
  },
  scoreText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  scoreLabel: { color: '#64FFDA', fontSize: 9, fontWeight: '700' },
  scoreDetails: { marginLeft: 20, flex: 1 },
  statusLine: { color: '#64FFDA', fontSize: 12, fontWeight: '700' },
  indexLine: { color: '#9fb0ce', fontSize: 12, marginTop: 5 },
  tapTip: { color: '#8892B0', fontSize: 10, marginTop: 8, fontStyle: 'italic' },

  // Telemetry
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cell: {
    width: '23%',
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.08)',
  },
  cellLabel: { color: '#8892B0', fontSize: 9, fontWeight: '700' },
  cellVal: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cellUnit: { fontSize: 9, color: '#8892B0' },

  // Feed
  sectionHeaderContainer: {
    marginTop: 30,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100,255,218,0.1)',
    paddingBottom: 8,
  },
  sectionHeader: { color: '#ccd6f6', fontSize: 12, fontWeight: '700' },
  feedItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    padding: 15,
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.06)',
  },
  feedImageWrap: {
    width: 78,
    height: 58,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.12)',
    marginRight: 12,
    justifyContent: 'flex-end',
  },
  feedImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  feedImageFallbackText: {
    color: '#d7e0f3',
    fontSize: 8,
    fontWeight: '700',
    backgroundColor: 'rgba(2, 12, 27, 0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    margin: 4,
    borderRadius: 4,
  },
  feedImageApiText: {
    color: '#64FFDA',
    fontSize: 8,
    fontWeight: '700',
    backgroundColor: 'rgba(2, 12, 27, 0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    margin: 4,
    borderRadius: 4,
  },
  feedLoc: { color: '#8892B0', fontSize: 10 },
  feedEvent: { color: '#e6f1ff', fontSize: 14, marginTop: 3, fontWeight: '600' },
  severityTag: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  severityText: { fontSize: 9, fontWeight: 'bold' },

  // Map
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 25,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.1)',
  },
  map: { ...StyleSheet.absoluteFillObject },

  // Modal
  modalBlur: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#071325',
    padding: 25,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.12)',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  formulaPanel: {
    backgroundColor: 'rgba(17, 34, 64, 0.9)',
    padding: 20,
    borderRadius: 10,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.1)',
  },
  formulaText: { color: '#64FFDA', fontSize: 16, fontWeight: '700' },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100,255,218,0.08)',
  },
  auditLabel: { color: '#ccd6f6', fontSize: 13 },
  auditWeight: { color: '#8892B0', fontSize: 10, marginTop: 2 },
  improveBtn: {
    backgroundColor: '#64FFDA',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },
  improveText: { color: '#020c1b', fontWeight: '800', fontSize: 12 }
});