import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "./UserContext";


interface Provider {
  id: string;
  name: string;
  color: string;
  short: string;
  txtColor: string;
}

interface VariationPlan {
  variation_code: string;
  name: string;
  variation_amount: string;
}

export default function PurchasePage() {
  const { user, isDarkMode, theme } = useUser();
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}/api`;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [dataPlans, setDataPlans] = useState<VariationPlan[]>([]);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState("");

  const [form, setForm] = useState({
    provider: "",
    accountNumber: "", // Phone for airtime/data, Meter for electricity
    amount: "",
    variation: null as any,
  });

  // Mock data for Nigeria - replace with your API calls (VTpass/Flutterwave)
  const electricityProviders = [
    { id: "ikeja-electric", name: "IKEDC (Ikeja)", color: "bg-red-600" },
    { id: "eko-electric", name: "EKEDC (Eko)", color: "bg-blue-800" },
    { id: "abuja-electric", name: "AEDC (Abuja)", color: "bg-green-700" },
  ];

  const telcos = [
    { id: "mtn", name: "MTN", color: "bg-yellow-400" },
    { id: "airtel", name: "Airtel", color: "bg-red-600" },
    { id: "glo", name: "Glo", color: "bg-green-600" },
    { id: "9mobile", name: "9mobile", color: "bg-green-900" },
  ];

 useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoadingProviders(true);
        const response = await fetch(`${BASE_URL}/dashboard/providers?type=${type}`);
        const data = await response.json();
        if (data.success) {
          console.log("Providers data:", data)
          setProviders(data.providers);
        } else {
          Alert.alert("Error", "Could not populate provider registry.");
        }
      } catch (err) {
        console.error("Failed fetching dynamic providers list:", err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, [type, BASE_URL]);

  const verifyMeter = async () => {
    if (form.accountNumber.length < 10) return;

    setVerifying(true);
    try {
      const response = await fetch(`${BASE_URL}/utility/verify-meter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billersCode: form.accountNumber,
          serviceID: form.provider,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setVerifiedName(data.name);
      } else {
        Alert.alert("Error", "Meter not found. Check the number.");
      }
    } catch (err) {
      console.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handlePurchase = () => {
    if (!form.accountNumber || !form.amount) {
      Alert.alert("Error", "Please fill in all details");
      return;
    }
    setLoading(true);
    // Integrate with your backend (3003) and Flutterwave here
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Success", `${type} purchase successful!`);
      router.back();
    }, 2000);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gm-navy/20" : "bg-gray-50 "}`}
    >
      {/* Header */}
      <View
        className={`pl-4 pb-2 flex-row items-center border-b ${isDarkMode ? "border-gray-50 " : "border-gm-charcoal"}`}
      >
        <Text
          className={`text-xl ${isDarkMode ? "text-gm-charcoal" : "text-gm-charcoal"} font-montserrat-extrabold capitalize`}
        >
          {type} Purchase
        </Text>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* 1. Provider Selection */}
        <Text
          className={`text-md ${isDarkMode ? "text-gm-charcoal" : "text-gray-700"} font-oswald-semibold tracking-widest uppercase mb-3`}
        >
          Select Provider
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {(type === "electricity" ? electricityProviders : telcos).map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setForm({ ...form, provider: p.id })}
              className={`p-3 rounded-2xl border-2 items-center justify-center w-[22%] ${
                form.provider === p.id
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <View
                className={`w-10 h-10 ${p.color} rounded-full items-center justify-center mb-1`}
              >
                <Text className="text-white font-bold text-[8px]">
                  {p.name.substring(0, 3)}
                </Text>
              </View>
              <Text
                className="text-[10px] font-bold text-gray-600"
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. Account / Phone Input */}
        <Text
          className={`text-md ${isDarkMode ? "text-gm-charcoal" : "text-gray-700"} font-oswald-semibold tracking-widest uppercase mb-3`}
        >
          {type === "electricity" ? "Meter Number" : "Phone Number"}
        </Text>
        <View
          className={`flex-row items-center ${isDarkMode ? "border-gm-gold bg-gm-navy" : "border-gray-200 bg-gray-50"} rounded-2xl border px-4 py-1 mb-4`}
        >
          <TextInput
            className={`flex-1 py-3 font-bold ${isDarkMode ? "border-gm-gold text-white" : "border-gm-navy text-gray-900"}`}
            placeholder={
              type === "electricity" ? "Enter 11-digit Meter No" : "Enter Phone number"
            }
            keyboardType="number-pad"
            value={form.accountNumber}
            onChangeText={(t) => setForm({ ...form, accountNumber: t })}
            onBlur={type === "electricity" ? verifyMeter : undefined}
            placeholderTextColor="#6b7280"
          />
          {verifying && <ActivityIndicator color="#4f46e5" />}
        </View>

        {/* Meter Verification Result */}
        {type === "electricity" && verifiedName && (
          <View className="bg-emerald-50 p-4 rounded-xl mb-4 border border-emerald-100 flex-row items-center">
            <CheckCircle2 size={18} color="#10b981" />
            <Text className="ml-2 text-emerald-800 font-bold text-xs">
              {verifiedName}
            </Text>
          </View>
        )}

        {/* 3. Amount Input (For Airtime/Electricity) */}
        {type !== "data" && (
          <View>
            <Text
              className={`text-md ${isDarkMode ? "text-gm-charcoal" : "text-gray-700"} font-oswald-semibold tracking-widest uppercase mb-3`}
            >
              Amount (₦)
            </Text>
            <TextInput
              className={`rounded-2xl border px-4 py-4 text-xl mb-6 ${isDarkMode ? "border-gm-gold bg-gm-navy text-white" : "border-gray-200 bg-gray-50 text-gray-900"}`}
              placeholder="0.00"
              keyboardType="number-pad"
              value={form.amount}
              onChangeText={(t) => setForm({ ...form, amount: t })}
              placeholderTextColor="#6b7280"
            />
          </View>
        )}

        {/* 4. Data Variations (Only for Data) */}
        {type === "data" && (
          <View className="mb-6">
            <Text
              className={`text-md ${isDarkMode ? "text-gm-charcoal" : "text-gray-400"} font-oswald-semibold tracking-widest uppercase mb-3`}
            >
              Select Plan
            </Text>
            {/* Example Plans */}
            {[
              { code: "d1", name: "1GB - 1 Day", price: "300" },
              { code: "d2", name: "2.5GB - 2 Days", price: "600" },
              { code: "d3", name: "5GB - 30 Days", price: "1500" },
            ].map((v) => (
              <TouchableOpacity
                key={v.code}
                onPress={() =>
                  setForm({ ...form, variation: v, amount: v.price })
                }
                className={`p-4 mb-2 rounded-2xl border-2 flex-row justify-between items-center ${
                  form.variation?.code === v.code
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <Text className="font-bold text-gray-800">{v.name}</Text>
                <Text className="font-black text-indigo-600">₦{v.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={loading || verifying}
          className={`py-4 rounded-2xl shadow-lg mb-10 ${
            loading || verifying
              ? "bg-gray-400"
              : isDarkMode
                ? "bg-gm-charcoal"
                : "bg-gm-navy"
          }`}
        >
          {loading || verifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-black text-lg">
              Confirm Purchase
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
