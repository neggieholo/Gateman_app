import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function AuthLayout() {
  return (
    <SafeAreaProvider>
        <Stack>
          {/* Login screen */}
          <Stack.Screen
            name="index"           // maps to app/index.tsx
            options={{
              title: "Login", // custom title
              headerShown: false,    // hide the header
            }}
          />

          {/* Register screen */}
          <Stack.Screen
            name="register"
            options={{
              title: "Register",
              headerShown: false,
            }}
          />
        </Stack>
    </SafeAreaProvider>
  );
}
