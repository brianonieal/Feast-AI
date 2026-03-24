// @version 0.5.0 - Echo: 4-tab bottom navigator (PANTHEON layout)
// Tabs: Home, Circle, Events, Library
// Profile lives in the TopBar avatar, NOT as a 5th tab
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FEAST_COLORS } from "@feast-ai/shared";

type TabIconProps = {
  color: string;
  size: number;
};

export default function TabLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: FEAST_COLORS.mustard,
        tabBarInactiveTintColor: FEAST_COLORS.inkLight,
        tabBarStyle: {
          backgroundColor: FEAST_COLORS.bgSurface,
          borderTopColor: FEAST_COLORS.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 0.3,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: "Circle",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
