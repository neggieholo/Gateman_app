import CookieManager from "@react-native-cookies/cookies";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { FormInput } from "../components/FormInput";
import registerForPushNotificationsAsync, { postLogin, postRegister } from "../services/api";
import { UserContext } from "../UserContext";

export default function LoginScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const { setUser, setSessionId, setPushToken } = useContext(UserContext);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    console.log("Login details:", email, password);
    try {

      try {
        const pushTokenResponse = await registerForPushNotificationsAsync();
        if (pushTokenResponse) {
          console.log("📱 Push token obtained:", pushTokenResponse);
          setPushToken(pushTokenResponse);
        }
      } catch (pushErr) {
        console.warn("Push token failed, continuing login:", pushErr);
      }


      await CookieManager.clearAll();
      console.log("🧹 Cookie Jar Wiped!");
      const response = await postLogin(email, password);
      if (response.success) {
        const cookies = await CookieManager.get("http://192.168.100.17:3003");
        console.log("🍪 Captured Cookies:", cookies);

        if (cookies["gateman.sid"]) {
          console.log("✅ gateman.sid found in Cookie Jar!");
        } else {
          console.warn(
            "⚠️ Login success but gateman.sid missing from manager.",
          );
        }
        setUser(response.user);
        console.log("Login successful, session ID:", response.sessionId);
        setSessionId?.(response.sessionId);
        router.replace("/dashboard");
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await postRegister(name, email, password);
      if (response.success) {
        // Save user in context
        setUser(response.user);

        // Optionally navigate to dashboard or show pending message
        router.replace("/dashboard");
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <ImageBackground
        source={require("../../assets/images/gateman_bgimage.png")}
        className="flex-1"
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 px-6"
        >

          <View className="w-full flex-row justify-center items-center mt-12 px-4 rounded-lg">
            <Image
              source={require("../../assets/images/gateman_w_nobg_cropped.png")}
              style={{
                width: "100%",
                height: 120,
              }}
              resizeMode="contain"
            />
          </View>

          {isLogin && (
            <View className="flex-1 justify-center">
              <View className="bg-white/70 rounded-md p-6">
                <Text className="text-3xl font-bold mb-6 text-center text-black">
                  {isLogin ? "Login" : "Register"}
                </Text>

                <FormInput
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <FormInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <Text className="text-md font-bold text-blue-500 m-2">
                  Forgot Password?
                </Text>

                {error ? (
                  <Text className="text-red-500 mb-2">{error}</Text>
                ) : null}

                <Button
                  title={loading ? "Logging in..." : "Login"}
                  onPress={handleLogin}
                  disabled={loading}
                />

                <View className="flex-row justify-center mt-4">
                  <Text>Don&apos;t have an account? </Text>
                  <TouchableOpacity onPress={() => setIsLogin(false)}>
                    <Text className="text-blue-500 font-bold">Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {!isLogin && (
            <View className="flex-1 justify-center">
              <View className="bg-white/70 rounded-md p-6">
                <Text className="text-3xl font-bold mb-6 text-center text-black">
                  Register
                </Text>

                <FormInput
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                />
                <FormInput
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <FormInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {error ? (
                  <Text className="text-red-500 mb-2">{error}</Text>
                ) : null}

                <Button
                  title={loading ? "Registering..." : "Register"}
                  onPress={handleRegister}
                  disabled={loading}
                />

                <View className="flex-row justify-center mt-4">
                  <Text>Already have an account? </Text>
                  <TouchableOpacity onPress={() => setIsLogin(true)}>
                    <Text className="text-blue-500 font-bold">Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
