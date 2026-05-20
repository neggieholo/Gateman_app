import {
  ChevronDown,
  FileText,
  History,
  MapPin,
  Send,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReportsHistory from "./components/ReportsHistory";
import { submitEstateReport } from "./services/api";
import { SubmitReportPayload } from "./services/interfaces";
import { useUser } from "./UserContext";

export default function ResolutionCenter() {
  const { user, isDarkMode } = useUser();
  const [activeTab, setActiveTab] = useState<"REPORT" | "HISTORY">("REPORT");
  const [loading, setLoading] = useState(false);

  // Estate Selection States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0]);
    }
  }, [user?.estate_ids]);

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const handleSubmit = async () => {
    if (!selectedEstateId) {
      Alert.alert("Context Missing", "Please select a property context first.");
      return;
    }
    if (!subject.trim() || !description.trim()) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    const payload: SubmitReportPayload = {
      estate_id: selectedEstateId,
      type: "GENERAL",
      category: "COMPLAINT",
      subject: subject.trim(),
      description: description.trim(),
    };

    const res = await submitEstateReport(payload);
    setLoading(false);

    if (res.success) {
      Alert.alert("Submitted", "Thank you. Your concern has been recorded.");
      setSubject("");
      setDescription("");
    } else {
      Alert.alert("Error", res.error || "Something went wrong.");
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Dynamic Estate Context Selector */}
        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity
            onPress={() => setEstatePickerVisible(true)}
            className={`mx-5 mb-4 flex-row items-center justify-between p-4 rounded-3xl border ${
              isDarkMode
                ? "bg-gm-navy border-gm-gold"
                : "bg-white border-slate-100"
            } shadow-sm`}
          >
            <View className="flex-row items-center flex-1">
              <MapPin size={14} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text
                className={`ml-2 text-xs font-black uppercase tracking-wider ${
                  isDarkMode ? "text-white" : "text-slate-600"
                } flex-1`}
                numberOfLines={1}
              >
                Acting For: {activeEstateName || "Select Property"}
              </Text>
            </View>
            <ChevronDown size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* Tab Switcher */}
        <View className="flex-row gap-3 px-5 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("REPORT")}
            className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
              activeTab === "REPORT"
                ? isDarkMode
                  ? "bg-gm-navy border-gm-gold"
                  : "bg-indigo-600 border-indigo-600"
                : isDarkMode
                  ? "bg-gm-charcoal border-slate-800"
                  : "bg-white border-slate-100"
            }`}
          >
            <FileText
              size={18}
              color={
                activeTab === "REPORT"
                  ? isDarkMode
                    ? "#D4AF37"
                    : "white"
                  : isDarkMode
                    ? "#A0AEC0"
                    : "#64748b"
              }
            />
            <Text
              className={`ml-2 font-oswald-semibold text-xs ${
                activeTab === "REPORT"
                  ? isDarkMode
                    ? "text-gm-gold"
                    : "text-white"
                  : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              New Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("HISTORY")}
            className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
              activeTab === "HISTORY"
                ? isDarkMode
                  ? "bg-gm-navy border-gm-gold"
                  : "bg-indigo-600 border-indigo-600"
                : isDarkMode
                  ? "bg-gm-charcoal border-slate-800"
                  : "bg-white border-slate-100"
            }`}
          >
            <History
              size={18}
              color={
                activeTab === "HISTORY"
                  ? isDarkMode
                    ? "#D4AF37"
                    : "white"
                  : isDarkMode
                    ? "#A0AEC0"
                    : "#64748b"
              }
            />
            <Text
              className={`ml-2 font-oswald-semibold text-xs ${
                activeTab === "HISTORY"
                  ? isDarkMode
                    ? "text-gm-gold"
                    : "text-white"
                  : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "REPORT" ? (
          <ScrollView showsVerticalScrollIndicator={false} className="px-5">
            <View
              className={`p-4 rounded-2xl mb-6 border ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-indigo-50/50 border-indigo-100"
              }`}
            >
              <Text
                className={`text-xs font-bold leading-5 text-center ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}
              >
                Suggest improvements or report infrastructure issues within the
                estate.
              </Text>
            </View>

            <View className="gap-y-5">
              <View>
                <Text
                  className={`text-[10px] uppercase tracking-[0.2em] font-oswald-semibold mb-2 ml-1 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                >
                  Subject
                </Text>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="e.g., Street light out, Broken pipe..."
                  placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                  className={`p-5 rounded-3xl border text-base font-bold ${
                    isDarkMode
                      ? "bg-gm-navy border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </View>

              <View>
                <Text
                  className={`text-[10px] uppercase tracking-[0.2em] font-oswald-semibold mb-2 ml-1 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                >
                  Detailed Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell management exactly what is wrong..."
                  placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className={`p-5 rounded-[40px] border text-base min-h-[180px] font-medium ${
                    isDarkMode
                      ? "bg-gm-navy border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className={`flex-row p-5 rounded-3xl mt-2 items-center justify-center border shadow-sm ${
                  loading
                    ? isDarkMode
                      ? "bg-gm-navy border-slate-800"
                      : "bg-slate-300"
                    : isDarkMode
                      ? "bg-gm-charcoal border-gm-gold"
                      : "bg-slate-900 border-transparent"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color={isDarkMode ? "#D4AF37" : "white"} />
                ) : (
                  <>
                    <Text className="text-white font-black text-lg mr-2">
                      Submit to Admin
                    </Text>
                    <Send size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
              <View className="h-10" />
            </View>
          </ScrollView>
        ) : selectedEstateId ? (
          <View className="flex-1">
            <ReportsHistory estate_id={selectedEstateId} />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-5">
            <Text className="text-slate-400 font-bold">
              Please select an estate context
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Slide-Up Estate Workspace Picker Sheet */}
      <Modal
        visible={estatePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[2.5rem] p-6 max-h-[60%]`}
          >
            <View className="w-12 h-1 bg-slate-300 rounded-full self-center mb-6 mx-auto" />
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}
            >
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
                        ? isDarkMode
                          ? "border-gm-gold bg-gm-navy"
                          : "border-indigo-500 bg-indigo-50/40"
                        : isDarkMode
                          ? "border-slate-800 bg-slate-800/40"
                          : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <MapPin
                      size={20}
                      color={
                        isSelected
                          ? isDarkMode
                            ? "#D4AF37"
                            : "#4f46e5"
                          : "#94a3b8"
                      }
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-bold text-sm ${isSelected && isDarkMode ? "text-gm-gold" : isDarkMode ? "text-white" : "text-slate-800"}`}
                      >
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
                <Text
                  className={`font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
