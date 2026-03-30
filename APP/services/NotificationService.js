import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_TASK = 'disaster-monitoring-task';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const DISASTER_APIS = {
  earthquakes: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  weather: 'https://api.openweathermap.org/data/2.5/onecall',
  wildfire: 'https://eonet.gsfc.nasa.gov/api/v3/events',
  tsunami: 'https://www.tsunami.gov/events.json',
  floods: 'https://api.reliefweb.int/v1/disasters',
};

let lastCheckedTime = Date.now();
let userLocation = null;

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.userCountry = null;
  }

  async initialize() {
    try {
      await this.requestPermissions();
      await this.getUserLocation();
      await this.setupNotificationCategories();
      await this.registerBackgroundTask();
      await this.checkForDisasters();
      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  async requestPermissions() {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      throw new Error('Notification permission not granted');
    }
    return { locationStatus, notificationStatus };
  }

  async getUserLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      userLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      const reverse = await Location.reverseGeocodeAsync(location.coords);
      if (reverse[0]) this.userCountry = reverse[0].country || 'Global';
      console.log('User location:', userLocation, 'Country:', this.userCountry);
    } catch (error) {
      console.warn('Could not get location:', error);
      userLocation = { latitude: 20, longitude: 0 };
      this.userCountry = 'Global';
    }
  }

  async setupNotificationCategories() {
    // Categories (iOS) - no-op on Android but safe to call
    try {
      await Notifications.setNotificationCategoryAsync('earthquake', [
        { identifier: 'view_details', buttonTitle: 'View Details', options: { opensAppToForeground: true } },
        { identifier: 'safety_info', buttonTitle: 'Safety Info', options: { opensAppToForeground: true } },
      ]);
    } catch (e) {
      // ignore
    }
  }

  async registerBackgroundTask() {
    try {
      TaskManager.defineTask(BACKGROUND_TASK, async () => {
        console.log('Background task running');
        await this.checkForDisasters();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      });

      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
        minimumInterval: 300,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background task registered');
    } catch (error) {
      console.error('Background task registration failed:', error);
    }
  }

  async checkForDisasters() {
    try {
      console.log('Checking for disasters...');
      const disasters = [];
      const earthquakes = await this.checkEarthquakes();
      disasters.push(...earthquakes);
      const weatherAlerts = await this.checkWeatherAlerts();
      disasters.push(...weatherAlerts);
      const wildfires = await this.checkWildfires();
      disasters.push(...wildfires);
      const floods = await this.checkFloods();
      disasters.push(...floods);
      const tsunamis = await this.checkTsunamis();
      disasters.push(...tsunamis);
      const relevant = this.filterRelevantDisasters(disasters);
      await this.sendNotifications(relevant);
      lastCheckedTime = Date.now();
      return relevant;
    } catch (error) {
      console.error('Error checking for disasters:', error);
      return [];
    }
  }

  // Implementations (simplified)
  async checkEarthquakes() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const startTime = thirtyMinutesAgo.toISOString();
      const response = await axios.get(DISASTER_APIS.earthquakes, { params: { format: 'geojson', starttime: startTime, minmagnitude: 4.0, limit: 20 } });
      return (response.data.features || []).map(f => ({ type: 'earthquake', id: f.id, title: `Earthquake M${f.properties.mag}`, description: f.properties.title || '', location: { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }, magnitude: f.properties.mag, place: f.properties.place, time: f.properties.time, url: f.properties.url, isCritical: f.properties.mag >= 5.0 }));
    } catch (error) { console.error(error); return []; }
  }

  async checkWeatherAlerts() {
    try {
      if (!userLocation) return [];
      // Note: user should replace with valid API key
      const response = await axios.get(DISASTER_APIS.weather, { params: { lat: userLocation.latitude, lon: userLocation.longitude, exclude: 'current,minutely,hourly', appid: 'YOUR_OPENWEATHER_API_KEY' } });
      if (!response.data.alerts) return [];
      return response.data.alerts.map(a => ({ type: 'weather', id: `weather-${Date.now()}-${Math.random()}`, title: `${a.event} Alert`, description: a.description, location: userLocation, sender: a.sender_name, start: a.start, end: a.end, severity: a.tags && a.tags.includes('Extreme') ? 'critical' : 'warning', isCritical: a.tags && a.tags.includes('Extreme') }));
    } catch (error) { console.error(error); return []; }
  }

  async checkWildfires() {
    try {
      const response = await axios.get(DISASTER_APIS.wildfire, { params: { category: 'wildfires', limit: 10, days: 1 } });
      return (response.data.events || []).map(e => ({ type: 'wildfire', id: e.id, title: 'Wildfire Alert', description: e.title, location: { latitude: e.geometry?.[0]?.coordinates?.[1], longitude: e.geometry?.[0]?.coordinates?.[0] }, severity: 'warning', isCritical: true, source: 'NASA EONET' }));
    } catch (error) { console.error(error); return []; }
  }

  async checkFloods() {
    try {
      const response = await axios.get(DISASTER_APIS.floods, { params: { appname: 'disaster-alert', profile: 'full', limit: 10 } });
      return (response.data.data || []).map(d => ({ type: 'flood', id: d.id, title: `${d.fields.name} - Flood Alert`, description: d.fields.description, location: { country: d.fields.country?.[0]?.name }, severity: d.fields.status === 'alert' ? 'critical' : 'warning', isCritical: d.fields.status === 'alert' }));
    } catch (error) { console.error(error); return []; }
  }

  async checkTsunamis() {
    try {
      const response = await axios.get(DISASTER_APIS.tsunami);
      if (!response.data.events) return [];
      return response.data.events.map(ev => ({ type: 'tsunami', id: ev.id, title: 'Tsunami Warning', description: ev.title, location: { latitude: ev.latitude, longitude: ev.longitude }, isCritical: true, source: 'NOAA' }));
    } catch (error) { console.error(error); return []; }
  }

  filterRelevantDisasters(disasters) {
    return disasters.filter(d => {
      const disasterTime = new Date(d.time || Date.now()).getTime();
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (disasterTime < thirtyMinutesAgo) return false;
      if (userLocation && d.location && d.location.latitude) {
        const distance = this.calculateDistance(userLocation.latitude, userLocation.longitude, d.location.latitude, d.location.longitude);
        if (distance > 500 && !d.isCritical) return false;
      }
      if (this.userCountry && this.userCountry !== 'Global' && d.location?.country) {
        if (!d.location.country.includes(this.userCountry)) {
          if (!['earthquake','tsunami'].includes(d.type) || !d.isCritical) return false;
        }
      }
      return true;
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(this.toRad(lat1))*Math.cos(this.toRad(lat2)) * Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) { return deg * (Math.PI/180); }

  async sendNotifications(disasters) {
    for (const disaster of disasters) {
      const already = await this.checkIfNotified(disaster.id);
      if (already) continue;
      const notificationContent = { title: this.formatTitle(disaster), body: this.formatBody(disaster), data: { disasterId: disaster.id, type: disaster.type, isCritical: disaster.isCritical, url: disaster.url || null }, categoryIdentifier: disaster.type };
      await Notifications.scheduleNotificationAsync({ content: notificationContent, trigger: null });
      await this.storeNotification(disaster.id);
      if (disaster.isCritical) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log('Notification sent:', disaster.title);
    }
  }

  formatTitle(disaster) { const emoji = { earthquake: '🌋', weather: '⛈️', wildfire: '🔥', flood: '🌊', tsunami: '🌊' }[disaster.type] || '⚠️'; const severity = disaster.isCritical ? '[CRITICAL] ' : ''; return `${emoji} ${severity}${disaster.title}`; }
  formatBody(disaster) { let body = disaster.description || 'Disaster alert'; if (disaster.location?.place) body += `\n📍 ${disaster.location.place}`; if (disaster.magnitude) body += `\n📊 Magnitude: ${disaster.magnitude}`; if (disaster.distance) body += `\n📏 Distance: ${Math.round(disaster.distance)}km away`; return body; }

  async checkIfNotified(disasterId) { try { const notified = await AsyncStorage.getItem('notifiedDisasters') || '[]'; return JSON.parse(notified).includes(disasterId); } catch (e) { return false; } }
  async storeNotification(disasterId) { try { const notified = await AsyncStorage.getItem('notifiedDisasters') || '[]'; const ids = JSON.parse(notified); ids.push(disasterId); if (ids.length > 100) ids.splice(0, ids.length - 100); await AsyncStorage.setItem('notifiedDisasters', JSON.stringify(ids)); } catch (e) { console.error(e); } }

  async testNotification() { await Notifications.scheduleNotificationAsync({ content: { title: '🚨 TEST: Earthquake Alert', body: 'Magnitude 5.8 earthquake detected 150km from your location', data: { disasterId: 'test-123', type: 'earthquake', isCritical: true } }, trigger: null }); }

  async getNotificationHistory() { try { return await Notifications.getAllScheduledNotificationsAsync(); } catch (e) { console.error(e); return []; } }

  async clearAllNotifications() { await Notifications.cancelAllScheduledNotificationsAsync(); await AsyncStorage.removeItem('notifiedDisasters'); }
}

export default new NotificationService();
