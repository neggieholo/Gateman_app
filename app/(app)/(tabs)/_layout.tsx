import { useUser } from "@/app/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useMemo } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const handleDisabledTabPress = (e: any, moduleName: string) => {
    e.preventDefault();
    Alert.alert(
      "Module Locked",
      `The ${moduleName} module is not included in your estate's active plan.`
    );
  };

export default function TenantTabsLayout() {
  const { user, contextEstateId } = useUser();
  const estates = useMemo(() => user?.estates || [], [user?.estates]);

  const activeEstate = useMemo(() => {
    return (
      estates.find((e: any) => e.id === contextEstateId) || estates[0] || null
    );
  }, [estates, contextEstateId]);

  const isModuleEnabled = (moduleKey: string): boolean => {
    if (!activeEstate?.plan) return false;
    if (activeEstate.plan.is_trial) return true;
    return activeEstate.plan.selected_add_ons?.includes(moduleKey) ?? false;
  };


  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: "#f9fafb" },
          headerTitleAlign: "center",
          tabBarStyle: { backgroundColor: "#0A1F44" },
          tabBarActiveTintColor: "#BFDBFE",
          tabBarInactiveTintColor: "#D4AF37",
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="community"
          listeners={{
            tabPress: (e) => {
              if (!isModuleEnabled("community")) {
                handleDisabledTabPress(e, "Community");
              }
            },
          }}
          options={{
            title: "Community",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="list"
                size={size}
                color={isModuleEnabled("community") ? color : "#64748B"}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="guests"
          listeners={{
            tabPress: (e) => {
              if (!isModuleEnabled("security")) {
                handleDisabledTabPress(e, "Guests");
              }
            },
          }}
          options={{
            title: "Guests",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="people"
                size={size}
                color={isModuleEnabled("security") ? color : "#64748B"}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="bookings"
          listeners={{
            tabPress: (e) => {
              if (!isModuleEnabled("facility_bookings")) {
                handleDisabledTabPress(e, "Bookings");
              }
            },
          }}
          options={{
            title: "Bookings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="calendar"
                size={size}
                color={isModuleEnabled("facility_bookings") ? color : "#64748B"}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="services"
          options={{
            title: "Services",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="grid"
                size={size}
                color={isModuleEnabled("services_dispatch") ? color : "#64748B"}
              />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}