import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "./UserContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
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
            headerTitleAlign: 'center', 
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
        </Stack>
      </UserProvider>
    </SafeAreaProvider>
  );
}
