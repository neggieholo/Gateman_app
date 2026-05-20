import { useUser } from "@/app/UserContext";
import { router } from "expo-router";
import {
  ChevronRight,
  Clock,
  PhoneCall,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface ServiceItemProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  onPress: () => void;
  isDarkMode: boolean;
}

const ServiceListItem: React.FC<ServiceItemProps> = ({
  title,
  subtitle,
  icon: Icon,
  color,
  onPress,
  isDarkMode
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center justify-between p-5 ${isDarkMode ? 'bg-gm-navy border-gm-gold':'bg-white border-slate-100' } rounded-3xl mb-3 shadow-sm border`}
  >
    <View className="flex-row items-center flex-1">
      <View
        style={{ backgroundColor: `${color}15` }}
        className="p-3 rounded-2xl mr-4"
      >
        <Icon size={22} color={color} />
      </View>
      <View>
        <Text className={`${isDarkMode ? 'text-gm-gold':'text-gm-navy'} font-oswald-semibold text-base`}>{title}</Text>
        <Text className={`${isDarkMode ? 'text-slate-400':'text-slate-500 '} font-roboto-regular text-xs`}>{subtitle}</Text>
      </View>
    </View>
    <ChevronRight size={18} color="#cbd5e1" />
  </TouchableOpacity>
);

export default function EstateServicesScreen() {
  const { user, isDarkMode, theme } = useUser();
  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;

  if (hasNoEstates) {
    return (
      <View
        className={`${isDarkMode ? "bg-gm-navy/20" : "bg-gray-50"} flex-1 justify-center items-center p-6`}
      >
        <View
          className={`${isDarkMode ? "bg-gm-navy" : "bg-white"} p-8 rounded-3xl shadow-sm items-center border ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}
        >
          <ShieldCheck size={60} color="#4f46e5" />
          <Text
            className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gm-navy"} mt-4 text-center`}
          >
            Access Restricted
          </Text>
          <Text
            className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} mt-2 text-center px-4 max-w-[280px]`}
          >
            You are currently not attached to any active estates on GateMan.
          </Text>

          <TouchableOpacity
            className={`${isDarkMode ? "bg-gm-charcoal" : "bg-gm-navy"} py-4 px-10 rounded-2xl shadow-md mt-6`}
            onPress={() => router.push("/JoinRequest" as any)}
          >
            <Text className="text-white font-bold text-lg">Join an Estate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-gray-50 "}`}>
      <ScrollView
        className="flex-1 px-4 mt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className={`${isDarkMode ? 'text-gray-300':'text-slate-500 '} font-oswald-semibold`}>
            Utilities, payments, and security info
          </Text>
        </View>

        {/* FINANCIAL SERVICES - Blue/Indigo */}
        <ServiceListItem
          title="Utility & Dues"
          subtitle="Redirect to estate payment portal"
          icon={Zap}
          color="#6366f1"
          onPress={() => {
            router.push("/UtilityPayment" as any);
          }}
          isDarkMode={isDarkMode}
        />

        <ServiceListItem
          title="Payments History"
          subtitle="View your past transactions"
          icon={Clock}
          color="#0ea5e9" // Sky 500
          onPress={() => {
            router.push("/PaymentHistory" as any);
          }}
          isDarkMode={isDarkMode}
        />

        {/* SECURITY - Emerald/Green */}
        <ServiceListItem
          title="Security Center"
          subtitle="View security personnel"
          icon={Shield}
          color="#10b981" // Emerald 500
          onPress={() => {
            router.push("/SecurityPersonnels" as any);
          }}
          isDarkMode={isDarkMode}
        />

        {/* SUPPORT & HELP - Amber/Orange */}
        <ServiceListItem
          title="Suggestions and Complaints"
          subtitle="Report your concerns"
          icon={ShieldCheck} // Changed icon slightly for variety
          color="#f59e0b" // Amber 500
          onPress={() => {
            router.push("/ResolutionCenter" as any);
          }}
          isDarkMode={isDarkMode}
        />

        {/* EMERGENCY - Rose/Red */}
        <ServiceListItem
          title="Emergency Contacts"
          subtitle="Important Numbers"
          icon={PhoneCall} // Using PhoneCall for more urgency
          color="#e11d48" // Rose 600
          onPress={() => {
            router.push("/EmergencyContactsPage" as any);
          }}
          isDarkMode={isDarkMode}
        />

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
