import React from 'react';
import { View, Text, Image, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X, Mail, ShieldCheck, Calendar } from 'lucide-react-native';
import { User } from '../services/interfaces';

interface ProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: Partial<User> | null; 
}

export default function UserProfileModal ({ isVisible, onClose, user }: ProfileProps) {
  if (!user) return null;

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
                <Image 
                  source={{ uri: user.avatar || "https://via.placeholder.com/150" }}
                  className="w-32 h-32 rounded-full border-4 border-indigo-50"
                />
                <View className="absolute bottom-1 right-1 bg-green-500 p-2 rounded-full border-4 border-white">
                  <ShieldCheck size={18} color="white" />
                </View>
              </View>
              <Text className="text-2xl font-black text-gray-900 mt-4">{user.name}</Text>
              <Text className="text-indigo-600 font-bold uppercase tracking-widest text-xs mt-1">
                Verified Resident
              </Text>
            </View>

            {/* Stats Row */}
            <View className="flex-row justify-between bg-indigo-50 rounded-2xl p-4 mb-8">
              <View className="items-center flex-1 border-r border-indigo-100">
                <Text className="text-indigo-400 text-[10px] font-bold uppercase">Block</Text>
                <Text className="text-indigo-900 font-bold text-lg">{user.block || 'N/A'}</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-indigo-400 text-[10px] font-bold uppercase">Unit</Text>
                <Text className="text-indigo-900 font-bold text-lg">{user.unit || 'N/A'}</Text>
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
                  <Text className="text-gray-900 font-semibold text-base">{user.email}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="bg-gray-100 p-3 rounded-xl mr-4">
                  <Calendar size={20} color="#4b5563" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs">Member Since</Text>
                  <Text className="text-gray-900 font-semibold text-base">Jan 2026</Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              className="bg-indigo-600 mt-10 py-4 rounded-2xl shadow-lg shadow-indigo-200 active:bg-indigo-700"
            >
              <Text className="text-white text-center font-bold text-lg">Call Resident</Text>
            </TouchableOpacity>
            
            <View className="h-10" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};