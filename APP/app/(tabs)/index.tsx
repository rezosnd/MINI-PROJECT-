import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const INTELLIGENCE_THOUGHTS = [
    "True resilience is built on predictive intelligence.",
    "Environmental data is the currency of the next decade.",
    "Strategic mitigation today prevents failure tomorrow.",
    "Monitor the silent signals of the Earth."
];

const EARTH_HTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; background-color: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <script>
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const loader = new THREE.TextureLoader();
        const material = new THREE.MeshPhongMaterial({
            map: loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
            shininess: 5
        });

        const earth = new THREE.Mesh(geometry, material);
        scene.add(earth);

        const light = new THREE.PointLight(0xffffff, 1.2);
        light.position.set(5, 5, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040, 0.8));

        camera.position.z = 5;

        function animate() {
            requestAnimationFrame(animate);
            earth.rotation.y += 0.002;
            renderer.render(scene, camera);
        }
        animate();

        let lastX;
        document.addEventListener('touchstart', e => { lastX = e.touches[0].clientX; });
        document.addEventListener('touchmove', e => {
            const deltaX = e.touches[0].clientX - lastX;
            earth.rotation.y += deltaX * 0.005;
            lastX = e.touches[0].clientX;
        });
    </script>
</body>
</html>
`;

export default function HomeScreen() {
    const router = useRouter();
    const [locationName, setLocationName] = useState<string>('LOCATING...');
    const [riskData, setRiskData] = useState({ score: '--', temp: '--', wind: '--' });
    const [loading, setLoading] = useState(true);
    const [thought, setThought] = useState(INTELLIGENCE_THOUGHTS[0]);

    useEffect(() => {
        // Correctly rotate thought on mount
        const randomThought = INTELLIGENCE_THOUGHTS[Math.floor(Math.random() * INTELLIGENCE_THOUGHTS.length)];
        setThought(randomThought);

        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationName('GLOBAL VIEW');
                    setLoading(false);
                    return;
                }

                let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                
                // Using Expo's native reverse geocoding for better stability
                let reverse = await Location.reverseGeocodeAsync(loc.coords);
                if (reverse.length > 0) {
                    const city = reverse[0].city || reverse[0].district || "";
                    const region = reverse[0].region || reverse[0].subregion || "";
                    setLocationName(`${city}, ${region}`.toUpperCase());
                }

                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true`
                );
                const data = await response.json();
                const wind = data.current_weather.windspeed;
                const calculatedRisk = Math.floor(wind * 1.3 + 12); 
                
                setRiskData({
                    score: Math.min(calculatedRisk, 100).toString(),
                    temp: `${Math.round(data.current_weather.temperature)}°C`,
                    wind: `${wind} KM/H`
                });
            } catch (e) {
                console.error("Data Fetch Error:", e);
                setLocationName('COORDINATES ACTIVE');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <View style={styles.mainContainer}>
            <ImageBackground 
                source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072' }} 
                style={styles.backgroundImage}
                blurRadius={100}
            >
                <LinearGradient colors={['rgba(2,12,27,0.7)', 'rgba(2,12,27,1)']} style={styles.darkOverlay}>
                    <ScrollView style={styles.safeFrame} showsVerticalScrollIndicator={false}>
                        
                        {/* 1. THOUGHT SECTION */}
                        <View style={styles.thoughtSection}>
                            <Text style={styles.thoughtText}>{thought}</Text>
                            <View style={styles.thoughtAccent} />
                        </View>

                        {/* 2. HEADER */}
                        <View style={styles.header}>
                            <View style={{flex: 1}}>
                                <Text style={styles.brandTitle}>ALPHA EARTH</Text>
                                <View style={styles.locRow}>
                                    <Ionicons name="location-sharp" size={10} color="#64FFDA" />
                                    <Text style={styles.locText} numberOfLines={1}>{locationName}</Text>
                                </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={styles.notifyButton} onPress={() => router.push('notifications')}>
                    <Ionicons name="notifications" size={20} color="#64FFDA" />
                    <View style={styles.notifyBadge} />
                </TouchableOpacity>
                <Image 
                    source={{ uri: 'https://www.kiit.ac.in/wp-content/uploads/2022/10/KIIT-Logo-500x500-1.png' }} 
                    style={styles.logo}
                />
            </View>
                        </View>

                        {/* 3. RISK CARD */}
                        <View style={styles.heroCard}>
                            <LinearGradient colors={['rgba(100,255,218,0.03)', 'rgba(10,25,47,0.9)']} style={styles.heroGradient}>
                                <Text style={styles.heroLabel}>ENVIRONMENTAL RISK INDEX</Text>
                                <View style={styles.scoreRow}>
                                    {loading ? <ActivityIndicator color="#64FFDA" /> : (
                                        <>
                                            <Text style={styles.scoreNumber}>{riskData.score}</Text>
                                            <View style={styles.scoreMeta}>
                                                <Text style={styles.scoreUnit}>/100</Text>
                                                <Text style={styles.riskStatus}>NOMINAL</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statsFooter}>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLabel}>AMBIENT TEMP</Text>
                                        <Text style={styles.footerValue}>{riskData.temp}</Text>
                                    </View>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLabel}>WIND VELOCITY</Text>
                                        <Text style={styles.footerValue}>{riskData.wind}</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>

                        {/* 4. THE 3D ROTATING EARTH */}
                        <View style={styles.earthContainer}>
                            {!loading && (
                                <WebView
                                    originWhitelist={['*']}
                                    source={{ html: EARTH_HTML }}
                                    style={styles.earthWebView}
                                    scrollEnabled={false}
                                    transparent={true}
                                />
                            )}
                            {loading && <ActivityIndicator color="#64FFDA" size="large" />}
                        </View>

                        {/* 5. OPERATIONAL MODULES */}
                        <Text style={styles.sectionTitle}>OPERATIONAL MODULES</Text>
                        <View style={styles.grid}>
                <ModuleCard icon="access-point" title="IoT Network" onPress={() => router.push('iot-network')} />
                <ModuleCard icon="chart-bell-curve-cumulative" title="Forecasting" onPress={() => router.push('forecasting')} />
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
}

function ModuleCard({ icon, title, onPress }: any) {
    return (
        <TouchableOpacity style={styles.moduleCard} activeOpacity={0.7} onPress={onPress}>
            <MaterialCommunityIcons name={icon} size={22} color="#64FFDA" />
            <Text style={styles.moduleTitle}>{title}</Text>
            <Ionicons name="chevron-forward" size={10} color="#8892B0" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020c1b' },
    backgroundImage: { flex: 1 },
    darkOverlay: { flex: 1 },
    safeFrame: { flex: 1, paddingHorizontal: 25, paddingTop: 50 },
    thoughtSection: { marginBottom: 15 },
    thoughtText: { color: '#8892B0', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
    thoughtAccent: { width: 25, height: 2, backgroundColor: '#64FFDA', marginTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    logo: { width: 38, height: 38, marginLeft: 10 },
    brandTitle: { color: '#ccd6f6', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
    locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    locText: { color: '#64FFDA', fontSize: 9, fontWeight: '900', marginLeft: 4 },
    heroCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(100,255,218,0.1)' },
    heroGradient: { padding: 20 },
    heroLabel: { color: '#8892B0', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
    scoreNumber: { color: '#fff', fontSize: 48, fontWeight: '200' },
    scoreMeta: { marginLeft: 12 },
    scoreUnit: { color: '#8892B0', fontSize: 16, fontWeight: '400' },
    riskStatus: { color: '#64FFDA', fontSize: 11, fontWeight: '800', marginTop: -4 },
    divider: { height: 1, backgroundColor: 'rgba(136, 146, 176, 0.1)', marginVertical: 15 },
    statsFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    footerItem: { flex: 1 },
    footerLabel: { color: '#8892B0', fontSize: 8, fontWeight: '700', marginBottom: 3 },
    footerValue: { color: '#ccd6f6', fontSize: 12, fontWeight: '800' },
    earthContainer: { height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    earthWebView: { width: width, height: 220, backgroundColor: 'transparent' },
    notifyButton: { marginRight: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    notifyBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444', borderWidth: 1, borderColor: '#020c1b' },
    sectionTitle: { color: '#ccd6f6', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    moduleCard: {
        width: (width - 65) / 2,
        backgroundColor: 'rgba(17, 34, 64, 0.6)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(100, 255, 218, 0.05)',
        flexDirection: 'row',
        alignItems: 'center'
    },
    moduleTitle: { color: '#e6f1ff', fontSize: 11, fontWeight: '600', marginLeft: 8, flex: 1 },
});