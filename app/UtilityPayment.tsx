import {
  ChevronDown,
  ExternalLink,
  Info,
  Landmark,
  MapPin,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getEstatePaymentSettings } from "./services/api";
import { PaymentMode, UtilityPaymentInfo } from "./services/interfaces";
import { useUser } from "./UserContext";

export default function UtilityPaymentRouter() {
  const { user, isDarkMode, theme } = useUser();
  const [loading, setLoading] = useState(true);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);
  const [config, setConfig] = useState<{
    payment_type: PaymentMode;
    details: UtilityPaymentInfo;
  } | null>(null);

  useEffect(() => {
    if (!user?.estate_ids || user.estate_ids.length === 0) {
      setLoading(false);
      return;
    }

    if (user.estate_ids.length === 1) {
      const singleId = user.estate_ids[0];
      setSelectedEstateId(singleId);
      fetchPaymentInfo(singleId);
    } else {
      // Multiple Estates: Open context modal picker dynamically
      setEstatePickerVisible(true);
    }
  }, [user?.estate_ids]);

  const fetchPaymentInfo = async (id: string) => {
    setLoading(true);
    try {
      const res = await getEstatePaymentSettings(id);

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

  const handleSelectEstate = (estateId: string) => {
    setSelectedEstateId(estateId);
    setEstatePickerVisible(false);
    fetchPaymentInfo(estateId);
  };

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const handleOpenURL = async (url: string) => {
    if (!url) return;

    // Ensure protocol exists
    const finalUrl = url.toLowerCase().startsWith("http")
      ? url
      : `https://${url}`;

    try {
      const supported = await Linking.canOpenURL(finalUrl);
      if (supported) {
        await Linking.openURL(finalUrl);
      } else {
        Alert.alert(
          "Invalid Link",
          "The estate portal link is not properly formatted.",
        );
      }
    } catch (err) {
      console.error("GateMan Linking Error:", err);
      Alert.alert("Error", "Could not open the portal at this time.");
    }
  };

  const isApiReady =
    config?.payment_type === "api" && !!config.details?.external_api_url;

  const isManualReady =
    config?.payment_type === "manual" &&
    !!config.details?.bank_name &&
    !!config.details?.bank_account_number &&
    !!config.details?.bank_account_name;

  if (loading)
    return (
      <View
        className={`flex-1 justify-center items-center ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );

  if (!selectedEstateId && user?.estate_ids && user.estate_ids.length > 1) {
    return (
      <View
        className={`flex-1 justify-center items-center p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
      >
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className="bg-gm-navy px-8 py-4 rounded-3xl shadow-sm"
        >
          <Text className="text-white font-black text-base">
            Select An Estate to Continue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
    >
      <View className="p-6 pt-12">
        {/* 🔄 Dropdown Switcher displayed ONLY for users with multiple active accounts */}
        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity
            onPress={() => setEstatePickerVisible(true)}
            className={`mb-6 flex-row items-center justify-between p-4 rounded-2xl border ${
              isDarkMode
                ? "bg-gm-navy border-gm-gold"
                : "bg-white border-slate-200"
            } shadow-sm`}
          >
            <View className="flex-row items-center flex-1">
              <MapPin size={18} color="#6366f1" />
              <Text
                className={`ml-2 font-bold ${isDarkMode ? "text-white" : "text-slate-800"} flex-1`}
                numberOfLines={1}
              >
                {activeEstateName || "Switch Estate Context"}
              </Text>
            </View>
            <ChevronDown size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {config?.payment_type === "api" && (
          <View
            className={`${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-slate-100"}  p-8 rounded-[40px] border shadow-sm items-center`}
          >
            {isApiReady ? (
              <>
                <View
                  className={`${isDarkMode ? "bg-gm-charcoal" : "bg-blue-50"} p-5 rounded-3xl mb-6`}
                >
                  <ExternalLink size={32} color={theme.accent} />
                </View>
                <Text
                  className={`text-xl font-montserrat-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} text-center`}
                >
                  External Portal
                </Text>
                <Text className="text-lg text-slate-400 mt-1 text-center font-oswald-semibold">
                  {activeEstateName}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    handleOpenURL(config.details.external_api_url!)
                  }
                  className={`${isDarkMode ? "bg-gm-charcoal border border-gm-gold" : "bg-gm-navy"} w-full p-5 rounded-3xl items-center mt-8`}
                >
                  <Text
                    className={`${isDarkMode ? "text-gm-gold" : "text-white"} font-montserrat-bold text-lg`}
                  >
                    Go to Portal
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <MissingDetailsMessage type="Portal Link" isDarkMode={isDarkMode} />
            )}
          </View>
        )}

        {config?.payment_type === "manual" && (
          <View
            className={`${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-slate-100"} p-8 rounded-[40px] border shadow-sm`}
          >
            {isManualReady ? (
              <>
                <View className="items-center mb-6">
                  <View
                    className={`${isDarkMode ? "bg-gm-charcoal" : "bg-blue-50"} bg-emerald-50 p-5 rounded-3xl`}
                  >
                    <Landmark
                      size={32}
                      color={isDarkMode ? "#D4AF37" : "#10b981"}
                    />
                  </View>
                  <Text
                    className={`text-xl font-montserrat-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} text-center`}
                  >
                    Bank Transfer
                  </Text>
                  <Text className="text-lg text-slate-400 mt-1 text-center font-oswald-semibold">
                    {activeEstateName}
                  </Text>
                </View>
                <View
                  className={`${isDarkMode ? "bg-gm-charcoal border border-gm-gold" : "bg-slate-50 border-slate-100"} p-6 rounded-3xl border`}
                >
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
              <MissingDetailsMessage type="Account Details" isDarkMode={isDarkMode} />
            )}
          </View>
        )}
      </View>

      {/* Bottom Picker Sheet Sheet Modal Interface */}
      <Modal
        visible={estatePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className={`${isDarkMode ? "bg-slate-900" : "bg-white"} rounded-t-[2.5rem] p-6 max-h-[60%]`}
          >
            <View className="w-12 h-1 bg-slate-300 rounded-full align-self-center mb-6 mx-auto" />
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gm-navy"}`}
            >
              Select Property Estate Context
            </Text>

            <FlatList
              data={user?.estates || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectEstate(item.id)}
                  className={`p-4 rounded-2xl mb-3 border flex-row items-center ${
                    selectedEstateId === item.id
                      ? "border-indigo-500 bg-indigo-50/40"
                      : isDarkMode
                        ? "border-slate-800 bg-slate-800/40"
                        : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <MapPin
                    size={20}
                    color={selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"}
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            {selectedEstateId && (
              <TouchableOpacity
                onPress={() => setEstatePickerVisible(false)}
                className="mt-2 p-4 bg-slate-200 rounded-2xl items-center"
              >
                <Text className="text-slate-700 font-bold">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const MissingDetailsMessage = ({
  type,
  isDarkMode,
}: {
  type: string;
  isDarkMode: boolean;
}) => (
  <View className="items-center py-4">
    <View className={`${isDarkMode ? 'bg-gm-charcoal':'bg-amber-50'} p-4 rounded-full mb-4`}>
      <Info size={24} color={isDarkMode ? "#D4AF37":"#f59e0b"} />
    </View>
    <Text
      className={`${isDarkMode ? "text-gm-gold" : "text-gm-navy"} font-montserrat-bold text-center text-lg`}
    >
      Details Missing
    </Text>
    <Text className="text-slate-400 text-center mt-2 leading-5 font-roboto-regular">
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
