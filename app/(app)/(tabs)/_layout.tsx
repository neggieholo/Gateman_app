import { Tabs } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function TenantTabsLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#2563EB",
          headerShown: false,
          headerStyle: { backgroundColor: "#f9fafb" },
          headerTitleAlign: "center",
        }}
      >
        {/* Dashboard is hidden */}
        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="guests"
          options={{
            title: "Guests",
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="invoices"
          options={{
            title: "Invoices",
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
