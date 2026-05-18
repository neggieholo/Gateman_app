import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  History,
  MapPin,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UploadCloud,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import PaymentReportsHistory from "./PaymentReportsHistory";
import { useUser } from "./UserContext"; // Added User State Context hook
import {
  deletePaymentLog,
  getCloudinaryUrl,
  getPaymentHistory,
  submitEstateReport,
  uploadPaymentLog,
} from "./services/api";
import { SubmitReportPayload } from "./services/interfaces";

const PaymentHistory = () => {
  const { user, isDarkMode } = useUser(); // Access gate user preferences
  const [activeTab, setActiveTab] = useState<"UPLOAD" | "HISTORY" | "REPORTS">(
    "UPLOAD",
  );
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingRecord, setUploadingRecord] = useState(false);

  // Estate Control States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState<
    "form" | "start" | "end" | null
  >(null);
  const [dates, setDates] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [reportModal, setReportModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [reportSubject, setReportSubject] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    category: "",
    transaction_reference: "",
    notes: "",
    receipt_url: "string",
    payment_date: new Date(),
    payment_type: "bank_transfer",
  });

  useEffect(() => {
    if (!user?.estate_ids || user.estate_ids.length === 0) return;

    if (user.estate_ids.length === 1) {
      setSelectedEstateId(user.estate_ids[0]);
    } else if (!selectedEstateId) {
      setEstatePickerVisible(true);
    }
  }, [user?.estate_ids]);

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const fetchHistory = async () => {
    if (!selectedEstateId) return;

    if (!dates.start && !dates.end) {
      setLoading(true);
      try {
        const res = await getPaymentHistory(selectedEstateId);
        if (res.success) setHistory(res.history);
      } finally {
        setLoading(false);
      }
      return;
    }

    let start = dates.start;
    let end = dates.end;

    if (start && !end) {
      end = start;
    } else if (start && end && end < start) {
      Alert.alert(
        "Invalid Range",
        "End date cannot be earlier than start date.",
      );
      return;
    } else if (!start && end) {
      Alert.alert("Missing Start", "Please select a start date first.");
      return;
    }

    setLoading(true);
    const startStr = start ? start.toISOString().split("T")[0] : "";
    const endStr = end ? end.toISOString().split("T")[0] : "";

    try {
      // Pass estate context alongside dates
      const res = await getPaymentHistory(selectedEstateId, startStr, endStr);
      if (res.success) {
        setHistory(res.history);
      }
    } catch (e) {
      console.error("Fetch History Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "HISTORY" && selectedEstateId) {
      fetchHistory();
    }
  }, [activeTab, selectedEstateId]);

  const openReportModal = (payment: any) => {
    setSelectedPayment(payment);
    setReportSubject(`Dispute: ₦${payment.amount} - ${payment.category}`);
    setReportModal(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(null);
      return;
    }
    if (selectedDate) {
      if (showDatePicker === "form") {
        setForm((prev) => ({ ...prev, payment_date: selectedDate }));
      } else if (showDatePicker === "start") {
        setDates((prev) => ({ ...prev, start: selectedDate }));
      } else if (showDatePicker === "end") {
        setDates((prev) => ({ ...prev, end: selectedDate }));
      }
    }
    setShowDatePicker(null);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        setUploadingImage(true);
        const cloudUrl = await getCloudinaryUrl(result.assets[0].uri, "image");
        if (cloudUrl) {
          setForm((prev) => ({ ...prev, receipt_url: cloudUrl }));
        }
      }
    } catch (error) {
      console.error("Image Pick Error:", error);
      Alert.alert("Upload Error", "Could not process image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEstateId) {
      return Alert.alert(
        "Selection Required",
        "Please select an estate before uploading log.",
      );
    }

    setUploadingRecord(true);
    try {
      const payload = {
        ...form,
        estate_id: selectedEstateId, // Injected active estate target context here
        payment_date: form.payment_date.toISOString(),
      };

      const res = await uploadPaymentLog(payload);

      if (res && res.success) {
        Alert.alert("Success", "Payment submitted for verification");
        setForm({
          amount: "",
          category: "",
          transaction_reference: "",
          notes: "",
          receipt_url: "",
          payment_date: new Date(),
          payment_type: "bank_transfer",
        });
        setActiveTab("HISTORY");
      } else {
        Alert.alert("Error", res?.message || "Submission failed.");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      Alert.alert(
        "Network Error",
        "Please check your connection and try again.",
      );
    } finally {
      setUploadingRecord(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportDescription.trim()) {
      return Alert.alert("Required", "Please describe the issue.");
    }

    setSubmittingReport(true);
    try {
      const payload: SubmitReportPayload = {
        type: "PAYMENT",
        category: "COMPLAINT",
        subject: reportSubject.trim(),
        payment_id: selectedPayment.id,
        description: reportDescription.trim(),
        estate_id: selectedEstateId!,
      };

      const res = await submitEstateReport(payload);

      if (res.success) {
        Alert.alert("Submitted", "Your payment dispute has been logged.");
        setReportModal(false);
        setReportDescription("");
        setActiveTab("REPORTS");
      } else {
        Alert.alert(
          "Error",
          res.error || "Ensure 'PAYMENT' type exists in DB.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to the reporting service.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Log", "Are you sure you want to remove this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deletePaymentLog(id);
          if (res.success) {
            fetchHistory();
          } else {
            Alert.alert("Error", res.error);
          }
        },
      },
    ]);
  };

  // Fallback view state condition if a multi-property user backs out of selecting an active scope context
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
            Select An Estate to Continue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* 🔄 Dynamic Top Estate Context Banner Switcher (Only visible for users across multi estates) */}
        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity
            onPress={() => setEstatePickerVisible(true)}
            className={`mx-5 mb-4 flex-row items-center justify-between p-4 rounded-3xl border ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100"
            } shadow-sm`}
          >
            <View className="flex-row items-center flex-1">
              <MapPin size={16} color="#6366f1" />
              <Text
                className={`ml-2 text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"} flex-1`}
                numberOfLines={1}
              >
                Scope: {activeEstateName || "Switch Context"}
              </Text>
            </View>
            <ChevronDown size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* Tab Switcher */}
        <View className="flex-row gap-3 px-5 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("UPLOAD")}
            className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
              activeTab === "UPLOAD"
                ? "bg-indigo-600 border-indigo-600"
                : "bg-white border-slate-100"
            }`}
          >
            <Upload
              size={18}
              color={activeTab === "UPLOAD" ? "white" : "#64748b"}
            />
            <Text
              className={`ml-2 font-bold ${activeTab === "UPLOAD" ? "text-white" : "text-slate-500"}`}
            >
              Upload
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

          <TouchableOpacity
            onPress={() => setActiveTab("REPORTS")}
            className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
              activeTab === "REPORTS"
                ? "bg-indigo-600 border-indigo-600"
                : "bg-white border-slate-100"
            }`}
          >
            <FileText
              size={20}
              color={activeTab === "REPORTS" ? "white" : "#64748b"}
            />
            <Text
              className={`ml-2 font-bold ${activeTab === "REPORTS" ? "text-white" : "text-slate-500"}`}
            >
              Reports
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          {activeTab === "REPORTS" ? (
            <View className="flex-1">
              {selectedEstateId ? (
                <PaymentReportsHistory estate_id={selectedEstateId} />
              ) : (
                /* Fallback state displayed if no property context has been active or resolved yet */
                <View className="flex-1 justify-center items-center p-6">
                  <View className="items-center max-w-[280px]">
                    <Text
                      className={`text-base font-black text-center ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                    >
                      No Property Selected
                    </Text>
                    <Text className="text-xs text-slate-400 text-center mt-2 font-medium">
                      Please choose an active estate context from the menu above
                      to review financial statement records.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : activeTab === "UPLOAD" ? (
            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-black text-slate-900 mb-2">
                Upload Payment Info
              </Text>
              <Text className="text-xs text-slate-400 font-bold mb-4">
                Logging to: {activeEstateName}
              </Text>

              <View className="bg-white p-6 rounded-[40px] border border-slate-100 mb-10">
                <View className="space-y-4">
                  <InputField
                    label="Amount Paid (₦)"
                    placeholder="5000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={form.amount}
                    onChangeText={(v: string) =>
                      setForm({ ...form, amount: v })
                    }
                  />
                  <InputField
                    label="Payment For"
                    placeholder="e.g. Waste Management"
                    placeholderTextColor="#94a3b8"
                    value={form.category}
                    onChangeText={(v: string) =>
                      setForm({ ...form, category: v })
                    }
                  />

                  <View className="p-4 border border-slate-100">
                    <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
                      Select Payment Method
                    </Text>
                    <View className="flex-row gap-3">
                      {[
                        { id: "bank_transfer", label: "Bank Transfer" },
                        { id: "card", label: "Card Payment" },
                      ].map((item) => {
                        const isSelected = form.payment_type === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() =>
                              setForm({ ...form, payment_type: item.id })
                            }
                            activeOpacity={0.7}
                            className={`flex-1 flex-row items-center p-2 rounded-3xl border-2 ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-600"
                                : "bg-white border-slate-100"
                            }`}
                          >
                            <View
                              className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-600"
                                  : "border-slate-300"
                              }`}
                            >
                              {isSelected && (
                                <View className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </View>
                            <Text
                              className={`font-bold text-xs ${isSelected ? "text-indigo-900" : "text-slate-500"}`}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <InputField
                    label={
                      form.payment_type === "bank_transfer"
                        ? "Bank Session ID / Ref"
                        : "Gateway Ref ID"
                    }
                    placeholder="Enter reference number"
                    placeholderTextColor="#94a3b8"
                    value={form.transaction_reference}
                    onChangeText={(v: string) =>
                      setForm({ ...form, transaction_reference: v })
                    }
                  />

                  <View className="p-4 border border-slate-100">
                    <Text className="text-[10px] font-black text-slate-400 uppercase mb-1">
                      Payment Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker("form")}
                      className="bg-slate-50 p-4 rounded-3xl border border-slate-100"
                    >
                      <Text className="text-base font-bold text-slate-800">
                        {form.payment_date.toDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <InputField
                    label="Additional Notes"
                    placeholder="Write details here..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="h-32 text-base font-bold text-slate-800"
                    value={form.notes}
                    onChangeText={(v: string) => setForm({ ...form, notes: v })}
                  />

                  <TouchableOpacity
                    onPress={pickImage}
                    disabled={uploadingImage}
                    className="h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl items-center justify-center overflow-hidden"
                  >
                    {uploadingImage ? (
                      <ActivityIndicator color="#6366f1" size="large" />
                    ) : form.receipt_url &&
                      form.receipt_url !== "string" &&
                      form.receipt_url !== "" ? (
                      <Image
                        source={{ uri: form.receipt_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <UploadCloud size={30} color="#6366f1" />
                        <Text className="text-slate-400 font-bold mt-2">
                          Upload Receipt Photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={uploadingRecord || uploadingImage}
                    className="bg-slate-900 p-5 rounded-3xl items-center mt-4"
                  >
                    {uploadingRecord ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-black text-lg">
                        Submit Record
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 px-6">
              {/* Date Filter Bar */}
              <View className="flex-row gap-2 mb-6">
                <TouchableOpacity
                  onPress={() => setShowDatePicker("start")}
                  className="flex-1 bg-white p-3 rounded-2xl border border-slate-100 flex-row items-center"
                >
                  <Calendar size={16} color="#6366f1" />
                  <View className="ml-2">
                    <Text className="text-[8px] font-black text-slate-400 uppercase">
                      Start Date
                    </Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {dates.start
                        ? dates.start.toLocaleDateString()
                        : "Select"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDatePicker("end")}
                  className="flex-1 bg-white p-3 rounded-2xl border border-slate-100 flex-row items-center"
                >
                  <Calendar size={16} color="#6366f1" />
                  <View className="ml-2">
                    <Text className="text-[8px] font-black text-slate-400 uppercase">
                      End Date
                    </Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {dates.end ? dates.end.toLocaleDateString() : "Select"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={fetchHistory}
                  disabled={loading}
                  className="bg-indigo-600 px-5 rounded-2xl items-center justify-center"
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Search size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {history.length > 0 ? (
                  history.map((item: any) => (
                    <View
                      key={item.id}
                      className="bg-white p-5 rounded-[30px] border border-slate-100 mb-4 shadow-sm"
                    >
                      <View className="flex-row justify-between">
                        <View>
                          <Text className="text-[10px] font-black text-indigo-500 uppercase">
                            {item.category}
                          </Text>
                          <Text className="text-xl font-black text-slate-900">
                            ₦{item.amount}
                          </Text>
                        </View>
                        <StatusBadge status={item.status} />
                      </View>
                      <Text className="text-xs text-slate-400 font-bold mt-2">
                        {new Date(item.payment_date).toLocaleDateString()}
                      </Text>
                      <View className="flex-row justify-between items-center">
                        <TouchableOpacity
                          className="mt-4 pt-4 border-t border-slate-50 flex-row items-center"
                          onPress={() => openReportModal(item)}
                        >
                          <ShieldAlert size={16} color="#ef4444" />
                          <Text className="ml-2 text-rose-600 font-black text-xs uppercase tracking-tight">
                            Make a Report / Dispute
                          </Text>
                        </TouchableOpacity>
                        {item.status.toUpperCase() === "PENDING" && (
                          <TouchableOpacity
                            onPress={() => handleDelete(item.id)}
                            className="absolute top-4 right-4 p-2 bg-rose-50 rounded-full"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text className="text-center text-slate-400 mt-10">
                    No records found for this estate context.
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Dispute Handling Modal */}
          <Modal visible={reportModal} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white rounded-t-[40px] p-8 h-[70%]">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-black text-slate-900">
                    Report Issue
                  </Text>
                  <TouchableOpacity onPress={() => setReportModal(false)}>
                    <XCircle size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <InputField
                    label="Subject"
                    value={reportSubject}
                    onChangeText={setReportSubject}
                  />
                  <InputField
                    label="Description"
                    placeholder="Explain the discrepancy..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    className="h-40 text-base font-bold text-slate-800"
                    value={reportDescription}
                    onChangeText={setReportDescription}
                  />
                  <TouchableOpacity
                    onPress={handleReportSubmit}
                    disabled={submittingReport}
                    className="bg-indigo-600 p-5 rounded-3xl items-center mt-6"
                  >
                    {submittingReport ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-black text-lg">
                        Submit Complaint
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>

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
                      color={
                        selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"
                      }
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

        {showDatePicker && (
          <DateTimePicker
            value={
              showDatePicker === "start"
                ? dates.start || new Date()
                : showDatePicker === "end"
                  ? dates.end || new Date()
                  : form.payment_date
            }
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Internal sub components remain stable
const InputField = ({ label, ...props }: any) => (
  <View className="p-4 border border-slate-100">
    <Text className="text-[10px] font-black text-slate-400 uppercase mb-1">
      {label}
    </Text>
    <TextInput
      {...props}
      className="text-base font-bold text-slate-800 bg-slate-50 rounded-3xl"
    />
  </View>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: { bg: "bg-amber-50", text: "text-amber-600", Icon: Clock },
    verified: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      Icon: CheckCircle,
    },
    rejected: { bg: "bg-rose-50", text: "text-rose-600", Icon: XCircle },
  };
  const current = styles[status as keyof typeof styles] || styles.pending;
  return (
    <View
      className={`${current.bg} px-3 py-1 rounded-full flex-row items-center h-fit`}
    >
      <current.Icon
        size={12}
        color={
          status === "verified"
            ? "#10b981"
            : status === "rejected"
              ? "#e11d48"
              : "#f59e0b"
        }
      />
      <Text className={`${current.text} text-[10px] font-black ml-1 uppercase`}>
        {status}
      </Text>
    </View>
  );
};

export default PaymentHistory;
