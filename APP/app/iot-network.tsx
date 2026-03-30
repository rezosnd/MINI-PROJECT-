import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { useWindowDimensions, ImageBackground, ScrollView, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Alert } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function IoTNetworkDemo() {
  const { width } = useWindowDimensions();
  const isSmall = width < 760;
  const chartWidth = Math.max(300, Math.min(width - 50, 900));
  const [sensors, setSensors] = useState<any[]>([]);
  const [host, setHost] = useState('');
  const [connectedHost, setConnectedHost] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [mlCurrent, setMlCurrent] = useState<any | null>(null);
  const [mlHistory, setMlHistory] = useState<any[]>([]);
  const [arduinoPort, setArduinoPort] = useState('COM7');
  const [monitorDuration, setMonitorDuration] = useState('120');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'temperature'|'humidity'|'precipitation'>('temperature');
  const [reconnecting, setReconnecting] = useState(false);

  // no demo seeding — data comes from ML server only
  useEffect(() => {}, []);

  async function fetchFromHost(base: string) {
    // normalize
    let url = base;
    if (!/^https?:\/\//.test(url)) url = `http://${url}`;
    const tries = ['/sensors', '/data', '/api/sensors', '/api/data', '/'];
    for (const p of tries) {
      try {
        const res = await fetch(`${url.replace(/\/$/, '')}${p}`);
        if (!res.ok) continue;
        const json = await res.json();
        // accept an array or an object containing array
        // If server returns the ML app format with `current` and `history`, return it directly
        if (json && typeof json === 'object' && (json.current || json.history)) return json;
        if (Array.isArray(json)) return json;
        if (json && Array.isArray(json.sensors)) return json.sensors;
        // if root returns object with numeric keys, convert
        if (json && typeof json === 'object') {
          const values = Object.values(json).filter((v: any) => v && (v.value || v.val || v.reading || v.temperature || v.temp));
          if (values.length) return values as any[];
        }
      } catch (err) {
        // ignore and try next
      }
    }
    throw new Error('No usable endpoint found');
  }

  async function connect() {
    if (!host) return Alert.alert('Enter host', 'Please enter an IP:PORT (for example 192.168.0.12:5000)');
    setConnecting(true);
    try {
      const data = await fetchFromHost(host);
      // ML app returns { current: { ... }, history: [...] }
      if (data && typeof data === 'object' && data.current) {
        setMlCurrent(data.current);
        setMlHistory(Array.isArray(data.history) ? data.history : []);
        setConnectedHost(host);
        // clear demo sensors when connected
        setSensors([]);
        // set monitoring state if provided
        setMonitoringActive(Boolean(data.current.monitoring && data.current.monitoring.active));
        if (data.current.monitoring && data.current.monitoring.session_id) setSessionId(data.current.monitoring.session_id);
      } else if (Array.isArray(data) && data.length) {
        setSensors(data.map((d: any, i: number) => ({ id: d.id ?? i, name: d.name ?? d.sensor ?? `Sensor ${i+1}`, value: (d.value ?? d.val ?? d.reading ?? d.temperature ?? 0).toString(), unit: d.unit ?? (d.temp || d.temperature ? '°C' : ''), status: d.status ?? 'active' })));
        setConnectedHost(host);
        setMlCurrent(null);
        setMlHistory([]);
      } else {
        Alert.alert('No data', 'Connected host did not return expected sensor data.');
      }
    } catch (err: any) {
      Alert.alert('Connection failed', err?.message ?? String(err));
    } finally {
      setConnecting(false);
    }
  }

  // Poll `/data` every 2.5s when connected to ML host
  useEffect(() => {
    if (!connectedHost) return;
    let mounted = true;
    const iv = setInterval(async () => {
      try {
        const d = await fetchFromHost(connectedHost);
        if (!mounted) return;
        if (d && typeof d === 'object' && d.current) {
          setMlCurrent(d.current);
          setMlHistory(Array.isArray(d.history) ? d.history : []);
          setMonitoringActive(Boolean(d.current.monitoring && d.current.monitoring.active));
          if (d.current.monitoring && d.current.monitoring.session_id) setSessionId(d.current.monitoring.session_id);
        }
      } catch (e) {
        // silent
      }
    }, 2500);
    return () => { mounted = false; clearInterval(iv); };
  }, [connectedHost]);

  // helper: prepare chart data from mlHistory
  function chartDataFor(field: string) {
    const hist = mlHistory || [];
    if (!hist.length) return null;
    // take last up to 12 points
    const slice = hist.slice(-12);
    // create compact x-axis labels to avoid overlap (show ~4 labels)
    const rawLabels = slice.map((s: any) => (s.timestamp ?? '').toString());
    const step = Math.max(1, Math.ceil(rawLabels.length / 4));
    const labels = rawLabels.map((lab: string, i: number) => {
      if (!lab) return '';
      // try ISO time shorthand
      const t = String(lab);
      const parts = t.split('T');
      let short = parts.length > 1 ? parts[1].slice(0,5) : t.slice(-8,-3);
      return (i % step === 0) ? short : '';
    });
    const data = slice.map((s: any) => {
      const v = s[field];
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    });
    return { labels, datasets: [{ data }] };
  }

  async function reconnect(attempts = 3) {
    if (!host) return Alert.alert('No host', 'Enter IP:PORT to reconnect');
    setReconnecting(true);
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        await connect();
        setReconnecting(false);
        return;
      } catch (e) {
        lastErr = e;
        // backoff
        await new Promise(r => setTimeout(r, 1000 + i*500));
      }
    }
    setReconnecting(false);
    Alert.alert('Reconnect failed', lastErr?.message ?? 'Unable to reconnect');
  }

  function analyticsSummary() {
    const hist = mlHistory || [];
    if (!hist.length) return null;
    const slice = hist.slice(-12);
    const nums = (k: string) => slice.map((s: any) => parseFloat(String(s[k] ?? 0))).filter(n => !Number.isNaN(n));
    const temp = nums('temperature');
    const hum = nums('humidity');
    const precip = nums('precipitation');
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    return {
      avgTemp: avg(temp).toFixed(1), minTemp: (Math.min(...(temp.length?temp:[0]))).toFixed(1), maxTemp: (Math.max(...(temp.length?temp:[0]))).toFixed(1),
      avgHum: avg(hum).toFixed(1),
      avgPrecip: avg(precip).toFixed(1),
      willRain: String(mlCurrent?.forecast_2hr ?? '').toLowerCase().includes('rain') || (avg(precip) > 20)
    };
  }

  function aiInsights() {
    if (!mlCurrent) return ['No connection to ML server'];
    const out: string[] = [];
    const conf = mlCurrent.confidence ?? 0;
    out.push(`Model: ${mlCurrent.prediction ?? 'Unknown'} — ${conf}% confidence.`);

    // Pressure trend
    if (mlHistory && mlHistory.length > 1) {
      const last = mlHistory[mlHistory.length - 1];
      const prev = mlHistory[mlHistory.length - 2];
      if (last.pressure != null && prev.pressure != null) {
        if (last.pressure < prev.pressure) out.push('Pressure falling — increased chance of precipitation.');
        else if (last.pressure > prev.pressure) out.push('Pressure rising — conditions stabilizing.');
        else out.push('Pressure steady.');
      }
    }

    // Humidity
    if (mlCurrent.humidity != null) {
      if (mlCurrent.humidity >= 85) out.push('Very high humidity — fog or rain likely.');
      else if (mlCurrent.humidity >= 65) out.push('High humidity — monitor precipitation.');
    }

    // Temperature extremes
    if (mlCurrent.temperature != null) {
      if (mlCurrent.temperature >= 35) out.push('High temperature — heat precautions advised.');
      else if (mlCurrent.temperature <= 0) out.push('Low temperature — freezing conditions possible.');
    }

    // Precipitation trend
    if (mlHistory && mlHistory.length > 1) {
      const last = mlHistory[mlHistory.length - 1];
      const prev = mlHistory[mlHistory.length - 2];
      if ((last.precipitation ?? 0) > (prev.precipitation ?? 0)) out.push('Precipitation is increasing compared to previous sample.');
    }

    // UV warning
    if (mlCurrent.uv_index != null && mlCurrent.uv_index >= 8) out.push('High UV index — wear protection.');

    // Forecast text
    const f = String(mlCurrent.forecast_2hr || '').toLowerCase();
    if (f.includes('rain')) out.push('Forecast: rain expected within 2 hours.');
    else if (f) out.push(`Forecast: ${mlCurrent.forecast_2hr}`);

    // Recommendation
    const summary = analyticsSummary();
    if (summary && summary.willRain) out.push('Recommendation: Take precautions — rain likely.');
    else out.push('Recommendation: No immediate rain predicted.');

    return out;
  }

  async function startMonitoring() {
    if (!connectedHost) return Alert.alert('Not connected', 'Connect to ML host first');
    try {
      const res = await fetch(`${connectedHost.startsWith('http') ? connectedHost : 'http://' + connectedHost}/start_monitoring`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: arduinoPort, duration: parseInt(monitorDuration || '60', 10) })
      });
      const json = await res.json();
      setMonitoringActive(true);
      // server will include session info in /data; keep session id until updated
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    }
  }

  async function stopMonitoring() {
    if (!connectedHost) return Alert.alert('Not connected', 'Connect to ML host first');
    try {
      await fetch(`${connectedHost.startsWith('http') ? connectedHost : 'http://' + connectedHost}/stop_monitoring`, { method: 'POST' });
      setMonitoringActive(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    }
  }

  return (
    <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072' }} style={{ flex: 1 }} blurRadius={100}>
      <LinearGradient colors={[ 'rgba(2,12,27,0.7)', 'rgba(2,12,27,1)' ]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 25, paddingTop: 50 }}>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ color: '#8892B0', fontSize: 13, fontStyle: 'italic' }}>IoT Network</Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: isSmall ? 'column' : 'row', alignItems: isSmall ? 'stretch' : 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <MaterialCommunityIcons name="server-network" size={34} color="#64FFDA" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ccd6f6', fontWeight: '800' }}>ML Host</Text>
                  <TextInput
                    value={host}
                    onChangeText={setHost}
                    placeholder="Enter IP:PORT — e.g. 192.168.0.12:5000"
                    placeholderTextColor="#586a84"
                    style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', padding: 10, borderRadius: 8 }}
                  />
                  <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>Connect to your ML server running on the same network.</Text>
                </View>
              </View>

              <View style={{ marginTop: isSmall ? 12 : 0, marginLeft: isSmall ? 0 : 12, alignItems: isSmall ? 'flex-start' : 'flex-end' }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => connectedHost ? reconnect() : connect()} style={{ backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' }}>
                    {connecting || reconnecting ? <ActivityIndicator color="#02202a" /> : <Text style={{ color: '#02202a', fontWeight: '800' }}>{connectedHost ? 'Reconnect' : 'Connect'}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setConnectedHost(null); setHost(''); setMlCurrent(null); setMlHistory([]); setMonitoringActive(false); setSessionId(null); }} style={{ backgroundColor: 'transparent', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                    <Text style={{ color: '#ccd6f6' }}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 10, alignItems: isSmall ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>Status</Text>
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: connectedHost ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                      <Text style={{ color: connectedHost ? '#4ade80' : '#94a3b8', fontWeight: '800' }}>{monitoringActive ? 'RUNNING' : (connectedHost ? 'CONNECTED' : 'DISCONNECTED')}</Text>
                    </View>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{mlCurrent?.timestamp ? `Last: ${mlCurrent.timestamp}` : ''}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Primary actions: Connect / Start / Stop */}
          <View style={{ flexDirection: isSmall ? 'column' : 'row', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity onPress={() => connectedHost ? reconnect() : connect()} style={{ flex: 1, backgroundColor: '#2563eb', padding: 12, borderRadius: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{connectedHost ? 'Reconnect' : 'Connect'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={startMonitoring} style={{ flex: 1, backgroundColor: 'transparent', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Text style={{ color: '#ccd6f6', fontWeight: '800' }}>Start Monitoring</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={stopMonitoring} style={{ flex: 1, backgroundColor: 'transparent', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Text style={{ color: '#ccd6f6', fontWeight: '800' }}>Stop Monitoring</Text>
                  </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ccd6f6', fontSize: 20, fontWeight: '800' }}>IOT NETWORK</Text>
              <Text style={{ color: '#64FFDA', marginTop: 6 }}>{connectedHost ? `Connected: ${connectedHost}` : 'Simulated sensor telemetry'}</Text>
            </View>
            <MaterialCommunityIcons name="access-point-network" size={34} color="#64FFDA" />
          </View>

          {/* TOP CARDS: Current prediction + 2-hour forecast + Engine controls (simplified) */}
          <View style={{ flexDirection: isSmall ? 'column' : 'row', marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.08)', marginBottom: isSmall ? 10 : 0 }}>
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>Current Classification</Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 8 }}>{mlCurrent?.prediction ?? '—'}</Text>
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#475569', fontSize: 11 }}>Timeline</Text>
                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, marginTop: 6 }}>
                  <View style={{ height: 6, width: `${Math.min(100, mlCurrent?.confidence ?? 0)}%`, backgroundColor: '#3b82f6', borderRadius: 6 }} />
                </View>
              </View>
            </View>

            <View style={{ width: isSmall ? '100%' : 220, backgroundColor: 'rgba(129,140,248,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(129,140,248,0.08)', marginBottom: isSmall ? 10 : 0 }}>
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>2-Hour Forecast</Text>
              <Text style={{ color: '#818cf8', fontSize: 20, fontWeight: '900', marginTop: 8 }}>{mlCurrent?.forecast_2hr ?? '—'}</Text>
              <Text style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>Conf: {mlCurrent?.confidence ?? '--'}%</Text>
            </View>

            <View style={{ width: isSmall ? '100%' : 260, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: isSmall ? 0 : 0 }}>
              <Text style={{ color: '#818cf8', fontSize: 12, fontWeight: '700' }}>Engine Controls</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                <TextInput value={arduinoPort} onChangeText={setArduinoPort} placeholder="COM7" placeholderTextColor="#586a84" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', padding: 8, borderRadius: 8 }} />
                <TextInput value={monitorDuration} onChangeText={setMonitorDuration} placeholder="Minutes" placeholderTextColor="#586a84" keyboardType="numeric" style={{ width: 90, backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', padding: 8, borderRadius: 8 }} />
              </View>
              <Text style={{ color: '#94a3b8', marginTop: 8 }}>Session: {sessionId ?? '--'}</Text>
            </View>
          </View>

          <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(100,255,218,0.08)', padding: 12 }}>
            <Text style={{ color: '#8892B0', fontWeight: '800', marginBottom: 12 }}>{mlCurrent ? 'Live ML Sensors' : 'Live Sensors'}</Text>
            {mlCurrent ? (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <View>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Temperature</Text>
                    <Text style={{ color: '#8892B0', marginTop: 6 }}>{mlCurrent.temperature ?? '—'} °C</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Humidity</Text>
                    <Text style={{ color: '#64FFDA', fontWeight: '900', fontSize: 18 }}>{mlCurrent.humidity ?? '—'} %</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(100,255,218,0.03)' }}>
                  <View>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Precipitation</Text>
                    <Text style={{ color: '#8892B0', marginTop: 6 }}>{mlCurrent.precipitation ?? '—'} %</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>UV Index</Text>
                    <Text style={{ color: '#64FFDA', fontWeight: '900', fontSize: 18 }}>{mlCurrent.uv_index ?? '—'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(100,255,218,0.03)' }}>
                  <View>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Pressure</Text>
                    <Text style={{ color: '#8892B0', marginTop: 6 }}>{mlCurrent.pressure ?? '—'} hPa</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Timestamp</Text>
                    <Text style={{ color: '#64FFDA', fontWeight: '700' }}>{mlCurrent.timestamp ?? '—'}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(100,255,218,0.03)' }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Prediction</Text>
                  <Text style={{ color: '#64FFDA', fontWeight: '900', fontSize: 18, marginTop: 6 }}>{mlCurrent.prediction ?? '—'}</Text>
                  <Text style={{ color: '#8892B0', marginTop: 6 }}>2-hour forecast: {mlCurrent.forecast_2hr ?? '—'}</Text>
                  <Text style={{ color: '#8892B0', marginTop: 6 }}>Confidence: {mlCurrent.confidence ?? '—'}%</Text>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <Text style={{ color: '#8892B0' }}>No live data. Connect to your ML host to display sensor telemetry and analytics.</Text>
              </View>
            )}
          </View>

          {/* SENSOR GRID (5 cards) */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#8892B0', fontWeight: '800' }}>Sensors</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#475569', marginRight: 8 }}>Status</Text>
                <View style={{ backgroundColor: monitoringActive ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ color: monitoringActive ? '#4ade80' : '#94a3b8', fontWeight: '800' }}>{monitoringActive ? 'RUNNING' : 'STANDBY'}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              {/* Temp */}
              <View style={{ width: isSmall ? '100%' : '19%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: isSmall ? 10 : 0 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>Temperature</Text>
                <Text style={{ color: '#fb923c', fontSize: 20, fontWeight: '900', marginTop: 8 }}>{mlCurrent ? (mlCurrent.temperature ?? '--') : (sensors[0]?.value ?? '--')}</Text>
                <Text style={{ color: '#64748b', marginTop: 6 }}>DHT22 Sensor</Text>
              </View>

              {/* Humidity */}
              <View style={{ width: isSmall ? '100%' : '19%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: isSmall ? 10 : 0 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>Humidity</Text>
                <Text style={{ color: '#38bdf8', fontSize: 20, fontWeight: '900', marginTop: 8 }}>{mlCurrent ? (mlCurrent.humidity ?? '--') : (sensors[1]?.value ?? '--')}</Text>
                <Text style={{ color: '#64748b', marginTop: 6 }}>Relative Humidity</Text>
              </View>

              {/* Pressure */}
              <View style={{ width: isSmall ? '100%' : '19%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: isSmall ? 10 : 0 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>Atm. Pressure</Text>
                <Text style={{ color: '#818cf8', fontSize: 20, fontWeight: '900', marginTop: 8 }}>{mlCurrent ? (mlCurrent.pressure ?? '--') : '--'}</Text>
                <Text style={{ color: '#64748b', marginTop: 6 }}>Trend: {mlHistory && mlHistory.length > 1 ? (() => {
                    const last = mlHistory[mlHistory.length-1];
                    const prev = mlHistory[mlHistory.length-2];
                    if (!last || !prev || last.pressure == null || prev.pressure == null) return '—';
                    return last.pressure > prev.pressure ? '↑' : (last.pressure < prev.pressure ? '↓' : '—');
                  })() : '—'}</Text>
              </View>

              {/* UV */}
              <View style={{ width: isSmall ? '100%' : '19%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: isSmall ? 10 : 0 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>UV Radiation</Text>
                <Text style={{ color: '#f59e0b', fontSize: 20, fontWeight: '900', marginTop: 8 }}>{mlCurrent ? (mlCurrent.uv_index ?? '--') : '--'}</Text>
                <Text style={{ color: '#64748b', marginTop: 6 }}>UVI</Text>
              </View>

              {/* Precipitation */}
              <View style={{ width: isSmall ? '100%' : '19%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: isSmall ? 10 : 0 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>Rainfall</Text>
                <Text style={{ color: '#22d3ee', fontSize: 20, fontWeight: '900', marginTop: 8 }}>{mlCurrent ? (mlCurrent.precipitation ?? '--') : (sensors[2]?.value ?? '--')}</Text>
                <Text style={{ color: '#64748b', marginTop: 6 }}>Precipitation</Text>
              </View>
            </View>
          </View>

          {/* CHARTS & ANALYTICS */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ color: '#8892B0', fontWeight: '800', marginBottom: 8 }}>Analytics (select metric)</Text>
            {/* Metric selector */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {['temperature','humidity','precipitation'].map(m => (
                <TouchableOpacity key={m} onPress={() => setSelectedMetric(m as any)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: selectedMetric===m ? '#3b82f6' : 'rgba(255,255,255,0.03)' }}>
                  <Text style={{ color: selectedMetric===m ? '#fff' : '#ccd6f6', fontWeight: '800', textTransform: 'capitalize' }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {mlHistory && mlHistory.length > 1 ? (
              <View>
                <LineChart
                  data={chartDataFor(selectedMetric)!}
                  width={chartWidth}
                  height={180}
                  chartConfig={{ backgroundColor: '#020617', backgroundGradientFrom: '#020617', backgroundGradientTo: '#020617', color: (opacity=1)=> (selectedMetric==='temperature'?`rgba(251,146,60,${opacity})`:(selectedMetric==='humidity'?`rgba(56,189,248,${opacity})`:`rgba(34,211,238,${opacity})`)), labelColor: (opacity=1)=>`rgba(204,214,246,${opacity})` }}
                  bezier
                  style={{ borderRadius: 12, marginBottom: 12 }}
                />

                {/* AI Insights (detailed bullets) */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>AI Insights</Text>
                  {aiInsights().map((line, idx) => (
                    <Text key={idx} style={{ color: '#8892B0', marginTop: 8 }}>• {line}</Text>
                  ))}
                </View>

                {/* Analytics summary */}
                {(() => {
                  const a = analyticsSummary();
                  if (!a) return null;
                  return (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: '#fff', fontWeight: '800' }}>Summary</Text>
                      <Text style={{ color: '#8892B0', marginTop: 6 }}>Temp — Avg: {a.avgTemp}°C, Min: {a.minTemp}°C, Max: {a.maxTemp}°C</Text>
                      <Text style={{ color: '#8892B0', marginTop: 6 }}>Humidity — Avg: {a.avgHum}%</Text>
                      <Text style={{ color: '#8892B0', marginTop: 6 }}>Precipitation — Avg: {a.avgPrecip}%</Text>
                      <Text style={{ color: a.willRain ? '#ef4444' : '#64FFDA', marginTop: 8, fontWeight: '900' }}>{a.willRain ? 'Rain likely in next 2 hours' : 'No rain predicted'}</Text>
                    </View>
                  );
                })()}
              </View>
            ) : (
              <Text style={{ color: '#8892B0' }}>Connect to ML host and wait a few samples to view charts.</Text>
            )}
          </View>

          {/* INSIGHTS BAR */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <MaterialCommunityIcons name="cpu-32-bit" size={18} color="#818cf8" />
                <Text style={{ color: '#818cf8', fontWeight: '700' }}>AI Insights</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#64748b' }}>Status</Text>
                <View style={{ backgroundColor: monitoringActive ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ color: monitoringActive ? '#4ade80' : '#94a3b8', fontWeight: '800' }}>{monitoringActive ? 'RUNNING' : 'STANDBY'}</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: 'rgba(59,130,246,0.08)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}>{/* pill */}
                <Text style={{ color: '#60a5fa', fontWeight: '700' }}>Analyzing atmospheric stability...</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(59,130,246,0.06)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}>
                <Text style={{ color: '#60a5fa', fontWeight: '700' }}>Pressure within normal range.</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}
