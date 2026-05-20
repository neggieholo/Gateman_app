import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  History,
  MapPin,
  Shield,
  Users,
  X
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SecurityReportsHistory from "./SecurityReportsHistory";
import { getSecurityColleagues, submitEstateReport } from "./services/api";
import { useUser } from "./UserContext"; 

export default function SubmitReport() {
  const { user, isDarkMode } = useUser();
  const params = useLocalSearchParams();

  // States
  const [reportType, setReportType] = useState<"GENERAL" | "SECURITY">("SECURITY");
  const [category, setCategory] = useState<"COMPLAINT" | "INFORMATION">("COMPLAINT");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [allGuards, setAllGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [displayHistory, setDsplayHistory] = useState(false);

  // Estate Context Assignment States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(
    (params.estateId as string) || null,
  );
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // Personnel Selection State (IDs only)
  const [selectedGuardIds, setSelectedGuardIds] = useState<string[]>(
    params.targetId ? [params.targetId as string] : [],
  );

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (selectedEstateId) return;
    if (!user?.estate_ids || user.estate_ids.length === 0) return;

    if (user.estate_ids.length === 1) {
      setSelectedEstateId(user.estate_ids[0]);
    } else {
      setEstatePickerVisible(true);
    }
  }, [user?.estate_ids, selectedEstateId]);

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const fetchGuards = async (estateId: string) => {
    setFetching(true);
    try {
      const res = await getSecurityColleagues(estateId);
      if (res.success) {
        setAllGuards(res.securityGuards || []);
      } else {
        Alert.alert("Error", res.error || "Could not load security personnel.");
      }
    } catch (error) {
      console.error("Fetch Guards Error:", error);
      Alert.alert("Network Error", "Please check your internet connection and try again.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (category === "COMPLAINT" && selectedEstateId) {
      fetchGuards(selectedEstateId);
    }
  }, [category, selectedEstateId]);

  const toggleGuardSelection = (id: string) => {
    if (selectedGuardIds.includes(id)) {
      setSelectedGuardIds(selectedGuardIds.filter((gid) => gid !== id));
    } else {
      setSelectedGuardIds([...selectedGuardIds, id]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEstateId) {
      Alert.alert("Error", "Please pick an estate context first.");
      return;
    }
    if (!subject || !description) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    const payload = {
      type: reportType,
      category: category,
      estate_id: selectedEstateId,
      target_security_ids: selectedGuardIds,
      subject,
      description,
    };

    const res = await submitEstateReport(payload);
    setLoading(false);

    if (res.success) {
      Alert.alert("Success", "Your report has been submitted to estate management.");
      router.back();
    } else {
      Alert.alert("Submission Failed", res.error || "Something went wrong.");
    }
  };

  const canShowInputs = category === "INFORMATION" || selectedGuardIds.length > 0;

  if (!selectedEstateId && user?.estate_ids && user.estate_ids.length > 1) {
    return (
      <View className={`flex-1 justify-center items-center p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`px-8 py-4 rounded-3xl border shadow-sm ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
        >
          <Text className="text-white font-black text-base">Select An Estate to File Report</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={`flex-1 p-5 pt-12 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
      
      {/* Tab Switcher Actions */}
      <View className="flex-row gap-3 mb-4">
        {[
          { id: "GENERAL", label: "General", icon: FileText, check: !displayHistory && category === "INFORMATION" },
          { id: "PERSONNEL", label: "Personnel", icon: Shield, check: !displayHistory && category === "COMPLAINT" },
          { id: "HISTORY", label: "History", icon: History, check: displayHistory }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                if (tab.id === "GENERAL") {
                  setCategory("INFORMATION");
                  setSelectedGuardIds([]);
                  setDsplayHistory(false);
                } else if (tab.id === "PERSONNEL") {
                  setCategory("COMPLAINT");
                  setDsplayHistory(false);
                } else {
                  setDsplayHistory(true);
                }
              }}
              className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
                tab.check
                  ? isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-gm-navy border-gray-200"
                  : isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-slate-100"
              }`}
            >
              <IconComponent size={18} color={tab.check ? "#D4AF37" : isDarkMode ? "#A0AEC0" : "#0A1F44"} />
              <Text className={`ml-2 font-oswald-semibold text-xs ${tab.check ? "text-gm-gold" : isDarkMode ? "text-slate-400" : "text-gm-navy"}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dynamic Context Banner Switcher */}
      {!displayHistory && user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mb-4 flex-row items-center justify-between p-4 rounded-3xl border ${
            isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-slate-100"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={14} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-600"} flex-1`}
              numberOfLines={1}
            >
              Filing to: {activeEstateName || "Switch Context"}
            </Text>
          </View>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {displayHistory && selectedEstateId ? (
        <View className="flex-1">
          <SecurityReportsHistory estate_id={selectedEstateId} />
        </View>
      ) : displayHistory ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 font-medium">Please select an estate context</Text>
        </View>
      ) : (
        <>
          <View className={`p-4 rounded-2xl mb-6 border ${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-100/50 border-slate-200"}`}>
            <Text className={`text-xs leading-5 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              {category === "INFORMATION"
                ? `Use this for general estate security issues, infrastructure, or suggestions on ${activeEstateName || "your property"}.`
                : "Report specific interactions or professional conduct regarding security personnel."}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {category === "COMPLAINT" && (
              <TouchableOpacity
                onPress={() => setIsModalVisible(true)}
                className={`p-5 rounded-3xl border mb-4 flex-row items-center justify-between ${
                  isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <View className="flex-row items-center">
                  <Users size={20} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
                  <Text className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}>
                    {selectedGuardIds.length > 0 ? `${selectedGuardIds.length} Selected` : "Select Personnel"}
                  </Text>
                </View>
                <Text className={`font-bold ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}>Edit</Text>
              </TouchableOpacity>
            )}

            {canShowInputs ? (
              <View className="flex gap-4">
                <View>
                  <Text className={`text-[10px] uppercase tracking-widest font-oswald-semibold mb-2 ml-1 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}>
                    Subject
                  </Text>
                  <TextInput
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="e.g., Gate malfunction, Guard sleeping..."
                    placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                    className={`p-4 rounded-3xl border text-base font-bold ${
                      isDarkMode ? "bg-gm-navy border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </View>

                <View>
                  <Text className={`text-[10px] uppercase tracking-widest font-oswald-semibold mb-2 ml-1 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}>
                    Detailed Description
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide as much detail as possible..."
                    placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    className={`p-5 rounded-[40px] border text-base min-h-[150px] font-medium ${
                      isDarkMode ? "bg-gm-navy border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  className={`p-5 rounded-3xl mt-4 items-center border shadow-sm ${
                    loading
                      ? isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-300"
                      : isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color={isDarkMode ? "#D4AF37" : "white"} />
                  ) : (
                    <Text className="text-white font-black text-lg">Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center mt-10">
                <AlertCircle size={40} color={isDarkMode ? "#475569" : "#cbd5e1"} />
                <Text className="text-slate-400 mt-2 font-medium">Please select personnel to continue</Text>
              </View>
            )}
          </ScrollView>

          {/* Personnel Selection Slide-up Sheet */}
          <Modal visible={isModalVisible} animationType="slide" transparent>
            <SafeAreaView className="flex-1 bg-black/50 justify-end">
              <View className={`h-[75%] rounded-t-[40px] p-6 border-t ${isDarkMode ? "bg-slate-900 border-gm-gold" : "bg-white border-transparent"}`}>
                <View className="flex-row justify-between items-center mb-6">
                  <View>
                    <Text className={`text-xl font-black ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}>
                      Security Personnel
                    </Text>
                    <Text className="text-slate-400 text-xs font-bold">{activeEstateName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={isDarkMode ? "#D4AF37" : "#000"} />
                  </TouchableOpacity>
                </View>

                {fetching ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDarkMode ? "#D4AF37" : "#6366f1"} />
                    <Text className="text-slate-400 mt-4 font-medium">Fetching personnel...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={allGuards}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const isSelected = selectedGuardIds.includes(item.id);
                      return (
                        <TouchableOpacity
                          onPress={() => toggleGuardSelection(item.id)}
                          className={`flex-row items-center p-4 rounded-2xl mb-2 border ${
                            isSelected 
                              ? isDarkMode ? "border-gm-gold bg-gm-navy" : "border-indigo-600 bg-indigo-50" 
                              : isDarkMode ? "border-slate-800 bg-slate-800/40" : "border-slate-100"
                          }`}
                        >
                          <Image
                            source={{ uri: item.avatar || "https://via.placeholder.com/150" }}
                            className="w-10 h-10 rounded-full"
                          />
                          <Text className={`ml-4 flex-1 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}>
                            {item.name}
                          </Text>
                          {isSelected && <Check size={20} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View className="items-center mt-12">
                        <Users size={40} color={isDarkMode ? "#475569" : "#cbd5e1"} />
                        <Text className="text-slate-400 mt-2 text-sm font-medium">
                          No personnel tracked under this account.
                        </Text>
                      </View>
                    }
                  />
                )}
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  className={`p-5 rounded-3xl mt-4 border ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
                >
                  <Text className="text-white text-center font-black">
                    Confirm ({selectedGuardIds.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        </>
      )}

      {/* Dynamic Context Picker Modal */}
      <Modal visible={estatePickerVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[2.5rem] p-6 max-h-[60%]`}>
            <View className="w-12 h-1 bg-slate-300 rounded-full align-self-center mb-6 mx-auto" />
            <Text className={`text-xl font-bold mb-4 ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}>
              Select Active Property Context
            </Text>
            <FlatList
              data={user?.estates || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedEstateId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEstateId(item.id);
                      setEstatePickerVisible(false);
                    }}
                    className={`p-4 rounded-2xl mb-3 border flex-row items-center ${
                      isSelected
                        ? isDarkMode ? "border-gm-gold bg-gm-navy" : "border-indigo-500 bg-indigo-50/40"
                        : isDarkMode ? "border-slate-800 bg-slate-800/40" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <MapPin size={20} color={isSelected ? (isDarkMode ? "#D4AF37" : "#4f46e5") : "#94a3b8"} />
                    <View className="ml-3 flex-1">
                      <Text className={`font-bold text-sm ${isSelected && isDarkMode ? "text-gm-gold" : isDarkMode ? "text-white" : "text-slate-800"}`}>
                        {item.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            {selectedEstateId && (
              <TouchableOpacity
                onPress={() => setEstatePickerVisible(false)}
                className={`mt-2 p-4 rounded-2xl items-center ${isDarkMode ? "bg-gm-charcoal border border-slate-800" : "bg-slate-200"}`}
              >
                <Text className={`font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}