import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, XCircle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define the shape of your navigation params
export type RootStackParamList = {
  EmergencyAlert: { title: string; message: string; residentId?: string };
  Dashboard: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'EmergencyAlert'>;

const EmergencyAlertPage: React.FC<Props> = ({ route, navigation }) => {
  const { title, message } = route.params;

  useEffect(() => {
    // Start a heavy "SOS" vibration pattern immediately on mount
    // [delay, duration, delay, duration...]
    const pattern = [500, 1000, 500, 1000, 500, 1000];
    Vibration.vibrate(pattern, true); // 'true' makes it loop

    return () => Vibration.cancel(); // Stop when they leave the screen
  }, []);

  const dismissAlert = () => {
    Vibration.cancel();
    // Using goBack or navigating to a specific security dashboard
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Dashboard');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-red-600">
      <View className="flex-1 items-center justify-center px-6">
        
        {/* Animated Icon Container */}
        <View className="mb-8 items-center justify-center">
          <View className="absolute h-32 w-32 animate-ping rounded-full bg-white/20" />
          <ShieldAlert size={100} color="white" strokeWidth={2.5} />
        </View>

        {/* Text Content */}
        <View className="items-center">
          <Text className="text-sm font-black tracking-[4px] text-white/80 uppercase">
            Emergency Alert
          </Text>
          <Text className="mt-4 text-center text-3xl font-black leading-tight text-white uppercase">
            {title}
          </Text>
          <Text className="mt-4 text-center text-lg font-medium text-white/90">
            {message}
          </Text>
        </View>

        {/* Action Button */}
        <View className="mt-12 w-full px-4">
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={dismissAlert}
            className="flex-row items-center justify-center rounded-full bg-white py-5 shadow-2xl shadow-black"
          >
            <XCircle color="#dc2626" size={24} />
            <Text className="ml-3 text-lg font-black tracking-tight text-red-600 uppercase">
              Dismiss Alert
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

export default EmergencyAlertPage;