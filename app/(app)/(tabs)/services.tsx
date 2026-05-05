import { useUser } from "@/app/UserContext";
import { router } from "expo-router";
import { ChevronRight, Clock, PhoneCall, Shield, ShieldCheck, Zap } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface ServiceItemProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  onPress: () => void;
}

const ServiceListItem: React.FC<ServiceItemProps> = ({
  title,
  subtitle,
  icon: Icon,
  color,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-row items-center justify-between p-5 bg-white rounded-3xl mb-3 shadow-sm border border-slate-100"
  >
    <View className="flex-row items-center flex-1">
      <View
        style={{ backgroundColor: `${color}15` }}
        className="p-3 rounded-2xl mr-4"
      >
        <Icon size={22} color={color} />
      </View>
      <View>
        <Text className="text-slate-900 font-bold text-base">{title}</Text>
        <Text className="text-slate-500 text-xs">{subtitle}</Text>
      </View>
    </View>
    <ChevronRight size={18} color="#cbd5e1" />
  </TouchableOpacity>
);

export default function EstateServicesScreen() {
  const { user } = useUser();

  // const handleExternalPayment = () => {
  //     // if (user?.external_api_url) {
  //     //     Linking.openURL(user.external_api_url);
  //     // } else {
  //     //     Alert.alert("Account Info", "Please pay into: \nBank: Zenith Bank\nAcct: 1012345678\nName: GateMan Estates");
  //     // }
  // };

  if (!user?.estate_id) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-slate-50">
        <Text className="text-slate-400 mb-4 text-center">
          You haven&apos;t joined an estate yet.
        </Text>
        <TouchableOpacity
          className="bg-indigo-600 py-4 px-8 rounded-2xl"
          onPress={() => router.push("/JoinRequest")}
        >
          <Text className="text-white font-black text-center">
            Join an Estate
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1 px-4 mt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="text-3xl font-black text-slate-900">Services</Text>
          <Text className="text-slate-500 font-bold">
            Utilities, payments, and security info
          </Text>
        </View>

        {/* FINANCIAL SERVICES - Blue/Indigo */}
        <ServiceListItem
          title="Utility & Dues"
          subtitle="Redirect to estate payment portal"
          icon={Zap}
          color="#4f46e5" // Indigo 600
          onPress={() => {
            router.push("/UtilityPayment" as any);
          }}
        />

        <ServiceListItem
          title="Payments History"
          subtitle="View your past transactions"
          icon={Clock}
          color="#0ea5e9" // Sky 500
          onPress={() => {
            router.push("/PaymentHistory" as any);
          }}
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
        />

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
