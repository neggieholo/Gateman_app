import { Ban, Calendar, Mail, Phone, ShieldCheck, X } from "lucide-react-native";
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
import { User } from "../services/interfaces";

interface ProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: Partial<User> | null;
  openImageModal: (visible: boolean) => void;
  onBlockUser?: (userId: string) => void;
  onStartCall: (user: Partial<User>) => void;
  isOnline: boolean;
}

export default function UserProfileModal({
  isVisible,
  onClose,
  user,
  openImageModal,
  onBlockUser,
  onStartCall,
  isOnline,
}: ProfileProps) {
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white rounded-t-[40px] h-[85%] px-6 pt-8 shadow-2xl">
          {/* Close Handle & Button */}
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-4" />
            <TouchableOpacity
              onPress={onClose}
              className="absolute right-0 top-0 bg-gray-100 p-2 rounded-full"
            >
              <X size={20} color="#666" />
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
                    className="w-32 h-32 rounded-full border-4 border-indigo-50"
                  />
                </TouchableOpacity>
                <View className="absolute bottom-1 right-1 bg-green-500 p-2 rounded-full border-4 border-white">
                  <ShieldCheck size={18} color="white" />
                </View>
              </View>
              <Text className="text-2xl font-black text-gray-900 mt-4">
                {user.name}
              </Text>
              {/* <Text className="text-indigo-600 font-bold uppercase tracking-widest text-xs mt-1">
                Verified Resident
              </Text> */}
            </View>

            {/* Stats Row */}
            <View className="flex-row justify-between bg-indigo-50 rounded-2xl p-4 mb-8">
              <View className="items-center flex-1 border-r border-indigo-100">
                <Text className="text-indigo-400 text-[10px] font-bold uppercase">
                  Block
                </Text>
                <Text className="text-indigo-900 font-bold text-lg">
                  {user.block || "N/A"}
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-indigo-400 text-[10px] font-bold uppercase">
                  Unit
                </Text>
                <Text className="text-indigo-900 font-bold text-lg">
                  {user.unit || "N/A"}
                </Text>
              </View>
            </View>

            {/* Information List */}
            <View className="space-y-6">
              {/* <View className="flex-row items-center">
                <View className="bg-gray-100 p-3 rounded-xl mr-4">
                  <Phone size={20} color="#4b5563" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs">Phone Number</Text>
                  <Text className="text-gray-900 font-semibold text-base">{user.phone || '+234 ---'}</Text>
                </View>
              </View> */}

              <View className="flex-row items-center">
                <View className="bg-gray-100 p-3 rounded-xl mr-4">
                  <Mail size={20} color="#4b5563" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs">Email Address</Text>
                  <Text className="text-gray-900 font-semibold text-base">
                    {user.email}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="bg-gray-100 p-3 rounded-xl mr-4">
                  <Calendar size={20} color="#4b5563" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs">Member Since</Text>
                  <Text className="text-gray-900 font-semibold text-base">
                    Jan 2026
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <View className="mt-10 space-y-4">
              <TouchableOpacity
                onPress={handleAppCall}
                className={`${isOnline ? "bg-indigo-600" : "bg-gray-400"} py-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-indigo-200`}
              >
                <Phone size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  {isOnline ? "Start App Call" : "Resident Offline"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmBlock}
                className="border border-red-200 py-4 rounded-2xl flex-row justify-center items-center mt-3"
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
