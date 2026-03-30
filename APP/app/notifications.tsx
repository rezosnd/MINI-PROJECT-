import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NotificationService from '../services/NotificationService';

export default function NotificationsScreen() {
  const { width } = Dimensions.get('window');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const [thought] = useState('Real-time disaster monitoring');

  useEffect(() => {
    NotificationService.initialize();

    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      setNotifications(prev => [n, ...prev].slice(0, 50));
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      Alert.alert('Notification tapped', JSON.stringify(data));
    });

    return () => {
      if (notificationListener.current && typeof notificationListener.current.remove === 'function') {
        notificationListener.current.remove();
      }
      if (responseListener.current && typeof responseListener.current.remove === 'function') {
        responseListener.current.remove();
      }
    };
  }, []);

  const startMonitoring = async () => {
    // Start monitoring: if we already have notifications, keep monitoring.
    setIsMonitoring(true);

    // If we've already received notifications, nothing more to do.
    if (notifications && notifications.length > 0) {
      return;
    }

    // Run a check against disaster APIs which will schedule immediate notifications
    const found = await NotificationService.checkForDisasters();

    // Refresh scheduled/received notifications
    const history = await NotificationService.getNotificationHistory();
    setNotifications(history || []);

    // If no notifications were scheduled by the API checks, send a test notification
    if ((!found || found.length === 0) && (!history || history.length === 0)) {
      await NotificationService.testNotification();
    }
  };

  const testNotification = async () => {
    await NotificationService.testNotification();
    Alert.alert('Test Notification', 'Test notification sent');
  };

  const clearNotifications = async () => {
    await NotificationService.clearAllNotifications();
    setNotifications([]);
    Alert.alert('Cleared', 'All notifications cleared');
  };

  const getNotificationHistory = async () => {
    const history = await NotificationService.getNotificationHistory();
    setNotifications(history || []);
  };

  const openDisasterInfo = (type: string) => {
    const urls: Record<string, string> = {
      earthquake: 'https://www.ready.gov/earthquakes',
      flood: 'https://www.ready.gov/floods',
      wildfire: 'https://www.ready.gov/wildfires',
      tsunami: 'https://www.ready.gov/tsunamis',
      weather: 'https://www.weather.gov/safety',
    };

    const url = urls[type] || 'https://www.ready.gov';
    import('react-native').then(({ Linking }) => {
      Linking.openURL(url).catch(() => Alert.alert('Unable to open', url));
    });
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072' }}
      style={{ flex: 1 }}
      blurRadius={100}
    >
      <LinearGradient colors={['rgba(2,12,27,0.7)', 'rgba(2,12,27,1)']} style={{ flex: 1 }}>
        <ScrollView style={[styles.safeFrame, { paddingHorizontal: 25 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.thoughtSection}>
            <Text style={styles.thoughtText}>{thought}</Text>
            <View style={styles.thoughtAccent} />
          </View>

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>ALPHA EARTH</Text>
              <Text style={styles.locText}>Disaster Alert Center</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.notifyButton} onPress={() => {}}>
                <Ionicons name="notifications" size={20} color="#64FFDA" />
                <View style={styles.notifyBadge} />
              </TouchableOpacity>
              <Image source={{ uri: 'https://www.kiit.ac.in/wp-content/uploads/2022/10/KIIT-Logo-500x500-1.png' }} style={styles.logo} />
            </View>
          </View>

          <View style={[styles.heroCard, { marginBottom: 12 }]}> 
            <LinearGradient colors={['rgba(100,255,218,0.03)', 'rgba(10,25,47,0.9)']} style={styles.heroGradient}>
              <Text style={styles.heroLabel}>DISASTER ALERTS</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNumber}>{notifications.length}</Text>
                <View style={styles.scoreMeta}><Text style={styles.scoreUnit}>alerts</Text></View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.button} onPress={startMonitoring}><Text style={styles.buttonText}>START MONITORING</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testNotification}><Text style={styles.buttonText}>TEST ALERT</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearNotifications}><Text style={styles.buttonText}>CLEAR ALL</Text></TouchableOpacity>
          </View>

          <View style={styles.notificationList}>
            <Text style={styles.listTitle}>Recent Alerts ({notifications.length})</Text>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No alerts yet. Start monitoring to receive notifications.</Text>
            ) : (
              notifications.map((n, i) => {
                const title = (n.request?.content?.title || '').toString().toLowerCase();
                const dataType = n.request?.content?.data?.type;
                const inferType = dataType || (
                  title.includes('earthquake') ? 'earthquake' :
                  title.includes('flood') ? 'flood' :
                  title.includes('wildfire') ? 'wildfire' :
                  title.includes('tsunami') ? 'tsunami' :
                  (title.includes('storm') || title.includes('weather') ? 'weather' : undefined)
                );

                return (
                  <View key={i} style={styles.notificationCard}>
                    <Text style={styles.notificationTitle}>{n.request.content.title || 'Alert'}</Text>
                    <Text style={styles.notificationBody}>{n.request.content.body}</Text>
                    {inferType && (
                      <TouchableOpacity style={styles.infoButton} onPress={() => openDisasterInfo(inferType)}>
                        <Text style={styles.infoButtonText}>More info</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1929', paddingTop: 40 },
  header: { paddingHorizontal: 20, marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  subtitle: { color: '#64ffda', marginTop: 6 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  button: { backgroundColor: '#64ffda', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, flex: 1, marginHorizontal: 6, alignItems: 'center' },
  testButton: { backgroundColor: '#64ffda' },
  clearButton: { backgroundColor: '#64ffda' },
  buttonText: { color: '#fff', fontWeight: '700' },
  notificationList: { flex: 1, padding: 16 },
  listTitle: { color: '#fff', fontWeight: '700', marginBottom: 12 },
  notificationCard: { backgroundColor: '#132f4c', padding: 12, borderRadius: 10, marginBottom: 10 },
  notificationTitle: { color: '#fff', fontWeight: '700' },
  notificationBody: { color: '#b0bec5', marginTop: 6 },
  infoButton: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#64ffda', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  infoButtonText: { color: '#02202a', fontWeight: '800' },
  emptyText: { color: '#64ffda', textAlign: 'center', marginTop: 40 }
,
  safeFrame: { flex: 1, paddingTop: 50 },
  thoughtSection: { marginBottom: 15 },
  thoughtText: { color: '#8892B0', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  thoughtAccent: { width: 25, height: 2, backgroundColor: '#64FFDA', marginTop: 8 },
  brandTitle: { color: '#ccd6f6', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  locText: { color: '#64FFDA', fontSize: 9, fontWeight: '900', marginLeft: 4 },
  heroCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(100,255,218,0.1)' },
  heroGradient: { padding: 20 },
  heroLabel: { color: '#8892B0', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  scoreNumber: { color: '#fff', fontSize: 40, fontWeight: '700' },
  scoreMeta: { marginLeft: 12 },
  scoreUnit: { color: '#8892B0', fontSize: 12, fontWeight: '600' },
  notifyButton: { marginRight: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  notifyBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444', borderWidth: 1, borderColor: '#020c1b' },
});
