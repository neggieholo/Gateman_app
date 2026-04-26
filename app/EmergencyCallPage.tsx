import { useNavigation, useRoute } from "@react-navigation/native";
import { Phone, X } from "lucide-react-native";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVoiceCall } from "./services/UseVoiceCall";

export default function EmergencyCallPage() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // This safely pulls the data out
  const { channelName, residentName } = route.params || {};
  const { join, leave, message, isJoined } = useVoiceCall(channelName);

  useEffect(() => {
    // As soon as this screen opens, we join the Agora channel
    join();

    return () => {
      leave(); // Safety check: stop audio if they swipe the app away
    };
  }, []);

  const handleDismiss = () => {
    leave();
    navigation.goBack(); // Return to the previous screen (Chat or Home)
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-1 items-center justify-between py-20">
        {/* Header / Status */}
        <View className="items-center">
          <Text className="text-slate-400 text-lg uppercase tracking-widest mb-2">
            {isJoined ? "Ongoing Call" : "Connecting..."}
          </Text>
          <Text className="text-white text-4xl font-bold mb-4 text-center">
            {residentName}
          </Text>
          <View className="bg-white/10 px-4 py-1 rounded-md">
            <Text className="text-green-400 font-mono">
              {message || "Establishing connection..."}
            </Text>
          </View>
        </View>

        {/* Profile Placeholder / Call Icon */}
        <View className="w-48 h-48 rounded-full bg-slate-800 items-center justify-center border border-slate-700 shadow-xl">
          <View className="w-40 h-40 rounded-full bg-slate-700 items-center justify-center">
            <Phone size={60} color="white" />
          </View>
        </View>

        {/* Call Controls */}
        <View className="items-center w-full px-10">
          <View className="flex-row justify-center items-center w-full">
            {/* End Call Button */}
            <View className="items-center">
              <TouchableOpacity
                onPress={handleDismiss}
                className="bg-red-600 w-20 h-20 rounded-full items-center justify-center shadow-lg active:bg-red-700"
              >
                <X size={40} color="white" />
              </TouchableOpacity>
              <Text className="text-slate-400 font-medium mt-3">End</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
