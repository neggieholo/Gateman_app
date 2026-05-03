import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { changePassword } from "./services/api";
import { useUser } from "./UserContext";

export default function ChangePasswordScreen() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleUpdate = async () => {
    if (form.newPassword !== form.confirmPassword) {
      console.log("Passwords:", form.newPassword, form.confirmPassword);
      return Alert.alert("Error", "New passwords do not match");
    }

    if (form.newPassword.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const role = user?.isTemp ? "temp_tenant" : "tenant";
      const data = await changePassword(
        form.currentPassword,
        form.newPassword,
        role,
      );

      if (data.success) {
        Alert.alert("Success", "Password updated successfully");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        Alert.alert("Failed", data.message || "Could not update password");
      }
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-between pb-6">
          {/* Input Section */}
          <View className="flex-none">
            {/* Current Password */}
            <View className="mb-6">
              <Text className="text-slate-900 text-sm font-black uppercase tracking-tight mb-3">
                Current Password
              </Text>
              <TextInput
                className="bg-slate-100 border border-slate-300 p-5 rounded-2xl text-slate-900 font-bold"
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#64748b" // slate-500 for darker visibility
                value={form.currentPassword}
                onChangeText={(txt) =>
                  setForm({ ...form, currentPassword: txt })
                }
              />
            </View>

            {/* New Password */}
            <View className="mb-6">
              <Text className="text-slate-900 text-sm font-black uppercase tracking-tight mb-3">
                New Password
              </Text>
              <TextInput
                className="bg-slate-100 border border-slate-300 p-5 rounded-2xl text-slate-900 font-bold"
                secureTextEntry
                placeholder="New password (min 6 chars)"
                placeholderTextColor="#64748b"
                value={form.newPassword}
                onChangeText={(txt) => setForm({ ...form, newPassword: txt })}
              />
            </View>

            {/* Confirm Password */}
            <View className="mb-6">
              <Text className="text-slate-900 text-sm font-black uppercase tracking-tight mb-3">
                Confirm New Password
              </Text>
              <TextInput
                className="bg-slate-100 border border-slate-300 p-5 rounded-2xl text-slate-900 font-bold"
                secureTextEntry
                placeholder="Repeat new password"
                placeholderTextColor="#64748b"
                value={form.confirmPassword}
                onChangeText={(txt) =>
                  setForm({ ...form, confirmPassword: txt })
                }
              />
            </View>
          </View>

          {/* Bottom Section */}
          <View className="mb-8">
            <TouchableOpacity
              activeOpacity={0.8}
              className={`h-20 rounded-[2.5rem] flex-row items-center justify-center shadow-2xl shadow-indigo-200 ${loading ? "bg-indigo-400" : "bg-indigo-600"}`}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-black text-sm uppercase tracking-[0.25em]">
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
