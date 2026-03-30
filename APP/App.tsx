import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import MapView, { Circle, Marker, UrlTile } from 'react-native-maps';

// ==================== DASHBOARD SCREEN ====================
const DashboardScreen = () => {
  const [location, setLocation] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [riskScore, setRiskScore] = useState(42);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
      
      // Fetch weather
      const weatherData = await fetchWeatherData(location.coords.latitude, location.coords.longitude);
      setWeather(weatherData);
    })();
  }, []);

  const fetchWeatherData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,precipitation&timezone=auto`
      );
      return await response.json();
    } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#4CAF50';
    if (score < 70) return '#FFC107';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 40.7128,
          longitude: location?.longitude || -74.0060,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <UrlTile
          urlTemplate="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image%2Fpng&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256"
          maximumZ={19}
          flipY={false}
        />
        
        {location && (
          <>
            <Marker coordinate={location} title="Your Location" pinColor="#0064ff" />
            <Circle
              center={location}
              radius={1000}
              strokeColor="rgba(255,0,0,0.5)"
              fillColor="rgba(255,0,0,0.2)"
            />
          </>
        )}
      </MapView>
      
      <View style={styles.overlay}>
        <Text style={styles.title}>🌍 Risk Dashboard</Text>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {weather?.current_weather?.temperature || '24'}°C
            </Text>
            <Text style={styles.statLabel}>Temperature</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {weather?.hourly?.precipitation?.[0] || '0'}mm
            </Text>
            <Text style={styles.statLabel}>Precipitation</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: getRiskColor(riskScore) }]}>
              {riskScore}/100
            </Text>
            <Text style={styles.statLabel}>Risk Level</Text>
          </View>
        </View>

        <View style={styles.riskCard}>
          <Text style={styles.riskTitle}>Current Risk Factors</Text>
          <View style={styles.riskFactors}>
            <View style={styles.factor}>
              <View style={[styles.factorDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.factorText}>Weather: Stable</Text>
            </View>
            <View style={styles.factor}>
              <View style={[styles.factorDot, { backgroundColor: '#FFC107' }]} />
              <Text style={styles.factorText}>Sensors: 4/5 Active</Text>
            </View>
            <View style={styles.factor}>
              <View style={[styles.factorDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.factorText}>Flood Zone: High Risk</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={() => Alert.alert('Scan', 'Would navigate to scanner')}>
          <Ionicons name="scan" size={20} color="white" />
          <Text style={styles.scanButtonText}>Quick Risk Scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ==================== SCANNER SCREEN ====================
const ScannerScreen = () => {
  const [facing, setFacing] = useState<any>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [riskScore, setRiskScore] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  if (!permission) return <View />;
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Need camera permission</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    setScanning(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // Simulate AI analysis
    setTimeout(() => {
      const score = Math.floor(Math.random() * 100);
      setRiskScore(score);
      setScanning(false);
      setScanComplete(true);
      Haptics.notificationAsync(
        score > 70 
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success
      );
    }, 2000);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#4CAF50';
    if (score < 70) return '#FFC107';
    return '#F44336';
  };

  const getRiskLevel = (score: number) => {
    if (score < 30) return 'Low';
    if (score < 70) return 'Medium';
    return 'High';
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, scanning && styles.buttonDisabled]} 
            onPress={takePicture}
            disabled={scanning}
          >
            <Text style={styles.buttonText}>
              {scanning ? 'Analyzing...' : 'Scan Property'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}
          >
            <Text style={styles.buttonText}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {scanComplete && (
        <View style={[styles.resultContainer, { borderColor: getRiskColor(riskScore) }]}>
          <Text style={styles.resultTitle}>📊 Risk Assessment Complete</Text>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: getRiskColor(riskScore) }]}>
              {riskScore}/100 - {getRiskLevel(riskScore)} Risk
            </Text>
            <View style={styles.scoreBar}>
              <View 
                style={[
                  styles.scoreFill, 
                  { 
                    width: `${riskScore}%`,
                    backgroundColor: getRiskColor(riskScore)
                  }
                ]} 
              />
            </View>
          </View>
          <Text style={styles.riskFactors}>
            <Text style={styles.bold}>Factors Detected:</Text>
            • Roof condition: {riskScore > 70 ? 'Poor' : 'Good'}
            • Tree proximity: {riskScore > 50 ? 'Close' : 'Safe'}
            • Drainage: {riskScore > 60 ? 'Poor' : 'Adequate'}
          </Text>
          
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => Alert.alert('Report', 'Detailed report would open here')}
          >
            <Text style={styles.reportButtonText}>View Full Report →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ==================== SENSORS SCREEN ====================
const SensorsScreen = () => {
  const [sensors, setSensors] = useState<any[]>([
    { id: '1', name: 'Temperature Sensor', type: 'temp', value: 24.5, unit: '°C', status: 'active' },
    { id: '2', name: 'Humidity Sensor', type: 'humidity', value: 65.2, unit: '%', status: 'active' },
    { id: '3', name: 'Vibration Sensor', type: 'vibration', value: 12.3, unit: 'Hz', status: 'warning' },
    { id: '4', name: 'Water Level', type: 'water', value: 45.6, unit: 'cm', status: 'active' },
    { id: '5', name: 'Wind Speed', type: 'wind', value: 18.4, unit: 'km/h', status: 'active' },
  ]);
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (sensors.length > 0) {
      setSelectedSensor(sensors[0]);
      generateChartData(sensors[0]);
    }
  }, []);

  const generateChartData = (sensor: any) => {
    const labels = [];
    const values = [];
    
    for (let i = 0; i < 10; i++) {
      labels.push(`${i * 2}h`);
      values.push(Math.random() * 50 + 20);
    }
    
    setChartData({
      labels,
      datasets: [{
        data: values,
        color: (opacity = 1) => `rgba(0, 100, 255, ${opacity})`,
      }]
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const refreshSensors = () => {
    const updated = sensors.map(sensor => ({
      ...sensor,
      value: sensor.value + (Math.random() * 2 - 1)
    }));
    setSensors(updated);
    if (selectedSensor) {
      const updatedSelected = updated.find(s => s.id === selectedSensor.id);
      setSelectedSensor(updatedSelected);
      generateChartData(updatedSelected);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📡 IoT Sensor Network</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshSensors}>
          <Ionicons name="refresh" size={20} color="#0064ff" />
        </TouchableOpacity>
      </View>
      
      {/* Sensor Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sensorList}>
        {sensors.map(sensor => (
          <TouchableOpacity
            key={sensor.id}
            style={[
              styles.sensorCard,
              selectedSensor?.id === sensor.id && styles.selectedSensor
            ]}
            onPress={() => {
              setSelectedSensor(sensor);
              generateChartData(sensor);
            }}
          >
            <View style={styles.sensorHeader}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensor.status) }]} />
              <Text style={styles.sensorName} numberOfLines={2}>{sensor.name}</Text>
            </View>
            <Text style={styles.sensorValue}>
              {sensor.value.toFixed(1)}{sensor.unit}
            </Text>
            <Text style={styles.sensorType}>{sensor.type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chart */}
      {chartData && selectedSensor && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{selectedSensor.name} - Last 20 hours</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 100, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#0064ff' }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Sensor Details */}
      {selectedSensor && (
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>🔍 Sensor Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID:</Text>
            <Text style={styles.detailValue}>{selectedSensor.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{selectedSensor.type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Value:</Text>
            <Text style={[styles.detailValue, styles.valueHighlight]}>
              {selectedSensor.value.toFixed(1)}{selectedSensor.unit}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.badgeDot, { backgroundColor: getStatusColor(selectedSensor.status) }]} />
              <Text style={styles.detailValue}>{selectedSensor.status}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>Just now</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// ==================== ALERTS SCREEN ====================
const AlertsScreen = () => {
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', title: 'High Temperature Alert', message: 'Sensor #4 detected 35°C', time: '2 mins ago', read: false },
    { id: 2, type: 'danger', title: 'Flood Risk Warning', message: 'Heavy rain predicted in your area', time: '15 mins ago', read: true },
    { id: 3, type: 'info', title: 'Sensor Offline', message: 'Water level sensor #3 lost connection', time: '1 hour ago', read: true },
    { id: 4, type: 'warning', title: 'Wind Speed Increase', message: 'Wind speed increasing to 25 km/h', time: '2 hours ago', read: true },
  ]);

  const triggerTestAlert = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Test Alert', 'Simulated alert triggered successfully!');
    
    // Add new alert
    const newAlert = {
      id: Date.now(),
      type: 'info',
      title: 'Test Alert Triggered',
      message: 'This is a simulated test alert',
      time: 'Just now',
      read: false,
    };
    setAlerts([newAlert, ...alerts]);
  };

  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'danger': return 'warning';
      case 'warning': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'notifications';
    }
  };

  const getAlertColor = (type: string) => {
    switch(type) {
      case 'danger': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Risk Alerts</Text>
        <TouchableOpacity style={styles.testButton} onPress={triggerTestAlert}>
          <Ionicons name="notifications" size={20} color="white" />
          <Text style={styles.testButtonText}>Test Alert</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertSummary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{alerts.filter(a => !a.read).length}</Text>
          <Text style={styles.summaryLabel}>Unread</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{alerts.filter(a => a.type === 'danger').length}</Text>
          <Text style={styles.summaryLabel}>Critical</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{alerts.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
      
      {alerts.map(alert => (
        <TouchableOpacity 
          key={alert.id}
          style={[
            styles.alertCard,
            !alert.read && styles.unreadAlert
          ]}
          onPress={() => {
            setAlerts(alerts.map(a => 
              a.id === alert.id ? { ...a, read: true } : a
            ));
          }}
        >
          <View style={styles.alertHeader}>
            <View style={[styles.alertIcon, { backgroundColor: getAlertColor(alert.type) }]}>
              <Ionicons name={getAlertIcon(alert.type)} size={20} color="white" />
            </View>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
            {!alert.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.alertMessage}>{alert.message}</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>View Details</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      <View style={styles.predictiveCard}>
        <Text style={styles.predictiveTitle}>📈 Predictive Insights</Text>
        <Text style={styles.predictiveText}>
          Based on current weather patterns and historical data, there's a 
          <Text style={styles.highlight}> 30% chance of flooding</Text> in your area 
          within the next 24 hours.
        </Text>
        <View style={styles.prepSteps}>
          <Text style={styles.stepsTitle}>✅ Recommended Actions:</Text>
          <Text style={styles.step}>1. Check emergency kit</Text>
          <Text style={styles.step}>2. Move valuables to higher ground</Text>
          <Text style={styles.step}>3. Monitor sensor alerts</Text>
        </View>
      </View>
    </ScrollView>
  );
};

// ==================== PROFILE SCREEN ====================
const ProfileScreen = () => {
  const [premium, setPremium] = useState(1200);
  const [riskScore, setRiskScore] = useState(65);
  const [mitigations, setMitigations] = useState({
    floodBarrier: false,
    fireSystem: false,
    earthquakeProof: false,
    securitySystem: true,
  });

  const calculatePremium = () => {
    let base = 1000;
    let multiplier = 1;
    
    // Risk score adjustment
    multiplier *= (riskScore / 50);
    
    // Mitigation discounts
    if (mitigations.floodBarrier) multiplier -= 0.1;
    if (mitigations.fireSystem) multiplier -= 0.15;
    if (mitigations.earthquakeProof) multiplier -= 0.2;
    if (mitigations.securitySystem) multiplier -= 0.05;
    
    // Minimum multiplier
    multiplier = Math.max(multiplier, 0.5);
    
    setPremium(Math.round(base * multiplier));
  };

  const toggleMitigation = (key: string) => {
    setMitigations(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setTimeout(calculatePremium, 300);
  };

  useEffect(() => {
    calculatePremium();
  }, [riskScore, mitigations]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="white" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>Demo User</Text>
          <Text style={styles.userEmail}>demo@riskshield.com</Text>
          <Text style={styles.userType}>Premium Member</Text>
        </View>
      </View>

      <View style={styles.premiumCard}>
        <Text style={styles.premiumTitle}>💰 Annual Insurance Premium</Text>
        <Text style={styles.premiumAmount}>${premium}</Text>
        <Text style={styles.premiumSubtitle}>Dynamic pricing based on real-time risk</Text>
        
        <View style={styles.riskSlider}>
          <Text style={styles.sliderLabel}>Your Risk Score: {riskScore}/100</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={riskScore}
            onValueChange={setRiskScore}
            minimumTrackTintColor="#0064ff"
            maximumTrackTintColor="#e0e0e0"
          />
          <View style={styles.sliderMarks}>
            <Text style={styles.markText}>Low</Text>
            <Text style={styles.markText}>Medium</Text>
            <Text style={styles.markText}>High</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>🛡️ Risk Mitigation Measures</Text>
      <Text style={styles.sectionSubtitle}>Enable to lower your premium</Text>

      {[
        { key: 'floodBarrier', label: 'Flood Barrier Installed', icon: 'water', discount: '10%' },
        { key: 'fireSystem', label: 'Fire Suppression System', icon: 'flame', discount: '15%' },
        { key: 'earthquakeProof', label: 'Earthquake Proofing', icon: 'earth', discount: '20%' },
        { key: 'securitySystem', label: 'Security System', icon: 'shield-checkmark', discount: '5%' },
      ].map(item => (
        <View key={item.key} style={styles.mitigationItem}>
          <View style={styles.mitigationInfo}>
            <View style={styles.mitigationIcon}>
              <Ionicons name={item.icon} size={24} color="#0064ff" />
            </View>
            <View>
              <Text style={styles.mitigationLabel}>{item.label}</Text>
              <Text style={styles.discountText}>Save {item.discount}</Text>
            </View>
          </View>
          <Switch
            value={mitigations[item.key]}
            onValueChange={() => toggleMitigation(item.key)}
            trackColor={{ false: '#e0e0e0', true: '#0064ff' }}
          />
        </View>
      ))}

      <View style={styles.savingsCard}>
        <Text style={styles.savingsTitle}>💵 Potential Savings</Text>
        <Text style={styles.savingsAmount}>Save up to ${Math.round(2000 - premium)}/year</Text>
        <Text style={styles.savingsText}>
          By implementing all mitigation measures, you could save significantly on your insurance premium while improving safety.
        </Text>
      </View>

      <View style={styles.propertyCard}>
        <Text style={styles.propertyTitle}>🏠 Property Portfolio</Text>
        <View style={styles.propertyItem}>
          <View style={[styles.propertyIcon, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="home" size={24} color="#4CAF50" />
          </View>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>Main Residence</Text>
            <Text style={styles.propertyDetail}>Risk Score: 65 | Premium: ${premium}</Text>
          </View>
        </View>
        <View style={styles.propertyItem}>
          <View style={[styles.propertyIcon, { backgroundColor: '#e8f4ff' }]}>
            <Ionicons name="business" size={24} color="#2196F3" />
          </View>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>Warehouse Facility</Text>
            <Text style={styles.propertyDetail}>Risk Score: 82 | Premium: $2,400</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.calculateButton} onPress={calculatePremium}>
        <Ionicons name="calculator" size={20} color="white" />
        <Text style={styles.calculateButtonText}>Recalculate Premium</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Export a minimal App component so expo-router provides navigation.
export default function App() {
  return null;
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Dashboard styles
  map: {
    width: Dimensions.get('window').width,
    height: '70%',
  },
  overlay: {
    padding: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0064ff',
  },
  statLabel: {
    fontSize: 12,
    color: 'gray',
    marginTop: 5,
  },
  riskCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  riskFactors: {
    gap: 8,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  factorText: {
    fontSize: 14,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0064ff',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Scanner styles
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: 'rgba(0, 100, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.8)',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scoreContainer: {
    marginBottom: 15,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoreBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  reportButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  reportButtonText: {
    color: '#0064ff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Sensors styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  refreshButton: {
    padding: 8,
  },
  sensorList: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sensorCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedSensor: {
    borderWidth: 2,
    borderColor: '#0064ff',
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sensorName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sensorType: {
    fontSize: 12,
    color: 'gray',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 10,
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: 'gray',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  valueHighlight: {
    color: '#0064ff',
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  
  // Alerts styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0064ff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  alertSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'gray',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  markReadText: {
    color: '#0064ff',
    fontSize: 14,
  },
  alertCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#0064ff',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0064ff',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  actionText: {
    color: '#0064ff',
    fontSize: 12,
    fontWeight: '500',
  },
  predictiveCard: {
    backgroundColor: '#e8f4ff',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  predictiveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  predictiveText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },
  highlight: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  prepSteps: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  step: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  
  // Profile styles
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0064ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: 'gray',
  },
  userType: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  premiumCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumTitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 5,
  },
  premiumAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0064ff',
    marginBottom: 5,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 20,
  },
  riskSlider: {
    marginTop: 10,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  markText: {
    fontSize: 12,
    color: 'gray',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'gray',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  mitigationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mitigationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mitigationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  mitigationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  discountText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  savingsCard: {
    backgroundColor: '#e8f7e8',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  savingsAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  savingsText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  propertyCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  propertyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '500',
  },
  propertyDetail: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0064ff',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 30,
    gap: 10,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});