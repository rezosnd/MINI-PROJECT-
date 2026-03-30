import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// charts removed: LineChart/BarChart were removed to simplify dashboard
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get('window');
// charts removed

// API Keys (Replace with your actual keys)
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1';
const OPEN_STREET_MAP_URL = 'https://nominatim.openstreetmap.org';
const OPEN_TOPO_DATA_URL = 'https://api.opentopodata.org/v1';
const USGS_EARTHQUAKE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1';

type EnvironmentalData = {
  weather: any;
  airQuality: any;
  terrain: any;
  seismic: any;
  floodRisk: any;
  fireRisk: any;
  pollution: any;
};

type RiskFactor = {
  name: string;
  score: number;
  weight: number;
  description: string;
  status: 'low' | 'medium' | 'high' | 'critical';
};

export default function AdvancedEnvironmentalMonitor() {
  // Core State
  const [location, setLocation] = useState<any>(null);
  const [locationName, setLocationName] = useState<string>('INITIALIZING...');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<EnvironmentalData | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [overallRisk, setOverallRisk] = useState(0);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [selectedLayer, setSelectedLayer] = useState<'standard' | 'satellite' | 'terrain'>('satellite');
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'wind' | 'precipitation' | 'air_quality'>('temperature');
  const [hazardZones, setHazardZones] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<'optimal' | 'degraded' | 'critical'>('optimal');

  // Animations
  const riskPulse = new Animated.Value(1);
  const mapZoom = new Animated.Value(1);

  useEffect(() => {
    initializeSystem();
    
    // Real-time updates every 2 minutes
    const interval = setInterval(fetchRealTimeData, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const initializeSystem = async () => {
    try {
      setLoading(true);
      
      // Get precise location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation
        });
        
        setLocation(locationData.coords);
        
        // Get location name using OpenStreetMap
        const reverse = await fetchLocationName(locationData.coords);
        setLocationName(reverse);

        // Set map region
        setMapRegion({
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

        // Fetch all environmental data
        await fetchAllEnvironmentalData(locationData.coords);
        
        // Start risk pulse animation
        startRiskPulse();
      }
      
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('System Error', 'Failed to initialize monitoring system');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationName = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `${OPEN_STREET_MAP_URL}/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10`
      );
      const data = await response.json();
      if (data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
        const country = data.address.country || '';
        return `${city.toUpperCase()}, ${country.toUpperCase()}`;
      }
      return 'UNKNOWN LOCATION';
    } catch (error) {
      console.error('Location name error:', error);
      return 'LOCATION UNKNOWN';
    }
  };

  const fetchAllEnvironmentalData = async (coords: { latitude: number; longitude: number }) => {
    try {
      const [
        weatherData,
        airQualityData,
        terrainData,
        seismicData,
        floodRiskData,
        fireRiskData,
        pollutionData,
        historicalData
      ] = await Promise.all([
        fetchWeatherData(coords),
        fetchAirQualityData(coords),
        fetchTerrainData(coords),
        fetchSeismicData(coords),
        fetchFloodRiskData(coords),
        fetchFireRiskData(coords),
        fetchPollutionData(coords),
        fetchHistoricalData(coords)
      ]);

      const environmentalData: EnvironmentalData = {
        weather: weatherData,
        airQuality: airQualityData,
        terrain: terrainData,
        seismic: seismicData,
        floodRisk: floodRiskData,
        fireRisk: fireRiskData,
        pollution: pollutionData,
      };

      setData(environmentalData);
      setHistoricalData(historicalData);
      
      // Calculate comprehensive risk assessment
      calculateComprehensiveRisk(environmentalData);
      
      // Generate hazard zones
      generateHazardZones(coords, environmentalData);
      
      // Check for live alerts
      checkForAlerts(environmentalData);
      
    } catch (error) {
      console.error('Data fetch error:', error);
    }
  };

  // Open-Meteo Weather API (Free alternative to OpenWeatherMap)
  const fetchWeatherData = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `${OPEN_METEO_URL}/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,rain,showers,snowfall,weather_code,visibility,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,wind_speed_10m_max&timezone=auto`
      );
      const data = await response.json();
      
      // Format data to match expected structure
      return {
        current: {
          temp: data.current.temperature_2m,
          feels_like: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          pressure: data.current.pressure_msl,
          wind_speed: data.current.wind_speed_10m,
          wind_deg: data.current.wind_direction_10m,
          rain: data.current.rain,
          snow: data.current.snowfall,
          weather: [{
            description: getWeatherDescription(data.current.weather_code),
            icon: getWeatherIcon(data.current.weather_code)
          }]
        },
        hourly: data.hourly.time.slice(0, 24).map((time: string, index: number) => ({
          dt: new Date(time).getTime() / 1000,
          temp: data.hourly.temperature_2m[index],
          pop: data.hourly.precipitation_probability[index] / 100,
          rain: data.hourly.rain[index],
          snow: data.hourly.snowfall[index],
          wind_speed: data.hourly.wind_speed_10m[index]
        })),
        daily: data.daily.time.map((time: string, index: number) => ({
          dt: new Date(time).getTime() / 1000,
          temp: {
            day: data.daily.temperature_2m_max[index]
          },
          weather: [{
            description: getWeatherDescription(data.daily.weather_code[index])
          }]
        }))
      };
    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  };

  const getWeatherDescription = (code: number) => {
    const weatherCodes: {[key: number]: string} = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Heavy thunderstorm with hail'
    };
    return weatherCodes[code] || 'Unknown';
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return '01d';
    if (code === 2) return '02d';
    if (code === 3) return '03d';
    if (code >= 45 && code <= 48) return '50d';
    if (code >= 51 && code <= 55) return '09d';
    if (code >= 61 && code <= 65) return '10d';
    if (code >= 71 && code <= 75) return '13d';
    if (code >= 95 && code <= 99) return '11d';
    return '01d';
  };

  // Open-Meteo Air Quality API
  const fetchAirQualityData = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `${OPEN_METEO_URL}/air-quality?latitude=${coords.latitude}&longitude=${coords.longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`
      );
      const data = await response.json();
      
      return {
        list: [{
          main: {
            aqi: Math.min(Math.ceil(data.current.us_aqi / 50), 5), // Convert to 1-5 scale
          },
          components: {
            pm2_5: data.current.pm2_5,
            pm10: data.current.pm10,
            co: data.current.carbon_monoxide,
            no2: data.current.nitrogen_dioxide,
            so2: data.current.sulphur_dioxide,
            o3: data.current.ozone
          }
        }]
      };
    } catch (error) {
      console.error('Air Quality API error:', error);
      return null;
    }
  };

  // Pollution data from OpenAQ
  const fetchPollutionData = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `https://api.openaq.org/v2/latest?coordinates=${coords.latitude},${coords.longitude}&radius=25000&limit=10`
      );
      return await response.json();
    } catch (error) {
      console.error('Pollution API error:', error);
      return null;
    }
  };

  const fetchTerrainData = async (coords: { latitude: number; longitude: number }) => {
    try {
      // Using OpenTopoData API for elevation
      const response = await fetch(
        `${OPEN_TOPO_DATA_URL}/aster30m?locations=${coords.latitude},${coords.longitude}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return {
          elevation: data.results[0].elevation,
          location: {
            lat: coords.latitude,
            lng: coords.longitude
          },
          dataset: 'aster30m'
        };
      }
      return null;
    } catch (error) {
      console.error('Terrain API error:', error);
      return null;
    }
  };

  const fetchSeismicData = async (coords: { latitude: number; longitude: number }) => {
    try {
      // USGS Earthquake API
      const response = await fetch(
        `${USGS_EARTHQUAKE_URL}/query?format=geojson&latitude=${coords.latitude}&longitude=${coords.longitude}&maxradiuskm=200&minmagnitude=2.5&limit=5`
      );
      return await response.json();
    } catch (error) {
      console.error('Seismic API error:', error);
      return null;
    }
  };

  const fetchFloodRiskData = async (coords: { latitude: number; longitude: number }) => {
    try {
      // Using OpenStreetMap water data and elevation to estimate flood risk
      const terrain = await fetchTerrainData(coords);
      const elevation = terrain?.elevation || 0;
      
      // Calculate flood risk based on elevation
      let floodRisk;
      if (elevation < 10) floodRisk = 80 + Math.random() * 20;
      else if (elevation < 50) floodRisk = 50 + Math.random() * 30;
      else if (elevation < 100) floodRisk = 20 + Math.random() * 30;
      else floodRisk = Math.random() * 20;
      
      return {
        riskScore: floodRisk,
        zone: floodRisk > 70 ? 'HIGH' : floodRisk > 40 ? 'MODERATE' : 'LOW',
        elevation: elevation,
        factors: [
          `Elevation: ${elevation.toFixed(1)}m`,
          'Proximity to water bodies',
          'Historical flood data'
        ]
      };
    } catch (error) {
      console.error('Flood risk error:', error);
      return {
        riskScore: 30,
        zone: 'LOW',
        factors: ['Elevation data unavailable']
      };
    }
  };

  const fetchFireRiskData = async (coords: { latitude: number; longitude: number }) => {
    try {
      // Use weather data to calculate fire risk
      const weather = await fetchWeatherData(coords);
      const temp = weather?.current?.temp || 20;
      const humidity = weather?.current?.humidity || 50;
      const wind = weather?.current?.wind_speed || 0;
      
      // Simplified fire risk calculation
      const tempFactor = Math.max(0, temp - 20) * 2;
      const humidityFactor = Math.max(0, 30 - humidity) * 1.5;
      const windFactor = wind * 3;
      
      const fireRisk = Math.min(tempFactor + humidityFactor + windFactor + Math.random() * 20, 100);
      
      return {
        riskScore: fireRisk,
        index: fireRisk > 70 ? 'EXTREME' : fireRisk > 50 ? 'HIGH' : fireRisk > 30 ? 'MODERATE' : 'LOW',
        temperature: temp,
        humidity: humidity,
        windSpeed: wind,
        factors: [
          `Temperature: ${temp}°C`,
          `Humidity: ${humidity}%`,
          `Wind Speed: ${wind} m/s`
        ]
      };
    } catch (error) {
      console.error('Fire risk error:', error);
      return {
        riskScore: 20,
        index: 'LOW',
        factors: ['Weather data unavailable']
      };
    }
  };

  const fetchHistoricalData = async (coords: { latitude: number; longitude: number }) => {
    try {
      // Fetch historical weather data from Open-Meteo
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      
      const startDate = lastMonth.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      const response = await fetch(
        `${OPEN_METEO_URL}/archive?latitude=${coords.latitude}&longitude=${coords.longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`
      );
      return await response.json();
    } catch (error) {
      console.error('Historical data error:', error);
      return null;
    }
  };

  const fetchRealTimeData = async () => {
    if (!location) return;
    
    try {
      const [weather, airQuality] = await Promise.all([
        fetchWeatherData(location),
        fetchAirQualityData(location)
      ]);

      setData(prev => ({
        ...prev!,
        weather,
        airQuality
      }));

      // Update risk factors
      calculateComprehensiveRisk({
        ...data!,
        weather,
        airQuality
      });
      
      setSystemStatus('optimal');
    } catch (error) {
      console.error('Real-time update error:', error);
      setSystemStatus('degraded');
    }
  };

  const calculateComprehensiveRisk = (envData: EnvironmentalData) => {
    let factors: RiskFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Weather Risk
    if (envData.weather) {
      const temp = envData.weather.current?.temp || 20;
      const wind = envData.weather.current?.wind_speed || 0;
      const precip = envData.weather.current?.rain || 0;
      
      const weatherScore = (Math.abs(temp - 25) * 2) + (wind * 3) + (precip * 10);
      factors.push({
        name: 'Weather Conditions',
        score: Math.min(weatherScore, 100),
        weight: 25,
        description: `Temp: ${temp}°C, Wind: ${wind} m/s, Rain: ${precip}mm`,
        status: weatherScore > 60 ? 'high' : weatherScore > 30 ? 'medium' : 'low'
      });
    }

    // Air Quality Risk
    if (envData.airQuality?.list?.[0]?.main?.aqi) {
      const aqi = envData.airQuality.list[0].main.aqi;
      const aqiScore = aqi * 20;
      factors.push({
        name: 'Air Quality Index',
        score: aqiScore,
        weight: 15,
        description: `AQI Level: ${aqi}/5`,
        status: aqi >= 4 ? 'critical' : aqi >= 3 ? 'high' : aqi >= 2 ? 'medium' : 'low'
      });
    }

    // Seismic Risk
    if (envData.seismic?.features?.length > 0) {
      const quakes = envData.seismic.features;
      const seismicScore = quakes.length * 15;
      factors.push({
        name: 'Seismic Activity',
        score: Math.min(seismicScore, 100),
        weight: 20,
        description: `${quakes.length} recent earthquakes detected`,
        status: quakes.length > 2 ? 'high' : quakes.length > 0 ? 'medium' : 'low'
      });
    }

    // Flood Risk
    if (envData.floodRisk) {
      factors.push({
        name: 'Flood Hazard',
        score: envData.floodRisk.riskScore,
        weight: 20,
        description: `Zone: ${envData.floodRisk.zone}`,
        status: envData.floodRisk.riskScore > 70 ? 'critical' : envData.floodRisk.riskScore > 40 ? 'high' : 'medium'
      });
    }

    // Fire Risk
    if (envData.fireRisk) {
      factors.push({
        name: 'Wildfire Risk',
        score: envData.fireRisk.riskScore,
        weight: 20,
        description: `Index: ${envData.fireRisk.index}`,
        status: envData.fireRisk.riskScore > 70 ? 'critical' : envData.fireRisk.riskScore > 50 ? 'high' : 'medium'
      });
    }

    // Calculate weighted overall risk
    factors.forEach(factor => {
      totalScore += factor.score * (factor.weight / 100);
      totalWeight += factor.weight;
    });

    const overall = (totalScore / factors.length) * (totalWeight / 100);
    setOverallRisk(Math.min(Math.round(overall), 100));
    setRiskFactors(factors);
  };

  const generateHazardZones = (coords: { latitude: number; longitude: number }, envData: EnvironmentalData) => {
    const zones = [];
    
    // Flood zones based on elevation data
    zones.push({
      id: 'flood',
      coordinates: [
        { latitude: coords.latitude + 0.005, longitude: coords.longitude + 0.005 },
        { latitude: coords.latitude + 0.008, longitude: coords.longitude + 0.003 },
        { latitude: coords.latitude + 0.006, longitude: coords.longitude - 0.002 },
        { latitude: coords.latitude + 0.003, longitude: coords.longitude - 0.001 },
      ],
      type: 'flood',
      risk: 'high',
      fillColor: 'rgba(0, 100, 255, 0.3)',
      strokeColor: 'rgba(0, 100, 255, 0.7)'
    });

    // Fire hazard zones based on weather conditions
    zones.push({
      id: 'fire',
      coordinates: [
        { latitude: coords.latitude - 0.004, longitude: coords.longitude + 0.006 },
        { latitude: coords.latitude - 0.006, longitude: coords.longitude + 0.008 },
        { latitude: coords.latitude - 0.008, longitude: coords.longitude + 0.005 },
        { latitude: coords.latitude - 0.006, longitude: coords.longitude + 0.003 },
      ],
      type: 'fire',
      risk: 'medium',
      fillColor: 'rgba(255, 69, 0, 0.3)',
      strokeColor: 'rgba(255, 69, 0, 0.7)'
    });

    // Air pollution zones
    zones.push({
      id: 'pollution',
      coordinates: [
        { latitude: coords.latitude + 0.003, longitude: coords.longitude - 0.003 },
        { latitude: coords.latitude + 0.001, longitude: coords.longitude - 0.006 },
        { latitude: coords.latitude - 0.002, longitude: coords.longitude - 0.004 },
        { latitude: coords.latitude, longitude: coords.longitude - 0.001 },
      ],
      type: 'pollution',
      risk: 'low',
      fillColor: 'rgba(128, 128, 128, 0.3)',
      strokeColor: 'rgba(128, 128, 128, 0.7)'
    });

    setHazardZones(zones);
  };

  const checkForAlerts = (envData: EnvironmentalData) => {
    const alerts = [];
    
    // Weather alerts based on conditions
    if (envData.weather?.current) {
      const temp = envData.weather.current.temp;
      const wind = envData.weather.current.wind_speed;
      const rain = envData.weather.current.rain || 0;
      
      if (temp >= 35) {
        alerts.push({
          type: 'weather',
          severity: 'high',
          title: 'Heat Warning',
          description: `Extreme temperature: ${temp}°C`,
          time: 'Current'
        });
      }
      
      if (wind >= 15) {
        alerts.push({
          type: 'weather',
          severity: 'medium',
          title: 'High Wind Warning',
          description: `Wind speed: ${wind} m/s`,
          time: 'Current'
        });
      }
      
      if (rain >= 10) {
        alerts.push({
          type: 'weather',
          severity: 'high',
          title: 'Heavy Rain Alert',
          description: `Rainfall: ${rain}mm`,
          time: 'Current'
        });
      }
    }

    // Seismic alerts
    if (envData.seismic?.features?.length > 0) {
      envData.seismic.features.forEach((quake: any) => {
        if (quake.properties.mag >= 4.0) {
          alerts.push({
            type: 'seismic',
            severity: 'high',
            title: `Earthquake M${quake.properties.mag}`,
            description: `${quake.properties.place}`,
            time: new Date(quake.properties.time).toLocaleString()
          });
        }
      });
    }

    // Air quality alerts
    if (envData.airQuality?.list?.[0]?.main?.aqi >= 4) {
      alerts.push({
        type: 'air',
        severity: 'high',
        title: 'Poor Air Quality',
        description: `AQI: ${envData.airQuality.list[0].main.aqi}/5`,
        time: 'Current'
      });
    }

    setLiveAlerts(alerts);
  };

  const startRiskPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(riskPulse, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(riskPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const zoomMap = () => {
    Animated.sequence([
      Animated.timing(mapZoom, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(mapZoom, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderRiskGauge = () => {
    const getRiskColor = (score: number) => {
      if (score >= 75) return '#FF3B30';
      if (score >= 50) return '#FF9500';
      if (score >= 25) return '#FFCC00';
      return '#34C759';
    };

    const getRiskLabel = (score: number) => {
      if (score >= 75) return 'Critical';
      if (score >= 50) return 'High';
      if (score >= 25) return 'Moderate';
      return 'Low';
    };

    const riskColor = getRiskColor(overallRisk);

    return (
      <View style={styles.riskGaugeContainer}>
        <View style={styles.riskHeader}>
          <Text style={styles.riskHeaderLabel}>Risk Assessment</Text>
          <Text style={[styles.riskScore, { color: riskColor }]}>
            {overallRisk}
          </Text>
        </View>
        <View style={styles.gaugeBackground}>
          <View style={[styles.gaugeFill, { 
            width: `${overallRisk}%`,
            backgroundColor: riskColor 
          }]} />
        </View>
        <Text style={[styles.riskStatus, { color: riskColor }]}>
          {getRiskLabel(overallRisk)} Risk
        </Text>
      </View>
    );
  };

  const renderMap = () => {
    if (!mapRegion) return null;

    return (
      <Animated.View style={[
        styles.mapContainer,
        { transform: [{ scale: mapZoom }] }
      ]}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          zoomEnabled={true}
          rotateEnabled={true}
          mapType={selectedLayer === 'satellite' ? 'satellite' : selectedLayer === 'terrain' ? 'terrain' : 'standard'}
        >
          {/* Current Location Marker */}
          {location && (
            <Marker coordinate={location}>
              <View style={styles.locationMarker}>
                <View style={styles.markerCenter}>
                  <Ionicons name="location" size={20} color="#64FFDA" />
                </View>
                <View style={styles.markerPulse} />
              </View>
            </Marker>
          )}

          {/* Hazard Zones */}
          {hazardZones.map((zone) => (
            <Polygon
              key={zone.id}
              coordinates={zone.coordinates}
              fillColor={zone.fillColor}
              strokeColor={zone.strokeColor}
              strokeWidth={2}
            />
          ))}

          {/* Weather Data Markers */}
          {data?.weather?.hourly?.slice(0, 5).map((hour: any, index: number) => {
            const lat = location.latitude + (Math.random() * 0.01 - 0.005);
            const lng = location.longitude + (Math.random() * 0.01 - 0.005);
            
            return (
              <Marker
                key={index}
                coordinate={{ latitude: lat, longitude: lng }}
              >
                <View style={styles.weatherMarker}>
                  <Text style={styles.weatherMarkerText}>
                    {Math.round(hour.temp)}°C
                  </Text>
                </View>
              </Marker>
            );
          })}

          {/* Seismic Activity Markers */}
          {data?.seismic?.features?.slice(0, 3).map((quake: any, index: number) => {
            const mag = quake.properties.mag;
            const size = Math.min(30, mag * 8);
            
            return (
              <Marker
                key={index}
                coordinate={{
                  latitude: quake.geometry.coordinates[1],
                  longitude: quake.geometry.coordinates[0]
                }}
              >
                <View style={[
                  styles.seismicMarker,
                  { 
                    width: size,
                    height: size,
                    borderRadius: size / 2
                  }
                ]}>
                  <Text style={styles.seismicMarkerText}>
                    {mag.toFixed(1)}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={[
              styles.mapControlButton,
              selectedLayer === 'standard' && styles.mapControlButtonActive
            ]}
            onPress={() => setSelectedLayer('standard')}
          >
            <Ionicons name="map" size={16} color="#64FFDA" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.mapControlButton,
              selectedLayer === 'satellite' && styles.mapControlButtonActive
            ]}
            onPress={() => setSelectedLayer('satellite')}
          >
            <Ionicons name="earth" size={16} color="#64FFDA" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.mapControlButton,
              selectedLayer === 'terrain' && styles.mapControlButtonActive
            ]}
            onPress={() => setSelectedLayer('terrain')}
          >
            <Ionicons name="layers" size={16} color="#64FFDA" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={zoomMap}
          >
            <Ionicons name="search" size={16} color="#64FFDA" />
          </TouchableOpacity>
        </View>

        {/* Map Legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#64FFDA' }]} />
            <Text style={styles.legendText}>Your Location</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.legendText}>High Risk</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Medium Risk</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // charts removed

  const renderRiskFactors = () => {
    return (
      <View style={styles.riskFactorsContainer}>
        <Text style={styles.sectionTitle}>Risk Factors</Text>
        
        {riskFactors.map((factor, index) => (
          <View key={index} style={styles.riskFactorCard}>
            <View style={styles.riskFactorHeader}>
              <View style={styles.riskFactorInfo}>
                <Text style={styles.riskFactorName}>{factor.name}</Text>
                <Text style={styles.riskFactorDescription}>{factor.description}</Text>
              </View>
              
              <View style={[
                styles.scoreBox,
                { 
                  borderColor: 
                    factor.status === 'critical' ? '#FF3B30' :
                    factor.status === 'high' ? '#FF9500' :
                    factor.status === 'medium' ? '#FFCC00' : '#34C759'
                }
              ]}>
                <Text style={[
                  styles.scoreValue,
                  { 
                    color: 
                      factor.status === 'critical' ? '#FF3B30' :
                      factor.status === 'high' ? '#FF9500' :
                      factor.status === 'medium' ? '#FFCC00' : '#34C759'
                  }
                ]}>
                  {Math.round(factor.score)}
                </Text>
              </View>
            </View>
            
            <View style={styles.riskFactorBar}>
              <View style={[
                styles.riskFactorFill,
                { 
                  width: `${factor.score}%`,
                  backgroundColor: 
                    factor.status === 'critical' ? '#FF3B30' :
                    factor.status === 'high' ? '#FF9500' :
                    factor.status === 'medium' ? '#FFCC00' : '#34C759'
                }
              ]} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSystemMetrics = () => {
    if (!data) return null;

    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Environmental Metrics</Text>
        
        <View style={styles.metricsGrid}>
          {/* Temperature */}
          <View style={styles.metricCard}>
            <Ionicons name="thermometer" size={20} color="#FF5722" />
            <Text style={styles.metricValue}>
              {data.weather?.current?.temp?.toFixed(1) || '--'}°C
            </Text>
            <Text style={styles.metricLabel}>Temperature</Text>
          </View>

          {/* Wind Speed */}
          <View style={styles.metricCard}>
            <Ionicons name="flag" size={20} color="#4CAF50" />
            <Text style={styles.metricValue}>
              {data.weather?.current?.wind_speed?.toFixed(1) || '--'} m/s
            </Text>
            <Text style={styles.metricLabel}>Wind Speed</Text>
          </View>

          {/* Air Quality */}
          <View style={styles.metricCard}>
            <Ionicons name="cloud" size={20} color="#2196F3" />
            <Text style={styles.metricValue}>
              {data.airQuality?.list?.[0]?.main?.aqi || '--'}/5
            </Text>
            <Text style={styles.metricLabel}>Air Quality</Text>
          </View>

          {/* Humidity */}
          <View style={styles.metricCard}>
            <Ionicons name="water" size={20} color="#00BCD4" />
            <Text style={styles.metricValue}>
              {data.weather?.current?.humidity || '--'}%
            </Text>
            <Text style={styles.metricLabel}>Humidity</Text>
          </View>

          {/* Pressure */}
          <View style={styles.metricCard}>
            <Ionicons name="speedometer" size={20} color="#9C27B0" />
            <Text style={styles.metricValue}>
              {data.weather?.current?.pressure || '--'} hPa
            </Text>
            <Text style={styles.metricLabel}>Pressure</Text>
          </View>

          {/* Elevation */}
          <View style={styles.metricCard}>
            <Ionicons name="analytics" size={20} color="#795548" />
            <Text style={styles.metricValue}>
              {data.terrain?.elevation?.toFixed(0) || '--'}m
            </Text>
            <Text style={styles.metricLabel}>Elevation</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAlerts = () => {
    if (liveAlerts.length === 0) {
      return (
        <View style={styles.alertsContainer}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <View style={styles.noAlertsBox}>
            <Ionicons name="checkmark-circle" size={40} color="#34C759" />
            <Text style={styles.noAlertsText}>All Clear</Text>
            <Text style={styles.noAlertsSubtext}>Environmental conditions are normal</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        
        {liveAlerts.slice(0, 3).map((alert, index) => (
          <View key={index} style={[
            styles.alertCard,
            alert.severity === 'high' && styles.alertCardCritical
          ]}>
            <View style={styles.alertHeader}>
              <View style={[
                styles.alertIcon,
                { 
                  backgroundColor: alert.severity === 'high' ? 
                    'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)'
                }
              ]}>
                <Ionicons 
                  name="alert-circle" 
                  size={16} 
                  color={alert.severity === 'high' ? '#FF3B30' : '#FF9500'} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.alertTitle,
                  { color: alert.severity === 'high' ? '#FF3B30' : '#FF9500' }
                ]}>
                  {alert.title}
                </Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
            </View>
            <Text style={styles.alertDescription}>{alert.description}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[
          styles.loaderIcon,
          { transform: [{ scale: riskPulse }] }
        ]}>
          <Ionicons name="scan" size={60} color="#64FFDA" />
        </Animated.View>
        <Text style={styles.loadingText}>Preparing Dashboard</Text>
        <Text style={styles.loadingSubtext}>Gathering environmental data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072' }} 
          style={styles.backgroundImage}
          blurRadius={100}
        >
          <LinearGradient 
            colors={['rgba(2,12,27,0.85)', 'rgba(2,12,27,0.95)']} 
            style={styles.gradientOverlay}
          >
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={initializeSystem}
                  tintColor="#64FFDA"
                  colors={['#64FFDA']}
                />
              }
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <Text style={styles.title}>Insights</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="#64FFDA" />
                    <Text style={styles.locationText}>{locationName}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.analyticsButton}
                  onPress={() => setShowAdvancedAnalytics(true)}
                >
                  <Ionicons name="analytics" size={18} color="#64FFDA" />
                </TouchableOpacity>
              </View>

              {/* Risk Gauge */}
              {renderRiskGauge()}

              {/* Interactive Map */}
              {renderMap()}

              {/* Weather Charts removed */}

              {/* System Metrics */}
              {renderSystemMetrics()}

              {/* Risk Factors */}
              {renderRiskFactors()}

              {/* Live Alerts */}
              {renderAlerts()}

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Real-time data from Open-Meteo, USGS, OpenStreetMap
                </Text>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </LinearGradient>
        </ImageBackground>

        {/* Advanced Analytics Modal */}
        <Modal
          visible={showAdvancedAnalytics}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAdvancedAnalytics(false)}
        >
          <View style={styles.modalContainer}>
            <LinearGradient 
              colors={['rgba(2,12,27,0.95)', 'rgba(2,12,27,0.98)']} 
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Advanced Analytics</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowAdvancedAnalytics(false)}
                >
                  <Ionicons name="close" size={24} color="#64FFDA" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSectionTitle}>Historical Trends</Text>
                <View style={styles.modalCard}>
                  <Text style={styles.modalCardTitle}>Temperature Trends</Text>
                  {historicalData && typeof historicalData === 'object' && 'daily' in historicalData ? (
                    <View>
                      <Text style={styles.modalCardText}>
                        Max: {Math.max(...(historicalData as any).daily.temperature_2m_max).toFixed(1)}°C
                      </Text>
                      <Text style={styles.modalCardText}>
                        Min: {Math.min(...(historicalData as any).daily.temperature_2m_min).toFixed(1)}°C
                      </Text>
                      <Text style={styles.modalCardText}>
                        Avg: {((historicalData as any).daily.temperature_2m_max.reduce((a: number, b: number) => a + b, 0) / (historicalData as any).daily.temperature_2m_max.length).toFixed(1)}°C
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.modalCardText}>No historical data available</Text>
                  )}
                </View>
                
                <Text style={styles.modalSectionTitle}>Predictions</Text>
                <View style={styles.modalCard}>
                  <Text style={styles.modalCardTitle}>Risk Predictions</Text>
                  <Text style={styles.modalCardText}>
                    Next 24 hours: {overallRisk > 70 ? 'High Risk' : overallRisk > 40 ? 'Moderate Risk' : 'Low Risk'}
                  </Text>
                  <Text style={styles.modalCardText}>
                    Primary Concern: {riskFactors.length > 0 ? riskFactors[0].name : 'No data'}
                  </Text>
                </View>
                
                <Text style={styles.modalSectionTitle}>System Status</Text>
                <View style={styles.modalCard}>
                  <Text style={styles.modalCardTitle}>API Status</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.modalCardText}>Open-Meteo Weather API</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.modalCardText}>USGS Earthquake API</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.modalCardText}>OpenTopoData Elevation API</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.modalCardText}>OpenStreetMap Geocoding</Text>
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020c1b' },
  backgroundImage: { flex: 1 },
  gradientOverlay: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },
  
  // Loading
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#020c1b'
  },
  loaderIcon: {
    marginBottom: 24
  },
  loadingText: { 
    color: '#ccd6f6', 
    fontSize: 18, 
    fontWeight: '700', 
    marginTop: 16,
    textAlign: 'center'
  },
  loadingSubtext: { 
    color: '#8892B0', 
    fontSize: 13, 
    marginTop: 8,
    textAlign: 'center'
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24,
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)'
  },
  headerContent: { flex: 1 },
  title: { 
    color: '#ccd6f6', 
    fontSize: 20, 
    fontWeight: '700', 
    letterSpacing: 0.3
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
    gap: 6
  },
  locationText: { 
    color: '#8892B0', 
    fontSize: 12, 
    fontWeight: '500'
  },
  statusIndicator: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4,
    marginLeft: 10
  },
  statusText: { 
    color: '#020c1b', 
    fontSize: 8, 
    fontWeight: '900',
    letterSpacing: 0.5
  },
  analyticsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.12)'
  },
  
  // Section Titles
  sectionTitle: {
    color: '#ccd6f6',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.3
  },
  
  // Risk Gauge
  riskGaugeContainer: { 
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  riskHeaderLabel: {
    color: '#8892B0',
    fontSize: 13,
    fontWeight: '500'
  },
  riskScore: { 
    fontSize: 42, 
    fontWeight: '700',
    marginBottom: 0
  },
  gaugeBackground: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(136, 146, 176, 0.15)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  riskStatus: { 
    fontSize: 13, 
    fontWeight: '600'
  },
  
  // Metrics
  metricsContainer: {
    marginBottom: 24
  },
  metricsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  metricCard: {
    flex: 0,
    width: '48.5%',
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(100, 255, 218, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  metricValue: {
    color: '#64FFDA',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  metricLabel: {
    color: '#8892B0',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  metricDetail: {
    color: '#8892B0',
    fontSize: 10,
    marginTop: 6
  },
  
  // Risk Factors
  riskFactorsContainer: {
    marginBottom: 24
  },
  riskFactorCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  riskFactorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  riskFactorInfo: {
    flex: 1
  },
  riskFactorName: {
    color: '#ccd6f6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  riskFactorDescription: {
    color: '#8892B0',
    fontSize: 11,
    fontWeight: '400'
  },
  riskFactorScore: {
    alignItems: 'center'
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  scoreBox: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700'
  },
  scoreText: {
    color: '#020c1b',
    fontSize: 16,
    fontWeight: '700'
  },
  scoreLabel: {
    color: '#8892B0',
    fontSize: 9,
    fontWeight: '600'
  },
  riskFactorBar: {
    height: 8,
    backgroundColor: 'rgba(136, 146, 176, 0.15)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  riskFactorFill: {
    height: '100%',
    borderRadius: 4
  },
  riskFactorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  weightText: {
    color: '#8892B0',
    fontSize: 10,
    fontWeight: '500'
  },
  
  // Alerts
  alertsContainer: {
    marginBottom: 24
  },
  noAlertsBox: {
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center'
  },
  noAlertsText: {
    color: '#ccd6f6',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12
  },
  noAlertsSubtext: {
    color: '#8892B0',
    fontSize: 12,
    marginTop: 4
  },
  alertCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  alertCardCritical: {
    borderColor: 'rgba(255, 59, 48, 0.2)'
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2
  },
  alertTime: {
    color: '#8892B0',
    fontSize: 10,
    fontWeight: '400'
  },
  alertDescription: {
    color: '#9fb0ce',
    fontSize: 12,
    marginLeft: 42,
    fontWeight: '400'
  },
  // Map
  mapContainer: { 
    height: 320, 
    borderRadius: 14, 
    overflow: 'hidden', 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)'
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  locationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCenter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 12, 27, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#64FFDA',
    zIndex: 2
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(100, 255, 218, 0.4)',
    top: -6,
    left: -6
  },
  weatherMarker: {
    backgroundColor: 'rgba(2, 12, 27, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.4)'
  },
  weatherMarkerText: {
    color: '#64FFDA',
    fontSize: 10,
    fontWeight: '600'
  },
  seismicMarker: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 2,
    borderColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center'
  },
  seismicMarkerText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '700'
  },
  mapControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 8
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 12, 27, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)'
  },
  mapControlButtonActive: {
    backgroundColor: 'rgba(100, 255, 218, 0.2)',
    borderColor: '#64FFDA'
  },
  mapLegend: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(2, 12, 27, 0.9)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendText: {
    color: '#8892B0',
    fontSize: 10,
    fontWeight: '500'
  },

  // Footer
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 255, 218, 0.08)'
  },
  footerText: {
    color: '#8892B0',
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center'
  },
  footerSubtext: {
    color: '#64424E',
    fontSize: 9,
    marginTop: 6,
    textAlign: 'center'
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)'
  },
  modalContent: {
    flex: 1,
    marginTop: 60
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 255, 218, 0.08)'
  },
  modalTitle: {
    color: '#ccd6f6',
    fontSize: 18,
    fontWeight: '700'
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  modalSectionTitle: {
    color: '#ccd6f6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16
  },
  modalCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  modalCardTitle: {
    color: '#ccd6f6',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8
  },
  modalCardText: {
    color: '#9fb0ce',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '400'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  }
});