import { ExternalLink, Info, Landmark, UploadCloud } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getEstatePaymentSettings } from "./services/api";
import { PaymentMode, UtilityPaymentInfo } from "./services/interfaces";

export default function UtilityPaymentRouter() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{
    payment_type: PaymentMode;
    details: UtilityPaymentInfo;
  } | null>(null);

  const fetchPaymentInfo = async () => {
    setLoading(true);
    try {
      const res = await getEstatePaymentSettings();

      if (res.success && res.data) {
        setConfig({
          payment_type: res.data.payment_type,
          details: res.data.details,
        });
      } else {
        console.warn("Settings fetched but data block is empty");
      }
    } catch (err) {
      console.error("Fetch Settings Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentInfo();
  }, []);

  const isApiReady =
    config?.payment_type === "api" && !!config.details?.external_api_url;

  const isManualReady =
    config?.payment_type === "manual" &&
    !!config.details?.bank_name &&
    !!config.details?.bank_account_number &&
    !!config.details?.bank_account_name;

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6 pt-12">
        {config?.payment_type === "api" && (
          <View className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm items-center">
            {isApiReady ? (
              <>
                <View className="bg-blue-50 p-5 rounded-3xl mb-6">
                  <ExternalLink size={32} color="#3b82f6" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">
                  External Portal
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(config.details.external_api_url!)
                  }
                  className="bg-blue-600 w-full p-5 rounded-3xl items-center mt-8"
                >
                  <Text className="text-white font-black text-lg">
                    Go to Portal
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <MissingDetailsMessage type="Portal Link" />
            )}
          </View>
        )}

        {config?.payment_type === "manual" && (
          <View className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            {isManualReady ? (
              <>
                <View className="items-center mb-6">
                  <View className="bg-emerald-50 p-5 rounded-3xl">
                    <Landmark size={32} color="#10b981" />
                  </View>
                  <Text className="text-xl font-black text-slate-900 mt-4">
                    Bank Transfer
                  </Text>
                </View>
                <View className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <DetailRow
                    label="Bank Name"
                    value={config.details.bank_name}
                  />
                  <DetailRow
                    label="Account Number"
                    value={config.details.bank_account_number}
                    bold
                  />
                  <DetailRow
                    label="Account Name"
                    value={config.details.bank_account_name}
                    italic
                  />
                </View>
              </>
            ) : (
              <MissingDetailsMessage type="Account Details" />
            )}
          </View>
        )}

        {/* <TouchableOpacity className="mt-8 bg-slate-900 p-5 rounded-3xl flex-row items-center justify-center border-b-4 border-slate-700">
          <UploadCloud size={20} color="white" />
          <Text className="text-white font-black ml-3 text-lg">
            Upload Proof of Payment
          </Text>
        </TouchableOpacity> */}
      </View>
    </ScrollView>
  );
}

const MissingDetailsMessage = ({ type }: { type: string }) => (
  <View className="items-center py-4">
    <View className="bg-amber-50 p-4 rounded-full mb-4">
      <Info size={24} color="#f59e0b" />
    </View>
    <Text className="text-slate-900 font-black text-center text-lg">
      Details Missing
    </Text>
    <Text className="text-slate-500 text-center mt-2 leading-5">
      The estate admin has not fully configured the {type}. Please contact your
      estate office.
    </Text>
  </View>
);

const DetailRow = ({ label, value, bold, italic }: any) => (
  <View className="mb-4">
    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </Text>
    <Text
      className={`${bold ? "text-3xl text-indigo-600" : "text-lg text-slate-800"} ${italic ? "italic" : ""} font-black`}
    >
      {value}
    </Text>
  </View>
);
