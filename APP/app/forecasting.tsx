import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function SentinelNexusUltimate() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('LOCAL_SYSTEM');
  const [forecast, setForecast] = useState<any>(null);
  const [aqiData, setAqiData] = useState<any>(null);
  const [activeMetric, setActiveMetric] = useState<'temp' | 'rain' | 'wind'>('temp');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [graphFocus, setGraphFocus] = useState<string | null>(null);

  useEffect(() => {
    initSentinel();
  }, []);

  const initSentinel = async () => {
    setLoading(true);
    await syncToLocalGPS();
    setLoading(false);
  };

  const syncToLocalGPS = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      await fetchWeatherData(loc.coords.latitude, loc.coords.longitude, "CURRENT POSITION");
    } catch (e) {
      console.error("GPS Sync Error:", e);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${text}&count=5&language=en&format=json`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (e) { console.error(e); }
    } else {
      setSearchResults([]);
    }
  };

  const fetchWeatherData = async (lat: number, lon: number, name: string) => {
    try {
      setRefreshing(true);
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,uv_index,visibility,pressure_msl,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
      ]);

      const weatherData = await weatherRes.json();
      const aqiJson = await aqiRes.json();

      setForecast(weatherData);
      setAqiData(aqiJson);
      setLocationName(name.toUpperCase());
      setSearchResults([]);
      setSearchQuery('');
      Keyboard.dismiss();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return "weather-sunny";
    if (code < 4) return "weather-partly-cloudy";
    if (code < 70) return "weather-rainy";
    return "weather-lightning-bolt";
  };

  const getTacticalMessage = (index: number) => {
    if (!forecast) return "ANALYZING...";
    const code = forecast.daily.weather_code[index];
    const max = Math.round(forecast.daily.temperature_2m_max[index]);
    if (code === 0) return `STATUS: CLEAR. Optimal visibility. High of ${max}°C.`;
    if (code < 4) return `STATUS: PARTIAL CLOUD. Variable illumination. Temp ${max}°C.`;
    if (code < 70) return `STATUS: PRECIPITATION DETECTED. Surface friction reduced.`;
    return `STATUS: SEVERE ELECTRICAL ACTIVITY. Atmospheric discharge imminent.`;
  };

  if (loading || !forecast) return (
    <View style={styles.loader}><ActivityIndicator size="large" color="#00F3FF" /></View>
  );

  const hourlyLabels = forecast.hourly.time.slice(0, 12).map((t: string) => t.split('T')[1]);
  const chartData: any = {
    temp: forecast.hourly.temperature_2m.slice(0, 12),
    rain: forecast.hourly.precipitation_probability.slice(0, 12),
    wind: forecast.hourly.wind_speed_10m.slice(0, 12),
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={syncToLocalGPS} tintColor="#00F3FF" />}
      >
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#00F3FF" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="SCAN GLOBAL COORDINATES..."
              placeholderTextColor="rgba(0, 243, 255, 0.3)"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity onPress={syncToLocalGPS}><MaterialCommunityIcons name="target" size={20} color="#00F3FF" /></TouchableOpacity>
          </View>
          {searchResults.length > 0 && (
            <View style={styles.resultsBox}>
              {searchResults.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.resultItem} onPress={() => fetchWeatherData(item.latitude, item.longitude, item.name)}>
                  <Text style={styles.resultText}>{item.name.toUpperCase()}, {item.country_code?.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.hudHeader}>
          <View>
            <Text style={styles.locName}>{locationName}</Text>
            
          </View>
          <Text style={styles.mainTemp}>{Math.round(forecast.current_weather.temperature)}°</Text>
        </View>

        <View style={styles.telemetryGrid}>
          <MetricBox icon="wind" label="GUSTS" value={`${forecast.hourly.wind_gusts_10m[0]} KM/H`} />
          <MetricBox icon="sun" label="UV_INDEX" value={forecast.hourly.uv_index[0]} />
          <MetricBox icon="eye" label="VISIBILITY" value={`${(forecast.hourly.visibility[0] / 1000).toFixed(1)} KM`} />
          <MetricBox icon="shield" label="AQI (US)" value={aqiData?.current.us_aqi || "N/A"} />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>ATMOSPHERIC PROJECTION (12H)</Text>
              {graphFocus && <Text style={styles.graphFocusText}>{graphFocus}</Text>}
            </View>
            <View style={styles.tabs}>
              {['temp', 'rain', 'wind'].map((m) => (
                <TouchableOpacity key={m} onPress={() => { setActiveMetric(m as any); setGraphFocus(null); }} style={[styles.tab, activeMetric === m && styles.activeTab]}>
                  <Text style={styles.tabText}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <LineChart
            data={{ labels: hourlyLabels, datasets: [{ data: chartData[activeMetric] }] }}
            width={width - 50} height={180}
            onDataPointClick={(data) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setGraphFocus(`${hourlyLabels[data.index]} : ${data.value}${activeMetric === 'temp' ? '°C' : activeMetric === 'rain' ? '%' : ' KM/H'}`);
            }}
            chartConfig={{
              backgroundColor: '#000', backgroundGradientFrom: '#000', backgroundGradientTo: '#0a1a2a',
              decimalPlaces: 0, color: (opacity = 1) => `rgba(0, 243, 255, ${opacity})`,
              labelColor: () => 'rgba(0, 243, 255, 0.4)', propsForDots: { r: '4', strokeWidth: '2', stroke: '#000' },
            }}
            bezier style={styles.chart}
          />
        </View>

        <View style={styles.messageBox}>
          <LinearGradient colors={['rgba(0,243,255,0.1)', 'transparent']} style={styles.messageGrad}>
            <View style={styles.messageHeader}>
              <MaterialCommunityIcons name="text-box-search" size={16} color="#00F3FF" />
              <Text style={styles.messageTitle}>MISSION_BRIEF // DAY_{selectedDayIndex + 1}</Text>
            </View>
            <Text style={styles.messageText}>{getTacticalMessage(selectedDayIndex)}</Text>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>7-DAY STRATEGIC FORECAST</Text>
        <View style={styles.forecastList}>
          {forecast.daily.time.map((day: string, index: number) => (
            <TouchableOpacity key={day} onPress={() => { setSelectedDayIndex(index); Haptics.selectionAsync(); }} style={[styles.forecastRow, selectedDayIndex === index && styles.forecastRowActive]}>
              <View style={{ width: 100 }}>
                <Text style={styles.dayText}>{new Date(day).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</Text>
                <Text style={styles.dateText}>{day}</Text>
              </View>
              <MaterialCommunityIcons name={getWeatherIcon(forecast.daily.weather_code[index]) as any} size={20} color="#00F3FF" />
              <View style={styles.tempRange}>
                <Text style={styles.maxTemp}>{Math.round(forecast.daily.temperature_2m_max[index])}°</Text>
                <Text style={styles.minTemp}>{Math.round(forecast.daily.temperature_2m_min[index])}°</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const MetricBox = ({ icon, label, value }: any) => (
  <View style={styles.metricBox}>
    <Feather name={icon} size={14} color="#00F3FF" />
    <View style={{ marginLeft: 10 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingTop: 60, paddingHorizontal: 20 },
  searchSection: { marginBottom: 25, zIndex: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', height: 50, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(0, 243, 255, 0.2)' },
  searchInput: { flex: 1, color: '#00F3FF', fontSize: 12, fontWeight: 'bold' },
  resultsBox: { backgroundColor: '#05101a', borderRadius: 12, marginTop: 5, padding: 10, borderWidth: 1, borderColor: '#00F3FF' },
  resultItem: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,243,255,0.1)' },
  resultText: { color: '#00F3FF', fontSize: 10, fontWeight: '900' },
  hudHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  locName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  subLabel: { color: 'rgba(0, 243, 255, 0.5)', fontSize: 8, fontWeight: 'bold', marginTop: 4 },
  mainTemp: { color: '#00F3FF', fontSize: 52, fontWeight: '100' },
  telemetryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  metricBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0, 243, 255, 0.05)' },
  metricLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 'bold' },
  metricValue: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  chartCard: { backgroundColor: '#050505', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(0, 243, 255, 0.1)' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  chartTitle: { color: 'rgba(0, 243, 255, 0.6)', fontSize: 9, fontWeight: '900' },
  graphFocusText: { color: '#00F3FF', fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  tabs: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 8, padding: 2 },
  tab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  activeTab: { backgroundColor: 'rgba(0, 243, 255, 0.2)' },
  tabText: { color: '#00F3FF', fontSize: 8, fontWeight: 'bold' },
  chart: { marginLeft: -25 },
  messageBox: { borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,243,255,0.03)', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(0,243,255,0.1)' },
  messageGrad: { padding: 20 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  messageTitle: { color: '#00F3FF', fontSize: 10, fontWeight: '900', marginLeft: 10 },
  messageText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: 'rgba(0, 243, 255, 0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  forecastList: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 10 },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 5 },
  forecastRowActive: { backgroundColor: 'rgba(0,243,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,243,255,0.2)' },
  dayText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  dateText: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 'bold' },
  tempRange: { flexDirection: 'row', width: 70, justifyContent: 'flex-end' },
  maxTemp: { color: '#FFF', fontWeight: '900', marginRight: 10 },
  minTemp: { color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' },
});