import React from "react";
import { ScrollView, Text, TouchableOpacity, View} from "react-native";
import { useUser } from "@/app/UserContext";
import {
    ChevronRight,
    Clock,
    Shield,
    Zap
} from "lucide-react-native";
import { router } from "expo-router";

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
            <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mr-4">
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

    const handleExternalPayment = () => {
        // if (user?.external_api_url) {
        //     Linking.openURL(user.external_api_url);
        // } else {
        //     Alert.alert("Account Info", "Please pay into: \nBank: Zenith Bank\nAcct: 1012345678\nName: GateMan Estates");
        // }
    };

    const handlePaymentHistory = () => console.log("Navigate to History");

    if (!user?.estate_id) {
        return (
            <View className="flex-1 justify-center items-center p-6 bg-slate-50">
                <Text className="text-slate-400 mb-4 text-center">You haven&apos;t joined an estate yet.</Text>
                <TouchableOpacity
                    className="bg-indigo-600 py-4 px-8 rounded-2xl"
                    onPress={() => router.push("/JoinRequest")}
                >
                    <Text className="text-white font-black text-center">Join an Estate</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <ScrollView className="flex-1 px-4 mt-5" showsVerticalScrollIndicator={false}>
                <View className="mb-6">
                    <Text className="text-slate-500">Utilities, payments, and security info</Text>
                </View>

                <ServiceListItem
                    title="Utility & Dues"
                    subtitle="Redirect to estate payment portal"
                    icon={Zap}
                    color="#3B82F6"
                    onPress={handleExternalPayment}
                />

                <ServiceListItem
                    title="Payment History"
                    subtitle="View your past transactions"
                    icon={Clock}
                    color="#64748B"
                    onPress={handlePaymentHistory}
                />

                <ServiceListItem
                    title="Security Center"
                    subtitle="View security personnel"
                    icon={Shield}
                    color="#10B981"
                    onPress={() => {router.push("/SecurityPersonnels" as any)}}
                />

                <ServiceListItem
                    title="Resolution Center"
                    subtitle="Report your concerns"
                    icon={Shield}
                    color="#10B981"
                    onPress={() => {router.push("/ResolutionCenter" as any)}}
                />

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}