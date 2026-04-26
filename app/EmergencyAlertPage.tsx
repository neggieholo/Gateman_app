import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { startEmergencyAlarm, stopEmergencyAlarm } from './services/alarm';


export default function EmergencyAlertPage() {
  const router = useRouter();
  const { senderName, message } = useLocalSearchParams();

  useEffect(() => {
    startEmergencyAlarm();
    Vibration.vibrate([1000, 500, 1000], true);

    return () => {
      stopEmergencyAlarm();
      Vibration.cancel();
    };
  }, []);

  const handleAcknowledge = async () => {
    await stopEmergencyAlarm();
    Vibration.cancel();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View className="flex-1 bg-[#D32F2F] items-center justify-center p-5">
      <View className="items-center w-full">
        <Ionicons name="warning" size={100} color="white" />
        
        <Text className="text-white text-4xl font-bold text-center my-6">
          EMERGENCY ALERT
        </Text>
        
        <View className="bg-white/20 rounded-2xl p-6 w-full mb-10 border border-white/30">
          <Text className="text-red-100 text-xs uppercase tracking-widest mb-1">
            Resident
          </Text>
          <Text className="text-white text-2xl font-semibold mb-5">
            {senderName || "Unknown Resident"}
          </Text>
          
          <Text className="text-red-100 text-xs uppercase tracking-widest mb-1">
            Situation
          </Text>
          <Text className="text-white text-xl font-medium">
            {message || "Panic button pressed!"}
          </Text>
        </View>

        <TouchableOpacity 
          className="bg-white py-5 px-10 rounded-full shadow-xl active:bg-gray-100"
          onPress={handleAcknowledge}
        >
          <Text className="text-[#D32F2F] text-lg font-bold">
            ACKNOWLEDGE & STOP
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}