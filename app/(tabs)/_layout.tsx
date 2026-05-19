import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarStyle: { backgroundColor: '#052e16' }, tabBarActiveTintColor: '#22c55e', tabBarInactiveTintColor: '#6b7280', headerShown: false }}>
      <Tabs.Screen name='index' options={{ title: 'Bot', tabBarIcon: ({ color, size }) => <MaterialIcons name='smart-toy' size={size} color={color} /> }} />
    </Tabs>
  );
}