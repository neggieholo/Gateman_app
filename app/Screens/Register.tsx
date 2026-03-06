import React, { useState, useContext } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../components/Button";
import { FormInput } from "../components/FormInput";
import { postRegister } from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserContext } from "../UserContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser } = useContext(UserContext);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          {/* Logo + App Name */}
          <View className="w-full flex-row justify-center items-center mt-12 mb-4">
            <Image
              source={require("../../assets/images/gateman.png")}
              className="w-12 h-12"
              resizeMode="contain"
            />
            <Text className="text-4xl font-bold text-white ml-2">
              Gateman
            </Text>
          </View>

          {/* Form */}
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

              {error ? <Text className="text-red-500 mb-2">{error}</Text> : null}

              <Button
                title={loading ? "Registering..." : "Register"}
                onPress={handleRegister}
                disabled={loading}
              />

              <View className="flex-row justify-center mt-4">
                <Text>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace("/")}>
                  <Text className="text-blue-500 font-bold">Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
