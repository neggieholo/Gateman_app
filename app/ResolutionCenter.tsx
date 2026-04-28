import { FileText, History, Send } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

export default function ResolutionCenter() {
  const [activeTab, setActiveTab] = useState<"REPORT" | "HISTORY">("REPORT");
  const [loading, setLoading] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    const payload: SubmitReportPayload = {
      type: "GENERAL" , 
      category: "COMPLAINT" ,
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
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Tab Switcher */}
        <View className="flex-row gap-3 px-5 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("REPORT")}
            className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
              activeTab === "REPORT"
                ? "bg-indigo-600 border-indigo-600"
                : "bg-white border-slate-100"
            }`}
          >
            <FileText
              size={18}
              color={activeTab === "REPORT" ? "white" : "#64748b"}
            />
            <Text
              className={`ml-2 font-bold ${activeTab === "REPORT" ? "text-white" : "text-slate-500"}`}
            >
              New Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("HISTORY")}
            className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
              activeTab === "HISTORY"
                ? "bg-indigo-600 border-indigo-600"
                : "bg-white border-slate-100"
            }`}
          >
            <History
              size={18}
              color={activeTab === "HISTORY" ? "white" : "#64748b"}
            />
            <Text
              className={`ml-2 font-bold ${activeTab === "HISTORY" ? "text-white" : "text-slate-500"}`}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "REPORT" ? (
          <ScrollView showsVerticalScrollIndicator={false} className="px-5">
            <View className="bg-indigo-50/50 p-4 rounded-2xl mb-6 border border-indigo-100">
              <Text className="text-indigo-600 text-xs font-bold leading-5 text-center">
                Suggest improvements or report infrastructure issues within the
                estate.
              </Text>
            </View>

            <View className="gap-y-5">
              <View>
                <Text className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2 ml-1">
                  Subject
                </Text>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="e.g., Street light out, Broken pipe..."
                  placeholderTextColor="#cbd5e1"
                  className="bg-white p-5 rounded-2xl border border-slate-200 text-slate-800 font-bold"
                />
              </View>

              <View>
                <Text className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2 ml-1">
                  Detailed Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell management exactly what is wrong..."
                  placeholderTextColor="#cbd5e1"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className="bg-white p-5 rounded-[30px] border border-slate-200 text-slate-800 min-h-[180px] font-medium"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className={`flex-row p-5 rounded-[25px] mt-2 items-center justify-center shadow-lg ${
                  loading
                    ? "bg-slate-300 shadow-none"
                    : "bg-indigo-600 shadow-indigo-200"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
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
        ) : (
          <View className="flex-1">
            <ReportsHistory />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
