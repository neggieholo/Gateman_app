import { ArrowUp, Bell, FileText} from "lucide-react-native";
import React, { useContext, useEffect } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button"; // Assuming this is your custom button
import { UserContext } from "../../UserContext";

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
  const { user, setUser } = useContext(UserContext);
  const [showBanner, setShowBanner] = React.useState(false);

  useEffect(() => {
    const welcomeShown = () => {
      if (user?.showWelcome) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    }
    welcomeShown();
  }, [user]);

  const handleDismissWelcome = () => {
    setShowBanner(false);
    // Update context state so it doesn't reappear until the next "first login" event
    if (user) {
      setUser({ ...user, showWelcome: false });
    }
  };

  
  if (!user) return <Text className="text-center mt-10">Loading...</Text>;

  const walletBalance = user.wallet_balance ? parseFloat(String(user.wallet_balance)).toFixed(2) : "0.00";


  return (
    <SafeAreaView className="flex-1 bg-gray-50">      
      <Modal
      animationType="fade"
      transparent={true}
      visible={showBanner}
      onRequestClose={handleDismissWelcome}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-sky-50 rounded-3xl p-6 shadow-2xl border border-sky-100 w-full">
            <View className="items-center mb-4">
               <View className="bg-sky-500 p-3 rounded-full mb-4">
                  <Bell size={30} color="white" />
               </View>
               <Text className="text-gray-900 font-black text-2xl text-center mb-2">
                 Welcome to {user.estate_name || "the Estate"}! 🎉
               </Text>
               <Text className="text-gray-600 text-center leading-5 px-2">
                 Your join request has been approved. You can now manage your payments, access estate services, and stay updated.
               </Text>
            </View>

            <TouchableOpacity 
              onPress={handleDismissWelcome}
              className="bg-indigo-600 py-4 rounded-xl shadow-md shadow-indigo-300 active:bg-indigo-700"
            >
              <Text className="text-white text-center font-bold text-lg">Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView 
        className="flex-1 px-5 pt-3"
        showsVerticalScrollIndicator={false}
      >        
        {/* --- 1. Welcome Header & Icons --- */}
        <View className="flex-row items-center justify-start mb-8">
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Hello, {user.name ? user.name.split(" ")[0] : "Guest"}
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