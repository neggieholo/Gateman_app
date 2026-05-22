import {
  Ban,
  Calendar,
  Mail,
  Phone,
  ShieldCheck,
  UserMinus,
  X,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LocationPair, User } from "../services/interfaces";
import { useUser } from "../UserContext";

interface ProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: Partial<User> | null;
  openImageModal: (visible: boolean) => void;
  onBlockUser?: (userId: string) => void;
  onStartCall: (user: Partial<User>) => void;
  isOnline: boolean;
  selectedEstateId: string;
}

export default function UserProfileModal({
  isVisible,
  onClose,
  user,
  openImageModal,
  onBlockUser,
  onStartCall,
  isOnline,
  selectedEstateId,
}: ProfileProps) {
  const { isDarkMode } = useUser();
  if (!user) return null;

  const handleAppCall = () => {
    if (!isOnline) {
      Alert.alert(
        "Resident Offline",
        "This resident isn't connected to the app right now. You can try calling them later.",
      );
      return;
    }
    onStartCall(user);
  };

  const confirmBlock = () => {
    Alert.alert(
      "Block Resident",
      `Are you sure you want to block ${user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => onBlockUser?.(user.id?.toString() || ""),
        },
      ],
    );
  };

  const estateLocations: LocationPair[] =
    user.locations?.[selectedEstateId] || [];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className={`rounded-t-[40px] h-[85%] px-6 pt-8 shadow-2xl ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
        >
          {/* Close Handle & Button */}
          <View className="items-center mb-6">
            <View
              className={`w-12 h-1.5 rounded-full mb-4 ${isDarkMode ? "bg-slate-800" : "bg-gray-200"}`}
            />
            <TouchableOpacity
              onPress={onClose}
              className={`absolute right-0 top-0 p-2 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}
            >
              <X size={20} color={isDarkMode ? "#94a3b8" : "#666"} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header: Avatar & Status */}
            <View className="items-center mb-8">
              <View className="relative">
                <TouchableOpacity onPress={() => openImageModal(true)}>
                  <Image
                    source={{
                      uri: user.avatar || "https://via.placeholder.com/150",
                    }}
                    className={`w-32 h-32 rounded-full border-4 ${isDarkMode ? "border-slate-800" : "border-indigo-50"}`}
                  />
                </TouchableOpacity>
                <View
                  className={`absolute bottom-1 right-1 bg-green-500 p-2 rounded-full border-4 ${isDarkMode ? "border-slate-900" : "border-white"}`}
                >
                  <ShieldCheck size={18} color="white" />
                </View>
              </View>
              <Text
                className={`text-2xl font-black mt-4 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
              >
                {user.name}
              </Text>
            </View>

            {/* Stats Row */}
            <View
              className={`flex-row justify-between rounded-2xl p-4 mb-8 ${isDarkMode ? "bg-slate-950" : "bg-indigo-50"}`}
            >
              <View
                className={`items-center flex-1 border-r ${isDarkMode ? "border-slate-800" : "border-indigo-100"}`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-indigo-400"}`}
                >
                  Locations
                </Text>
                <View className="items-center mt-1 px-2 w-full">
                  {estateLocations.map((loc, idx) => (
                    <Text
                      key={`loc-p1-${idx}`}
                      numberOfLines={1}
                      className={`font-bold text-sm text-center ${isDarkMode ? "text-indigo-400" : "text-indigo-900"}`}
                    >
                      Blk {loc.block} • Unit {loc.unit?.join(", ") || "—"}
                    </Text>
                  ))}
                  {estateLocations.length === 0 && (
                    <Text
                      className={`font-bold text-lg ${isDarkMode ? "text-slate-600" : "text-gray-400"}`}
                    >
                      N/A
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Information List */}
            <View className="space-y-6">
              <View className="flex-row items-center mb-4">
                <View
                  className={`p-3 rounded-xl mr-4 ${isDarkMode ? "bg-slate-950" : "bg-gray-100"}`}
                >
                  <Mail size={20} color={isDarkMode ? "#818cf8" : "#4b5563"} />
                </View>
                <View>
                  <Text
                    className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    Email Address
                  </Text>
                  <Text
                    className={`font-semibold text-base ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}
                  >
                    {user.email}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View
                  className={`p-3 rounded-xl mr-4 ${isDarkMode ? "bg-slate-950" : "bg-gray-100"}`}
                >
                  <Calendar
                    size={20}
                    color={isDarkMode ? "#818cf8" : "#4b5563"}
                  />
                </View>
                <View>
                  <Text
                    className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    Member Since
                  </Text>
                  <Text
                    className={`font-semibold text-base ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}
                  >
                    Jan 2026
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-10 space-y-4">
              <TouchableOpacity
                onPress={handleAppCall}
                className={`py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${
                  isOnline
                    ? "bg-indigo-600 shadow-indigo-200"
                    : isDarkMode
                      ? "bg-slate-800 shadow-transparent"
                      : "bg-gray-400 shadow-transparent"
                }`}
              >
                <Phone
                  size={20}
                  color={
                    isOnline ? "white" : isDarkMode ? "#64748b" : "#9ca3af"
                  }
                />
                <Text
                  className={`font-bold text-lg ml-2 ${isOnline ? "text-white" : isDarkMode ? "text-slate-500" : "text-gray-200"}`}
                >
                  {isOnline ? "Start App Call" : "Resident Offline"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmBlock}
                className={`border py-4 rounded-2xl flex-row justify-center items-center mt-3 ${
                  isDarkMode ? "border-red-950/60" : "border-red-200"
                }`}
              >
                <Ban size={20} color="#ef4444" />
                <Text className="text-red-500 font-bold text-lg ml-2">
                  Block Resident
                </Text>
              </TouchableOpacity>
            </View>

            <View className="h-10" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface ParticipantProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: any;
  isOnline?: boolean;
  isAdminView: boolean;
  onRemoveUser: (id: string, name: string) => void;
  onStartCall: (user: any) => void;
}

export function GroupUserProfileModal({
  isVisible,
  onClose,
  user,
  isOnline,
  isAdminView,
  onRemoveUser,
  onStartCall,
}: ParticipantProfileProps) {
  const { isDarkMode } = useUser();
  if (!user) return null;

  const handleAppCall = () => {
    if (!isOnline) {
      Alert.alert(
        "Resident Offline",
        "This resident isn't connected to the app right now.",
      );
      return;
    }
    onStartCall(user);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className={`rounded-t-[40px] h-[85%] overflow-hidden ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
        >
          {/* Header Action Bar */}
          <View
            className={`flex-row justify-between items-center px-6 pt-6 pb-4 border-b ${
              isDarkMode
                ? "bg-slate-950 border-slate-800"
                : "bg-white border-gray-50"
            }`}
          >
            <TouchableOpacity
              onPress={onClose}
              className={`p-2 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}
            >
              <X size={24} color={isDarkMode ? "#f8fafc" : "#000"} />
            </TouchableOpacity>
            <Text
              className={`text-lg font-bold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}
            >
              Resident Profile
            </Text>
            <View className="w-10" />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="px-6">
            {/* Avatar Section */}
            <View className="items-center mt-4 mb-8">
              <View className="relative">
                <Image
                  source={{
                    uri: user.avatar || "https://via.placeholder.com/150",
                  }}
                  className={`w-32 h-32 rounded-full border-4 ${isDarkMode ? "border-slate-800" : "border-indigo-50"}`}
                />
                {isOnline && (
                  <View
                    className={`absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 ${
                      isDarkMode ? "border-slate-900" : "border-white"
                    }`}
                  />
                )}
              </View>
              <Text
                className={`text-2xl font-black mt-4 text-center ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
              >
                {user.name}
              </Text>
              <View
                className={`px-4 py-1.5 rounded-full mt-2 ${isDarkMode ? "bg-indigo-950/40" : "bg-indigo-50"}`}
              >
                <Text className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                  Verified Resident
                </Text>
              </View>
            </View>

            {/* Location Stats */}
            <View className="flex-row justify-between mb-8">
              <View
                className={`flex-1 rounded-2xl p-4 items-center mr-2 border ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <Text className="text-indigo-600 font-black text-xl">
                  {user.block || "—"}
                </Text>
                <Text
                  className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                >
                  Block
                </Text>
              </View>
              <View
                className={`flex-1 rounded-2xl p-4 items-center ml-2 border ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <Text className="text-indigo-600 font-black text-xl">
                  {user.unit || "—"}
                </Text>
                <Text
                  className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                >
                  Unit
                </Text>
              </View>
            </View>

            {/* Info Cards */}
            <View className="space-y-3">
              <View
                className={`flex-row items-center p-4 rounded-3xl border mb-3 ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <View
                  className={`p-2 rounded-xl shadow-sm ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
                >
                  <Mail size={20} color="#4f46e5" />
                </View>
                <View className="ml-4">
                  <Text
                    className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    Email Address
                  </Text>
                  <Text
                    className={`font-bold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}
                  >
                    {user.email || "Private"}
                  </Text>
                </View>
              </View>

              <View
                className={`flex-row items-center p-4 rounded-3xl border ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <View
                  className={`p-2 rounded-xl shadow-sm ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
                >
                  <Calendar size={20} color="#4f46e5" />
                </View>
                <View className="ml-4">
                  <Text
                    className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    Joined Estate
                  </Text>
                  <Text
                    className={`font-bold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}
                  >
                    January 2026
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-8 mb-10 space-y-3">
              <TouchableOpacity
                onPress={handleAppCall}
                className={`py-4 rounded-2xl flex-row justify-center items-center shadow-sm ${
                  isOnline
                    ? "bg-indigo-600"
                    : isDarkMode
                      ? "bg-slate-800"
                      : "bg-gray-300"
                }`}
              >
                <Phone
                  size={20}
                  color={
                    isOnline ? "white" : isDarkMode ? "#64748b" : "#9ca3af"
                  }
                />
                <Text
                  className={`font-bold text-lg ml-2 ${isOnline ? "text-white" : isDarkMode ? "text-slate-500" : "text-gray-200"}`}
                >
                  Voice Call
                </Text>
              </TouchableOpacity>

              {isAdminView && (
                <TouchableOpacity
                  onPress={() => onRemoveUser(user.id?.toString(), user.name)}
                  className={`py-4 rounded-2xl flex-row justify-center items-center border mt-3 ${
                    isDarkMode
                      ? "bg-red-950/20 border-red-950/60"
                      : "bg-red-50 border-red-100"
                  }`}
                >
                  <UserMinus size={20} color="#ef4444" />
                  <Text className="text-red-500 font-bold text-lg ml-2">
                    Remove from Group
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
