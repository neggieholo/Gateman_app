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
import { useUser } from "./UserContext"; // Linked User Context hook

export default function SubmitReport() {
  const { user, isDarkMode } = useUser();
  const params = useLocalSearchParams();

  // States
  const [reportType, setReportType] = useState<"GENERAL" | "SECURITY">(
    "SECURITY",
  );
  const [category, setCategory] = useState<"COMPLAINT" | "INFORMATION">(
    "COMPLAINT",
  );
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

  // 1. Establish property/estate boundaries on mount
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
      // Isolate guard lookups to current context
      const res = await getSecurityColleagues(estateId);

      if (res.success) {
        setAllGuards(res.securityGuards || []);
      } else {
        Alert.alert("Error", res.error || "Could not load security personnel.");
      }
    } catch (error) {
      console.error("Fetch Guards Error:", error);
      Alert.alert(
        "Network Error",
        "Please check your internet connection and try again.",
      );
    } finally {
      setFetching(false);
    }
  };

  // Synchronize guard details query dynamically with chosen workspace parameter
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
      Alert.alert(
        "Success",
        "Your report has been submitted to estate management.",
      );
      router.back();
    } else {
      Alert.alert("Submission Failed", res.error || "Something went wrong.");
    }
  };

  const canShowInputs =
    category === "INFORMATION" || selectedGuardIds.length > 0;

  // Render contextual baseline lock message if multi-estate selection gets bypassed
  if (!selectedEstateId && user?.estate_ids && user.estate_ids.length > 1) {
    return (
      <View
        className={`flex-1 justify-center items-center p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
      >
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-sm"
        >
          <Text className="text-white font-black text-base">
            Select An Estate to File Report
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 p-5 pt-12 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {/* Tab Switcher Actions */}
      <View className="flex-row gap-3 mb-4">
        <TouchableOpacity
          onPress={() => {
            setCategory("INFORMATION");
            setSelectedGuardIds([]);
            setDsplayHistory(false);
          }}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${!displayHistory && category === "INFORMATION" ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-100"}`}
        >
          <FileText
            size={20}
            color={
              !displayHistory && category === "INFORMATION"
                ? "white"
                : "#64748b"
            }
          />
          <Text
            className={`ml-2 font-bold ${!displayHistory && category === "INFORMATION" ? "text-white" : "text-slate-500"}`}
          >
            General
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setCategory("COMPLAINT");
            setDsplayHistory(false);
          }}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${!displayHistory && category === "COMPLAINT" ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-100"}`}
        >
          <Shield
            size={20}
            color={
              !displayHistory && category === "COMPLAINT" ? "white" : "#64748b"
            }
          />
          <Text
            className={`ml-2 font-bold ${!displayHistory && category === "COMPLAINT" ? "text-white" : "text-slate-500"}`}
          >
            Personnel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDsplayHistory(true)}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${displayHistory ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-100"}`}
        >
          <History size={20} color={displayHistory ? "white" : "#64748b"} />
          <Text
            className={`ml-2 font-bold ${displayHistory ? "text-white" : "text-slate-500"}`}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🔄 Dynamic Context Banner Switcher for Multi-property environments */}
      {!displayHistory && user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mb-4 flex-row items-center justify-between p-3.5 rounded-2xl border ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-100"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={14} color="#6366f1" />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-600"} flex-1`}
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
        /* Fallback view if history is open but no estate is active yet */
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400">
            Please select an estate context
          </Text>
        </View>
      ) : (
        <>
          <View className="bg-slate-100/50 p-4 rounded-2xl mb-6">
            <Text className="text-slate-500 text-xs leading-5">
              {category === "INFORMATION"
                ? `Use this for general estate security issues, infrastructure, or suggestions on ${activeEstateName || "your property"}.`
                : "Report specific interactions or professional conduct regarding security personnel."}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {category === "COMPLAINT" && (
              <TouchableOpacity
                onPress={() => setIsModalVisible(true)}
                className="bg-white p-5 rounded-3xl border border-slate-200 mb-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Users size={20} color="#6366f1" />
                  <Text className="ml-3 font-bold text-slate-700">
                    {selectedGuardIds.length > 0
                      ? `${selectedGuardIds.length} Selected`
                      : "Select Personnel"}
                  </Text>
                </View>
                <Text className="text-indigo-600 font-bold">Edit</Text>
              </TouchableOpacity>
            )}

            {canShowInputs ? (
              <View className="flex gap-4">
                <View>
                  <Text className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-2 ml-1">
                    Subject
                  </Text>
                  <TextInput
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="e.g., Gate malfunction, Guard sleeping..."
                    placeholderTextColor="#94a3b8"
                    className="bg-white p-4 rounded-2xl border border-slate-200 text-slate-800 font-medium"
                  />
                </View>

                <View>
                  <Text className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-2 ml-1">
                    Detailed Description
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide as much detail as possible..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    className="bg-white p-4 rounded-3xl border border-slate-200 text-slate-800 min-h-[150px]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  className={`p-5 rounded-3xl mt-4 items-center ${loading ? "bg-slate-300" : "bg-indigo-600"}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-black text-lg">
                      Submit Report
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center mt-10">
                <AlertCircle size={40} color="#cbd5e1" />
                <Text className="text-slate-400 mt-2 font-medium">
                  Please select personnel to continue
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Personnel Selection Slide-up Sheet */}
          <Modal visible={isModalVisible} animationType="slide" transparent>
            <SafeAreaView className="flex-1 bg-black/50 justify-end">
              <View className="bg-white h-[75%] rounded-t-[40px] p-6">
                <View className="flex-row justify-between items-center mb-6">
                  <View>
                    <Text className="text-xl font-black">
                      Security Personnel
                    </Text>
                    <Text className="text-slate-400 text-xs font-bold">
                      {activeEstateName}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                {fetching ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text className="text-slate-400 mt-4 font-medium">
                      Fetching personnel...
                    </Text>
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
                          className={`flex-row items-center p-4 rounded-2xl mb-2 border ${isSelected ? "border-indigo-600 bg-indigo-50" : "border-slate-100"}`}
                        >
                          <Image
                            source={{
                              uri:
                                item.avatar ||
                                "https://via.placeholder.com/150",
                            }}
                            className="w-10 h-10 rounded-full"
                          />
                          <Text className="ml-4 flex-1 font-bold text-slate-700">
                            {item.name}
                          </Text>
                          {isSelected && <Check size={20} color="#4f46e5" />}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View className="items-center mt-12">
                        <Users size={40} color="#cbd5e1" />
                        <Text className="text-slate-400 mt-2 text-sm font-medium">
                          No personnel tracked under this account.
                        </Text>
                      </View>
                    }
                  />
                )}
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  className="bg-indigo-600 p-5 rounded-3xl mt-4"
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

      {/* Dynamic Modal Selector for Context Switcher */}
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
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Select Active Property Context
            </Text>
            <FlatList
              data={user?.estates || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedEstateId(item.id);
                    setEstatePickerVisible(false);
                  }}
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
    </View>
  );
}
