import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "./UserContext";
import { useEffect } from "react";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    "Montserrat-Bold": require("../assets/fonts/Montserrat-Bold.ttf"),
    "Montserrat-ExtraBold": require("../assets/fonts/Montserrat-ExtraBold.ttf"),
    "Oswald-SemiBold": require("../assets/fonts/Oswald-SemiBold.ttf"),
    "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ActionSheetProvider>
            <UserProvider>
              <StatusBar
                key={`global-status-${colorScheme}`}
                style={colorScheme === "dark" ? "light" : "dark"}
                backgroundColor="transparent"
                translucent={true}
              />
              <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: "#2563eb",
                  },
                  headerTintColor: "#ffffff",
                  headerTitleStyle: {
                    color: "#ffffff",
                    fontWeight: "bold",
                  },
                  headerTitleAlign: "center",
                }}
              >
                <Stack.Screen
                  name="(auth)"
                  options={{
                    title: "Auth",
                    headerShown: false,
                  }}
                />

                {/* Register screen */}
                <Stack.Screen
                  name="(app)"
                  options={{
                    title: "App",
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="JoinRequest"
                  options={{
                    title: "Join Estate",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="NotificationsPage"
                  options={{
                    title: "Notifications",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="ChatScreen"
                  options={{
                    title: "Messages",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="CallScreen"
                  options={{
                    title: "Call",
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="EmergencyAlertPage"
                  options={{
                    title: "Emergency Alerts",
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="SettingsScreen"
                  options={{
                    title: "Settings",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="SecurityPersonnels"
                  options={{
                    title: "Security Center",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="SubmitSecurityReport"
                  options={{
                    title: "Report",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="ResolutionCenter"
                  options={{
                    title: "Resolution Center",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="SecurityReportsHistory"
                  options={{
                    title: "Reports History",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="UtilityPayment"
                  options={{
                    title: "Utility & Dues",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="PaymentHistory"
                  options={{
                    title: "Payments History",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="EmergencyContactsPage"
                  options={{
                    title: "Emergency Contacts",
                    headerShown: true,
                  }}
                />

                <Stack.Screen
                  name="PurchasePage"
                  options={{
                    title: "Purchase",
                    headerShown: true,
                  }}
                />
              </Stack>
            </UserProvider>
          </ActionSheetProvider>
        </GestureHandlerRootView>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
