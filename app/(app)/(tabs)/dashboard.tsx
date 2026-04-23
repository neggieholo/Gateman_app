import { router } from "expo-router";
import {
  Users, 
  UserCheck, 
  UserPlus, 
  MessageSquare, 
  Heart, 
  Zap, 
  Smartphone, 
  Wifi, 
  ChevronRight,
  Calendar
} from "lucide-react-native";
import React, { useContext, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserContext } from "../../UserContext";

const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <View className="flex-1 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
    <View className="flex-row items-center justify-between mb-2">
      <View className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-')}/10`}>
        <Icon size={18} className={colorClass} />
      </View>
    </View>
    <Text className="text-2xl font-bold text-gray-900">{value}</Text>
    <Text className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
      {title}
    </Text>
  </View>
);

const ServiceButton = ({ title, icon: Icon, color, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    className="items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm w-[30%]"
  >
    <View className={`p-3 rounded-full mb-2 ${color}`}>
      <Icon size={24} color="white" />
    </View>
    <Text className="text-xs font-bold text-gray-700">{title}</Text>
  </TouchableOpacity>
);

export default function Dashboard() {
  const { user, setUser } = useContext(UserContext);
  const [showBanner, setShowBanner] = React.useState(false);

  useEffect(() => {
    if (user?.showWelcome) setShowBanner(true);
  }, [user]);

  const handleDismissWelcome = () => {
    setShowBanner(false);
    if (user) setUser({ ...user, showWelcome: false });
  };

  if (!user) return <View className="flex-1 bg-gray-50 items-center justify-center"><Text>Loading...</Text></View>;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Welcome Modal remains the same as your previous code */}
      
      <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
        {/* --- 1. Header --- */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-400 font-medium">Welcome back,</Text>
            <Text className="text-2xl font-black text-gray-900">
              {user.name ? user.name.split(" ")[0] : "Resident"}
            </Text>
          </View>
        </View>

        {/* --- 2. Quick Guest Stats (The "Expected" Section) --- */}
        <View className="mb-6">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-lg font-bold text-gray-800">Today&apos;s Guests</Text>
            <TouchableOpacity onPress={() => router.push("/guests")}>
              <Text className="text-indigo-600 font-bold text-xs">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-3">
            <StatCard title="Expected" value="12" icon={UserPlus} colorClass="text-indigo-600" />
            <StatCard title="Arrived" value="8" icon={UserCheck} colorClass="text-emerald-600" />
            <StatCard title="Pending" value="4" icon={Users} colorClass="text-amber-500" />
          </View>
        </View>

        {/* --- 3. Extra Services (Electricity, etc.) --- */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-800 mb-4">Quick Services</Text>
          <View className="flex-row justify-between">
            <ServiceButton title="Electricity" icon={Zap} color="bg-amber-500" onPress={() => console.log('Electricity')} />
            <ServiceButton title="Airtime" icon={Smartphone} color="bg-blue-500" onPress={() => console.log('Airtime')} />
            <ServiceButton title="Data" icon={Wifi} color="bg-purple-500" onPress={() => console.log('Data')} />
          </View>
        </View>

        {/* --- 4. Community Engagement (Likes & Comments) --- */}
        <View className="mb-6 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-800">Community Buzz</Text>
            <View className="flex-row gap-4">
              <View className="flex-row items-center">
                <Heart size={16} color="#ef4444" fill="#ef4444" />
                <Text className="ml-1 font-bold text-gray-700">124</Text>
              </View>
              <View className="flex-row items-center">
                <MessageSquare size={16} color="#4f46e5" />
                <Text className="ml-1 font-bold text-gray-700">18</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity className="flex-row items-center bg-indigo-50 p-3 rounded-xl">
            <View className="flex-1">
              <Text className="text-indigo-900 font-bold text-xs">New Estate Notice</Text>
              <Text className="text-indigo-700 text-[10px]">Gate maintenance scheduled for Saturday...</Text>
            </View>
            <ChevronRight size={16} color="#4f46e5" />
          </TouchableOpacity>
        </View>

        {/* --- 5. Upcoming Events --- */}
        <View className="mb-10">
          <Text className="text-lg font-bold text-gray-800 mb-4">Upcoming Events</Text>
          <View className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex-row items-center">
            <View className="bg-emerald-500 p-3 rounded-xl mr-4">
              <Calendar size={24} color="white" />
            </View>
            <View>
              <Text className="text-emerald-900 font-bold">Estate Town Hall</Text>
              <Text className="text-emerald-700 text-xs">Tomorrow, 10:00 AM • Community Center</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}