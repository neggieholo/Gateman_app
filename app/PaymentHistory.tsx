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
import { useUser } from "./UserContext";
import {
  deletePaymentLog,
  getCloudinaryUrl,
  getPaymentHistory,
  submitEstateReport,
  uploadPaymentLog,
} from "./services/api";
import { SubmitReportPayload } from "./services/interfaces";

// Mocking subcomponents if not imported externally
const InputField = ({ label, isDarkMode, ...props }: any) => (
  <View className="mb-4">
    <Text
      className={`text-[10px] font-oswald-semibold uppercase mb-1.5 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
    >
      {label}
    </Text>
    <TextInput
      className={`p-4 rounded-3xl text-base font-bold border ${
        isDarkMode
          ? "bg-gm-navy border-slate-800 text-white"
          : "bg-slate-50 border-slate-100 text-slate-800"
      }`}
      {...props}
    />
  </View>
);

const StatusBadge = ({ status }: { status: string }) => {
  const normStatus = status.toUpperCase();
  const isVerified = normStatus === "VERIFIED";
  const isPending = normStatus === "PENDING";

  return (
    <View
      className={`px-3 py-1.5 rounded-full self-start ${
        isVerified
          ? "bg-green-500/10"
          : isPending
            ? "bg-amber-500/10"
            : "bg-rose-500/10"
      }`}
    >
      <Text
        className={`text-xs font-black uppercase tracking-tight ${
          isVerified
            ? "text-green-500"
            : isPending
              ? "text-amber-500"
              : "text-rose-500"
        }`}
      >
        {status}
      </Text>
    </View>
  );
};

const PaymentHistory = () => {
  const { user, isDarkMode, theme } = useUser();
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
    receipt_url: "",
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
        estate_id: selectedEstateId,
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

  if (!selectedEstateId && user?.estate_ids && user.estate_ids.length > 1) {
    return (
      <View
        className={`flex-1 justify-center items-center p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
      >
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className="bg-slate-900 px-8 py-4 rounded-3xl border border-gm-gold shadow-sm"
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
        {/* Dynamic Context Banner Switcher */}
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
              <MapPin size={16} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text
                className={`ml-2 text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-700"} flex-1`}
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
          {(["UPLOAD", "HISTORY", "REPORTS"] as const).map((tab) => {
            const isSelected = activeTab === tab;
            let TabIcon = Upload;
            if (tab === "HISTORY") TabIcon = History;
            if (tab === "REPORTS") TabIcon = FileText;

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
                  isSelected
                    ? isDarkMode
                      ? "bg-gm-navy border-gm-gold"
                      : "bg-gm-navy border-gray-200"
                    : isDarkMode
                      ? "bg-gm-charcoal border-slate-800"
                      : "bg-white border-slate-100"
                }`}
              >
                <TabIcon
                  size={18}
                  color={
                    isSelected ? "#D4AF37" : isDarkMode ? "#A0AEC0" : "#0A1F44"
                  }
                />
                <Text
                  className={`ml-2 font-oswald-semibold text-xs ${isSelected ? "text-gm-gold" : isDarkMode ? "text-slate-400" : "text-gm-navy"}`}
                >
                  {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-1">
          {activeTab === "REPORTS" ? (
            <View className="flex-1">
              {selectedEstateId ? (
                <PaymentReportsHistory estate_id={selectedEstateId} />
              ) : (
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
              <Text
                className={`text-xl font-montserrat-bold mb-1 ${isDarkMode ? "text-white" : "text-gm-charcoal"}`}
              >
                Upload Payment Info
              </Text>
              <Text className="text-sm text-slate-500 font-bold mb-4">
                Logging to: {activeEstateName}
              </Text>

              <View
                className={`p-6 rounded-[40px] border mb-10 ${isDarkMode ? "bg-gm-navy border-gm-gold" : "border-slate-100 bg-white"}`}
              >
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
                    isDarkMode={isDarkMode}
                  />
                  <InputField
                    label="Payment For"
                    placeholder="e.g. Waste Management"
                    placeholderTextColor="#94a3b8"
                    value={form.category}
                    onChangeText={(v: string) =>
                      setForm({ ...form, category: v })
                    }
                    isDarkMode={isDarkMode}
                  />

                  {/* Method Selector */}
                  <View
                    className={`p-4 rounded-3xl ${isDarkMode ? "bg-gm-navy border border-slate-800" : "border border-slate-100 bg-slate-50"}`}
                  >
                    <Text
                      className={`text-[10px] font-oswald-semibold uppercase mb-2 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                    >
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
                            className={`flex-1 flex-row items-center p-3 rounded-2xl border ${
                              isSelected
                                ? isDarkMode
                                  ? "bg-gm-charcoal border-gm-gold"
                                  : "bg-indigo-50 border-indigo-600"
                                : isDarkMode
                                  ? "bg-gm-navy border-slate-800"
                                  : "bg-white border-slate-100"
                            }`}
                          >
                            <View
                              className={`w-4 h-4 rounded-full border items-center justify-center mr-2.5 ${
                                isSelected
                                  ? isDarkMode
                                    ? "border-gm-gold"
                                    : "border-indigo-600"
                                  : "border-slate-400"
                              }`}
                            >
                              {isSelected && (
                                <View
                                  className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-gm-gold" : "bg-indigo-600"}`}
                                />
                              )}
                            </View>
                            <Text
                              className={`font-bold text-xs ${isSelected ? (isDarkMode ? "text-gm-gold" : "text-indigo-900") : "text-slate-500"}`}
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
                    isDarkMode={isDarkMode}
                  />

                  {/* Date Input Box */}
                  <View
                    className={`p-4 rounded-3xl ${isDarkMode ? "bg-gm-navy border border-slate-800" : "border border-slate-100 bg-slate-50"}`}
                  >
                    <Text
                      className={`text-[10px] font-oswald-semibold uppercase mb-1.5 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                    >
                      Payment Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker("form")}
                      className={`p-4 rounded-2xl ${isDarkMode ? "bg-gm-charcoal border border-slate-800" : "bg-white border-slate-100"}`}
                    >
                      <Text
                        className={`${isDarkMode ? "text-white" : "text-gm-navy"} font-roboto-regular text-sm`}
                      >
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
                    className={`h-32 text-base font-bold p-4 ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    value={form.notes}
                    onChangeText={(v: string) => setForm({ ...form, notes: v })}
                    isDarkMode={isDarkMode}
                  />

                  {/* Image Picker Area */}
                  <TouchableOpacity
                    onPress={pickImage}
                    disabled={uploadingImage}
                    className={`h-48 border-2 border-dashed rounded-3xl items-center justify-center overflow-hidden mt-5 ${
                      isDarkMode
                        ? "border-gm-gold bg-gm-navy/50"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator
                        color={isDarkMode ? "#D4AF37" : "#6366f1"}
                        size="large"
                      />
                    ) : form.receipt_url ? (
                      <Image
                        source={{ uri: form.receipt_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <UploadCloud
                          size={30}
                          color={
                            isDarkMode ? "#D4AF37" : theme?.accent || "#6366f1"
                          }
                        />
                        <Text
                          className={`font-oswald-semibold mt-2 text-xs ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                        >
                          Upload Receipt Photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={uploadingRecord || uploadingImage}
                    className={`p-5 rounded-3xl items-center mt-6 border ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
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
              {/* Filter Bar */}
              <View className="flex-row gap-2 mb-6">
                {(["start", "end"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setShowDatePicker(type)}
                    className={`flex-1 p-3 rounded-2xl border flex-row items-center ${
                      isDarkMode
                        ? "bg-gm-navy border-slate-800"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <Calendar
                      size={16}
                      color={isDarkMode ? "#D4AF37" : "#6366f1"}
                    />
                    <View className="ml-2">
                      <Text
                        className={`text-[8px] uppercase font-oswald-semibold ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                      >
                        {type === "start" ? "Start Date" : "End Date"}
                      </Text>
                      <Text
                        className={`text-xs font-roboto-regular ${isDarkMode ? "text-white" : "text-gm-navy"}`}
                      >
                        {type === "start"
                          ? dates.start
                            ? dates.start.toLocaleDateString()
                            : "Select"
                          : dates.end
                            ? dates.end.toLocaleDateString()
                            : "Select"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={fetchHistory}
                  disabled={loading}
                  className={`px-5 rounded-2xl items-center justify-center border ${
                    isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-gm-navy"
                  }`}
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
                      className={`${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-slate-100"} p-5 rounded-[30px] border mb-4 shadow-sm`}
                    >
                      <View className="flex-row justify-between">
                        <View>
                          <Text
                            className={`text-[10px] font-oswald-semibold uppercase ${isDarkMode ? "text-slate-400" : "text-indigo-500"}`}
                          >
                            {item.category}
                          </Text>
                          <Text
                            className={`text-xl font-bold mt-0.5 ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                          >
                            ₦{item.amount}
                          </Text>
                        </View>
                        <StatusBadge status={item.status} />
                      </View>
                      <Text className="text-xs text-slate-400 font-bold mt-2">
                        {new Date(item.payment_date).toLocaleDateString()}
                      </Text>

                      {item.status.toUpperCase() !== "VERIFIED" && (
                        <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-slate-800/10">
                          <TouchableOpacity
                            className="flex-row items-center"
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
                              className="p-2 bg-rose-500/10 rounded-full"
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text className="text-center text-slate-400 mt-10 font-medium">
                    No records found for this estate context.
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Dispute Handling Modal */}
          <Modal visible={reportModal} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
              <View
                className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[40px] p-8 h-[70%]`}
              >
                <View className="flex-row justify-between items-center mb-6">
                  <Text
                    className={`text-xl font-montserrat-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                  >
                    Report Issue
                  </Text>
                  <TouchableOpacity onPress={() => setReportModal(false)}>
                    <XCircle
                      size={24}
                      color={isDarkMode ? "#D4AF37" : "#0A1F44"}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <InputField
                    label="Subject"
                    value={reportSubject}
                    onChangeText={setReportSubject}
                    isDarkMode={isDarkMode}
                  />
                  <InputField
                    label="Description"
                    placeholder="Explain the discrepancy..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    className={`h-40 text-base font-bold p-4 ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    isDarkMode={isDarkMode}
                  />
                  <TouchableOpacity
                    onPress={handleReportSubmit}
                    disabled={submittingReport}
                    className={`p-5 rounded-3xl items-center mt-6 border ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-gm-navy"}`}
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

        {/* Dynamic Context Picker Modal */}
        <Modal
          visible={estatePickerVisible}
          animationType="slide"
          transparent={true}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View
              className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[2.5rem] p-6 max-h-[60%]`}
            >
              <View className="w-12 h-1 bg-slate-300 rounded-full align-self-center mb-6 mx-auto" />
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

        {showDatePicker && (
          <DateTimePicker
            value={
              showDatePicker === "form"
                ? form.payment_date
                : showDatePicker === "start"
                  ? dates.start || new Date()
                  : dates.end || new Date()
            }
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PaymentHistory;

// // Internal sub components remain stable
// const InputField = ({ label, isDarkMode, ...props }: any) => (
//   <View
//     className={`p-4 ${isDarkMode ? " border border-gm-gold" : "border border-slate-100"}`}
//   >
//     <Text
//       className={`text-[10px] font-oswald-semibold ${isDarkMode ? "text-gm-gold" : "text-slate-400"} uppercase mb-1`}
//     >
//       {label}
//     </Text>
//     <TextInput
//       {...props}
//       className={`text-base font-roboto-regular ${isDarkMode ? "bg-gm-navy text-gray-200 border border-gm-gold" : "text-gm-navy bg-slate-50"} rounded-3xl`}
//     />
//   </View>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles = {
//     pending: { bg: "bg-amber-50", text: "text-amber-600", Icon: Clock },
//     verified: {
//       bg: "bg-emerald-50",
//       text: "text-emerald-600",
//       Icon: CheckCircle,
//     },
//     rejected: { bg: "bg-rose-50", text: "text-rose-600", Icon: XCircle },
//   };
//   const current = styles[status as keyof typeof styles] || styles.pending;
//   return (
//     <View
//       className={`${current.bg} px-3 py-1 rounded-full flex-row items-center h-fit`}
//     >
//       <current.Icon
//         size={12}
//         color={
//           status === "verified"
//             ? "#10b981"
//             : status === "rejected"
//               ? "#e11d48"
//               : "#f59e0b"
//         }
//       />
//       <Text className={`${current.text} text-[10px] font-black ml-1 uppercase`}>
//         {status}
//       </Text>
//     </View>
//   );
// };

// export default PaymentHistory;
