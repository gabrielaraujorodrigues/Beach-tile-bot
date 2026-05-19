import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bot",
          headerShown: false,
          tabBarIcon: ({ color }) => <Feather name="cpu" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
