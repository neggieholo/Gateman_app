import { ArrowUp, Bell, FileText, HelpCircle } from "lucide-react-native";
import React, { useContext } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button"; // Assuming this is your custom button
import { UserContext } from "../../UserContext";

interface User {
  name: string;
  wallet_balance: string;
}

// Helper component for the dashboard stat tiles
const StatCard = ({ title, value, icon: Icon, colorClass, highlight }: { title: string, value: string | number, icon: React.FC<any>, colorClass: string, highlight?: boolean }) => (
    <View className={`flex-1 p-4 rounded-xl shadow-sm border border-gray-100 ${highlight ? 'bg-white' : 'bg-white'}`}>
        <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs font-semibold uppercase text-gray-500">{title}</Text>
            <Icon size={18} className={colorClass} />
        </View>
        <Text className={`text-xl font-bold ${colorClass}`}>{value}</Text>
    </View>
);


export default function Dashboard() {
  const { user } = useContext(UserContext);

  
  if (!user) return <Text className="text-center mt-10">Loading...</Text>;

  const walletBalance = user.wallet_balance ? parseFloat(user.wallet_balance).toFixed(2) : "0.00";


  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1 px-5 pt-3"
        showsVerticalScrollIndicator={false}
      >
        {/* --- 1. Welcome Header & Icons --- */}
        <View className="flex-row items-center justify-start mb-8">
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Hello, {user.name.split(" ")[0]}
          </Text>
        </View>

        {/* --- 2. Wallet Card (Prominent & Primary) --- */}
        <View className="bg-indigo-600 rounded-2xl p-6 mb-6 shadow-xl shadow-indigo-200">
          <Text className="text-indigo-200 text-sm font-semibold mb-1 uppercase tracking-wider">
            Current Wallet Balance
          </Text>
          <Text className="text-5xl font-extrabold text-white mb-4">
            ₦{walletBalance.toLocaleString()}
          </Text>
          <Button 
            title="Top Up Wallet" 
            onPress={() => console.log("Top Up")} 
            titleClassName="text-blue-600 font-bold"
          />

        </View>

        {/* --- 3. Monthly Invoice Summary --- */}
        <View className="mb-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">Monthly Financial Snapshot</Text>
            
            <View className="flex-row space-x-3">
                {/* Outstanding Invoices */}
                <StatCard 
                    title="Total Unpaid"
                    value="4"
                    icon={FileText} // Assuming FileText is imported from lucide
                    colorClass="text-red-500"
                    highlight={true}
                />
                
                {/* Total Due Amount */}
                <StatCard 
                    title="Amount Due"
                    value="₦125,000"
                    icon={ArrowUp}
                    colorClass="text-amber-600"
                    highlight={true}
                />
            </View>
        </View>


        {/* --- 4. All-Time/Historical Stats --- */}
        <View className="mb-10">
            <Text className="text-xl font-bold text-gray-800 mb-4">Historical Performance</Text>
            
            <View className="space-y-4">
                <View className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                    <Text className="text-gray-500 text-sm font-semibold">Overall Arrears</Text>
                    <Text className="text-2xl font-bold text-rose-600 mt-1">
                        ₦500,000
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">Total amount owing across all periods.</Text>
                </View>
                
                <View className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                    <Text className="text-gray-500 text-sm font-semibold">Payment Success Rate</Text>
                    <Text className="text-2xl font-bold text-emerald-600 mt-1">
                        80%
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">Percentage of invoices paid on time.</Text>
                </View>
            </View>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

// Note: You would need to ensure the `FileText` icon is imported from lucide-react-native 
// and handle the `toLocaleString()` fallback for environments where it might not be available.