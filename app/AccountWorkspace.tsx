import { router } from "expo-router";
import {
    Building,
    MapPin,
    Plus,
    ShieldAlert,
    UserCheck,
    UserPlus,
    Users
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "./UserContext";
import { Estate, User } from "./services/interfaces";

type WorkspaceTab = "estates" | "users";

export default function AccountWorkspace() {
  const { isDarkMode } = useUser();
  const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}/api`;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("estates");
  const [loading, setLoading] = useState<boolean>(true);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [subUsers, setSubUsers] = useState<Partial<User>[]>([]);

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      try {
        const res = await fetch(`${BASE_URL}/resident/accounts-details`);
        const data = await res.json();
        if (data.success) {
          setEstates(data.estates || []);
          setSubUsers(data.subUsers || []);
        }
      } catch (err) {
        console.error("Error loading workspace lists:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceDetails();
  }, []);

  if (loading) {
    return (
      <View
        className={`flex-1 justify-center items-center ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {/* 2. TAB CONTROL ELEMENT BLOCK */}
      <View className="flex-row px-2 gap-x-2">
        <TouchableOpacity
          onPress={() => setActiveTab("estates")}
          className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-x-2 border ${
            activeTab === "estates"
              ? isDarkMode
                ? "bg-gm-gold border-gm-gold"
                : "bg-indigo-600 border-transparent"
              : isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-white border-slate-200"
          }`}
        >
          <Building
            size={16}
            color={
              activeTab === "estates"
                ? isDarkMode
                  ? "#0A1F44"
                  : "white"
                : "#94a3b8"
            }
          />
          <Text
            className={`font-bold text-sm ${
              activeTab === "estates"
                ? isDarkMode
                  ? "text-gm-navy"
                  : "text-white"
                : "text-slate-400"
            }`}
          >
            Estates ({estates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("users")}
          className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-x-2 border ${
            activeTab === "users"
              ? isDarkMode
                ? "bg-gm-gold border-gm-gold"
                : "bg-indigo-600 border-transparent"
              : isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-white border-slate-200"
          }`}
        >
          <Users
            size={16}
            color={
              activeTab === "users"
                ? isDarkMode
                  ? "#0A1F44"
                  : "white"
                : "#94a3b8"
            }
          />
          <Text
            className={`font-bold text-sm ${
              activeTab === "users"
                ? isDarkMode
                  ? "text-gm-navy"
                  : "text-white"
                : "text-slate-400"
            }`}
          >
            Co-occupants ({subUsers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. CONDITIONAL DATA PRESENTATION CONTAINER */}
      {activeTab === "estates" ? (
        <FlatList
          data={estates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View
              className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${
                isDarkMode
                  ? "bg-gm-navy border-slate-900"
                  : "bg-white border-slate-100"
              }`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className={`p-3 rounded-xl ${isDarkMode ? "bg-gm-charcoal" : "bg-indigo-50"}`}
                >
                  <MapPin
                    size={20}
                    color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-xs text-slate-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {item.address}
                    {item.town ? `, ${item.town}` : ""}, {item.state}
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                <Text className="text-emerald-700 text-[10px] font-bold uppercase">
                  Linked
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <ShieldAlert size={40} color="#94a3b8" />
              <Text className="text-slate-400 text-sm mt-2">
                No connected estate records found.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={subUsers}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View
              className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${
                isDarkMode
                  ? "bg-gm-navy border-slate-900"
                  : "bg-white border-slate-100"
              }`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className={`p-3 rounded-xl ${isDarkMode ? "bg-gm-charcoal" : "bg-emerald-50"}`}
                >
                  <UserCheck
                    size={20}
                    color={isDarkMode ? "#6EE7B7" : "#10b981"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-xs text-slate-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {item.email || item.phone}
                  </Text>
                </View>
              </View>
              <View className="bg-indigo-50 px-2.5 py-1 rounded-md">
                <Text className="text-indigo-600 text-[10px] font-bold uppercase">
                  {item.role || "SUB_USER"}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Users size={40} color="#94a3b8" />
              <Text className="text-slate-400 text-sm mt-2">
                No co-occupants registered inside this house block.
              </Text>
            </View>
          }
        />
      )}

      {/* 4. BASEMENT PERSISTENT NAVIGATION BUTTON ACTIONS */}
      <View className="p-4 bg-transparent">
        {activeTab === "estates" ? (
          <TouchableOpacity
            onPress={() => router.push("/JoinRequest" as any)}
            className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-x-2 ${
              isDarkMode
                ? "bg-gm-charcoal border border-gm-gold"
                : "bg-indigo-600"
            }`}
          >
            <Plus size={18} color={isDarkMode ? "#D4AF37" : "white"} />
            <TouchableOpacity
              onPress={() => router.push("/JoinRequest" as any)}
            >
              <Text
                className={`font-bold text-base ${isDarkMode ? "text-gm-gold" : "text-white"}`}
              >
                Join New Estate
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/AddHouseholdUser" as any)}
            className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-x-2 ${
              isDarkMode
                ? "bg-gm-charcoal border border-gm-gold"
                : "bg-emerald-600"
            }`}
          >
            <UserPlus size={18} color={isDarkMode ? "#D4AF37" : "white"} />
            <Text
              className={`font-bold text-base ${isDarkMode ? "text-gm-gold" : "text-white"}`}
            >
              Add Co-occupant User
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
