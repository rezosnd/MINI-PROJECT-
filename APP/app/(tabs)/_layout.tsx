import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#64FFDA';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#020c1b',
          borderTopColor: 'rgba(100,255,218,0.1)',
          height: Platform.OS === 'ios' ? 88 : 68,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      
      {/* 1. MAIN TERMINAL (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={24} name="view-dashboard" color={color} />,
        }}
      />

      {/* 2. FIELD SCANNER */}
      <Tabs.Screen
        name="ScannerScreen"
        options={{
          title: 'Signal Sweep',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={24} name="radar" color={color} />,
        }}
      />

      {/* 3. INSIGHTS DASHBOARD */}
      <Tabs.Screen
        name="DashboardScreen"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={24} name="chart-line" color={color} />,
        }}
      />

      {/* 4. EMERGENCY / SOS */}
      <Tabs.Screen
        name="EmergencyScreen"
        options={{
          title: 'Emergency',
          tabBarActiveTintColor: '#FF3B30',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={24} name="alert-circle" color={color} />,
        }}
      />
    </Tabs>
  );
}