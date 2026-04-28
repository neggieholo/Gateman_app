import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  History,
  Shield,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
// import { useUser } from "@/app/UserContext";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import SecurityReportsHistory from "./SecurityReportsHistory";
import { getSecurityColleagues, submitEstateReport } from "./services/api";

export default function SubmitReport() {
  // const { user } = useUser();
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

  // Personnel Selection State (IDs only now)
  const [selectedGuardIds, setSelectedGuardIds] = useState<string[]>(
    params.targetId ? [params.targetId as string] : [],
  );

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const fetchGuards = async () => {
    // 1. Start fetching
    setFetching(true);

    try {
      const res = await getSecurityColleagues();

      if (res.success) {
        setAllGuards(res.securityGuards);
      } else {
        // Handle case where API returns success: false
        Alert.alert("Error", res.error || "Could not load security personnel.");
      }
    } catch (error) {
      // 2. Catch network/server errors
      console.error("Fetch Guards Error:", error);
      Alert.alert(
        "Network Error",
        "Please check your internet connection and try again.",
      );
    } finally {
      // 3. Always stop fetching, whether successful or failed
      setFetching(false);
    }
  };

  useEffect(() => {
    if (category === "COMPLAINT") {
      fetchGuards();
    }
  }, [category]);

  const toggleGuardSelection = (id: string) => {
    if (selectedGuardIds.includes(id)) {
      setSelectedGuardIds(selectedGuardIds.filter((gid) => gid !== id));
    } else {
      setSelectedGuardIds([...selectedGuardIds, id]);
    }
  };

  const handleSubmit = async () => {
    if (!subject || !description) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    const payload = {
      type: reportType,
      category: category,
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

  return (
    <View className="flex-1 bg-slate-50 p-5 pt-12">
      {/* 1. Select Type */}
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
            color={!displayHistory && category === "INFORMATION" ? "white" : "#64748b"}
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
            color={!displayHistory && category === "COMPLAINT" ? "white" : "#64748b"}
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

      {/* 2. Description Labels */}
      {displayHistory ? (
        <View className="flex-1">          
          <SecurityReportsHistory />
        </View>
      ) : (
        <>
          <View className="bg-slate-100/50 p-4 rounded-2xl mb-6">
            <Text className="text-slate-500 text-xs leading-5">
              {category === "INFORMATION"
                ? "Use this for general estate security issues, infrastructure, or suggestions."
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
                    placeholderTextColor={"text-slate-200"}
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

          {/* Personnel Selection Modal */}
          <Modal
            className="pb-10"
            visible={isModalVisible}
            animationType="slide"
            transparent
          >
            <SafeAreaView className="flex-1 bg-black/50 justify-end">
              <View className="bg-white h-[75%] rounded-t-[40px] p-6">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-black">Security Personnel</Text>
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
    </View>
  );
}
