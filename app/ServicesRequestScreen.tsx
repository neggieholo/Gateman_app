import {
  Check,
  CheckCircle,
  ChevronDown,
  FileText,
  History,
  MapPin,
  ShieldAlert,
  Trash2,
  Truck,
  Wrench,
  XCircle,
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
import ServicesReportsHistory from "./ServicesReportsHistory";
import { useUser } from "./UserContext";
import {
  deleteServiceRequest,
  getEstateServicesCatalog,
  getServiceRequestsHistory,
  submitEstateReport,
  submitServiceRequest,
  updateServiceRequestCompletion,
} from "./services/api";
import { ServiceRequest, SubmitReportPayload } from "./services/interfaces";

// Reusable Custom Input Fields
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

// Dynamic Status Tracker Badge
const StatusBadge = ({
  isDispatched,
  isCompleted,
}: {
  isDispatched: boolean;
  isCompleted: boolean;
}) => {
  let badgeLabel = "PENDING";
  let badgeStyle = "bg-amber-500/10 text-amber-500";

  if (isCompleted) {
    badgeLabel = "COMPLETED";
    badgeStyle = "bg-green-500/10 text-green-500";
  } else if (isDispatched) {
    badgeLabel = "DISPATCHED";
    badgeStyle = "bg-blue-500/10 text-blue-500";
  }

  return (
    <View
      className={`px-3 py-1.5 rounded-full self-start ${badgeStyle.split(" ")[0]}`}
    >
      <Text
        className={`text-xs font-black uppercase tracking-tight ${badgeStyle.split(" ")[1]}`}
      >
        {badgeLabel}
      </Text>
    </View>
  );
};

export default function ServiceRequestsScreen() {
  const { user, isDarkMode } = useUser();
  const [activeTab, setActiveTab] = useState<
    "CREATE" | "HISTORY" | "COMPLAINTS"
  >("CREATE");
  const [loading, setLoading] = useState(false);
  const [submittingRecord, setUploadingRecord] = useState(false);

  // Estate Context States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // Core Service Data Handling
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [history, setHistory] = useState<ServiceRequest[]>([]);
  const [complaintModal, setComplaintModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [vendorModalVisible, setVendorModalVisible] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [updatingCompletionId, setUpdatingCompletionId] = useState<
    string | null
  >(null);

  // Time Window Configurations
  const timeSlots = [
    "Morning (9AM - 12PM)",
    "Afternoon (12PM - 4PM)",
    "Evening (4PM - 7PM)",
  ];

  // Primary Form State Hook Map
  const [form, setForm] = useState({
    service_id: "",
    service_name: "",
    unit: "",
    time_preferred: "Morning (9AM - 12PM)",
    description: "",
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

  useEffect(() => {
    if (selectedEstateId) {
      console.log("initiating catalogue fetch");
      fetchServicesCatalog();
    }
  }, [selectedEstateId]);

  const fetchServicesCatalog = async () => {
    try {
      const res = await getEstateServicesCatalog(selectedEstateId!);
      if (res.success) setServicesCatalog(res.services || []);
    } catch (err) {
      console.error("Catalog retrieval error: ", err);
    }
  };

  const fetchHistory = async () => {
    if (!selectedEstateId) return;
    setLoading(true);
    try {
      const res = await getServiceRequestsHistory(selectedEstateId);
      if (res.success) setHistory(res.requests || []);
    } catch (e) {
      console.error("Fetch Request Ledger Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const flatLocationList = useMemo(() => {
    if (
      !selectedEstateId ||
      !user?.locations ||
      !user.locations[selectedEstateId]
    ) {
      return [];
    }

    const contextLocations = user.locations[selectedEstateId];
    const flatList: { id: string; block: string; unit: string }[] = [];

    contextLocations.forEach((loc) => {
      if (Array.isArray(loc.unit)) {
        loc.unit.forEach((unitStr) => {
          flatList.push({
            id: `${loc.block}-${unitStr}`,
            block: loc.block,
            unit: unitStr,
          });
        });
      }
    });

    return flatList;
  }, [user?.locations, selectedEstateId]);

  useEffect(() => {
    if (activeTab === "HISTORY" && selectedEstateId) {
      fetchHistory();
    }
  }, [activeTab, selectedEstateId]);

  const openReportModal = (request: any) => {
    setSelectedService(request);
    setComplaintSubject(
      `Complaint about ${request.service_name} service on ${new Date(request.requested_at).toLocaleDateString()}`,
    );
    setComplaintModal(true);
  };

  const handleReportSubmit = async () => {
    if (!complaintDescription.trim()) {
      return Alert.alert("Required", "Please describe the issue.");
    }

    setSubmittingComplaint(true);
    try {
      const payload: SubmitReportPayload = {
        type: "SERVICES",
        category: "COMPLAINT",
        subject: complaintSubject.trim(),
        description: complaintDescription.trim(),
        estate_id: selectedEstateId!,
      };

      const res = await submitEstateReport(payload);

      if (res.success) {
        Alert.alert(
          "Submitted",
          "Your maintenance service complaint has been logged.",
        );
        setComplaintModal(false);
        setComplaintDescription("");
        setActiveTab("COMPLAINTS");
      } else {
        Alert.alert(
          "Error",
          res.error || "Ensure 'PAYMENT' type exists in DB.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to the reporting service.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to delete this maintenance entry?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteServiceRequest(id);

              if (res && res.success) {
                Alert.alert("Deleted", "Service request removed.");
                fetchHistory();
              } else {
                Alert.alert(
                  "Error",
                  res?.message || "Failed to delete the request.",
                );
              }
            } catch (error) {
              console.error("Delete handler error:", error);
              Alert.alert(
                "Network Error",
                "Could not connect to the server. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!selectedEstateId) {
      return Alert.alert(
        "Selection Required",
        "Please choose an active estate context.",
      );
    }
    if (!form.service_id) {
      return Alert.alert(
        "Required Field",
        "Please pick a service category from the roster.",
      );
    }
    if (!form.description.trim()) {
      return Alert.alert(
        "Required Field",
        "Please describe your maintenance issue brief.",
      );
    }

    setUploadingRecord(true);
    try {
      const payload = {
        estate_id: selectedEstateId,
        service_id: form.service_id,
        unit: form.unit,
        time_preferred: form.time_preferred,
        description: form.description.trim(),
      };

      const res = await submitServiceRequest(payload);

      if (res && res.success) {
        Alert.alert(
          "Success",
          "Maintenance work request submitted successfully.",
        );
        setForm({
          service_id: "",
          service_name: "",
          unit: "",
          time_preferred: "Morning (9AM - 12PM)",
          description: "",
        });
        setActiveTab("HISTORY");
      } else {
        Alert.alert("Error", res?.message || "Submission processing error.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Could not commit request log down.");
    } finally {
      setUploadingRecord(false);
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
        {/* Estate Scope Selector */}
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

        {/* Dynamic Tab Toggle Panels */}
        <View className="flex-row gap-3 px-5 mb-4">
          {(["CREATE", "HISTORY", "COMPLAINTS"] as const).map((tab) => {
            const isSelected = activeTab === tab;
            const TabIcon =
              tab === "CREATE"
                ? Wrench
                : tab === "COMPLAINTS"
                  ? FileText
                  : History;

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
                  {tab === "CREATE"
                    ? "Book Request"
                    : tab === "HISTORY"
                      ? "Request Logs"
                      : "Complaints"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* View Layout Router Router Content Core */}
        <View className="flex-1">
          {activeTab === "CREATE" && (
            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
              <Text
                className={`text-xl font-montserrat-bold mb-1 ${isDarkMode ? "text-white" : "text-gm-charcoal"}`}
              >
                Book Maintenance Service
              </Text>
              <Text className="text-sm text-slate-500 font-bold mb-4">
                Logging to: {activeEstateName}
              </Text>

              <View
                className={`p-6 rounded-[40px] border mb-10 ${isDarkMode ? "bg-gm-navy border-gm-gold" : "border-slate-100 bg-white"}`}
              >
                <View className="space-y-4">
                  <View className="mb-4">
                    <Text
                      className={`text-[10px] font-oswald-semibold uppercase mb-1.5 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                    >
                      Select Service Category
                    </Text>
                    <TouchableOpacity
                      onPress={() => setServicePickerVisible(true)}
                      className={`flex-row justify-between items-center p-4 rounded-3xl border ${
                        isDarkMode
                          ? "bg-gm-navy border-slate-800 text-white"
                          : "bg-slate-50 border-slate-100 text-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${form.service_name ? (isDarkMode ? "text-white" : "text-slate-800") : "text-slate-400"}`}
                      >
                        {form.service_name || "Choose category..."}
                      </Text>
                      <ChevronDown size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* Preferred Appointment Slot Selector */}
                  <View
                    className={`p-4 rounded-3xl mb-2 ${isDarkMode ? "bg-gm-navy border border-slate-800" : "border border-slate-100 bg-slate-50"}`}
                  >
                    <Text
                      className={`text-[10px] font-oswald-semibold uppercase mb-2 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                    >
                      Preferred Timing Window
                    </Text>
                    <View className="space-y-2">
                      {timeSlots.map((slot) => {
                        const isSelected = form.time_preferred === slot;
                        return (
                          <TouchableOpacity
                            key={slot}
                            onPress={() =>
                              setForm({ ...form, time_preferred: slot })
                            }
                            className={`flex-row items-center p-3 rounded-2xl border ${
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
                              className={`w-4 h-4 rounded-full border items-center justify-center mr-2.5 ${isSelected ? (isDarkMode ? "border-gm-gold" : "border-indigo-600") : "border-slate-400"}`}
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
                              {slot}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Problem Brief Input Text Area */}
                  <InputField
                    label="Job Description / Brief"
                    placeholder="Provide details about the dynamic issue (e.g., Kitchen sink pipe leak since morning)..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    className={`h-36 text-base font-bold border border-slate-800 rounded-3xl p-4 ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    value={form.description}
                    onChangeText={(v: string) =>
                      setForm({ ...form, description: v })
                    }
                    isDarkMode={isDarkMode}
                  />
                  {/* Residential Unit Picker Input Block Wrapper */}
                  <View className="mb-4">
                    <Text
                      className={`text-[10px] font-oswald-semibold uppercase mb-1.5 ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}
                    >
                      Your Unit Location
                    </Text>
                    <TouchableOpacity
                      onPress={() => setUnitPickerVisible(true)}
                      className={`flex-row justify-between items-center p-4 rounded-3xl border ${
                        isDarkMode
                          ? "bg-gm-navy border-slate-800 text-white"
                          : "bg-slate-50 border-slate-100 text-slate-800"
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${form.unit ? (isDarkMode ? "text-white" : "text-slate-800") : "text-slate-400"}`}
                      >
                        {form.unit || "Choose your unit location..."}
                      </Text>
                      <ChevronDown size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* Submission Button Commit Layout */}
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submittingRecord}
                    className={`p-5 rounded-3xl items-center mt-6 border ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
                  >
                    {submittingRecord ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-black text-lg">
                        File Maintenance Request
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {activeTab === "HISTORY" && (
            <View className="flex-1 px-6">
              <ScrollView showsVerticalScrollIndicator={false}>
                {loading ? (
                  <ActivityIndicator
                    color={isDarkMode ? "#D4AF37" : "#6366f1"}
                    size="large"
                    className="mt-10"
                  />
                ) : history.length > 0 ? (
                  history.map((item: any) => (
                    <View
                      key={item.id}
                      className={`${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-slate-100"} p-5 rounded-[30px] border mb-4 shadow-sm`}
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-2">
                          <Text
                            className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}
                          >
                            {item.service_name || "General Maintenance Service"}
                          </Text>
                          <Text
                            className={`text-sm font-medium mt-2 mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                            numberOfLines={3}
                          >
                            {item.description}
                          </Text>
                        </View>
                        <StatusBadge
                          isDispatched={item.is_dispatched}
                          isCompleted={item.is_completed}
                        />
                      </View>

                      {/* Dispatched Contractors Prompt Link */}
                      {item.is_dispatched &&
                        item.assigned_vendors?.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedVendors(item.assigned_vendors);
                              setVendorModalVisible(true);
                            }}
                            className={`mt-2 p-3 rounded-2xl flex-row items-center gap-2 ${isDarkMode ? "bg-gm-charcoal/50" : "bg-indigo-50/50"}`}
                          >
                            <Truck
                              size={14}
                              color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                            />
                            <Text
                              className={`text-xs font-bold ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}
                            >
                              View Assigned Contractors (
                              {item.assigned_vendors.length})
                            </Text>
                          </TouchableOpacity>
                        )}

                      <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-100/10">
                        <Text className="text-[10px] text-slate-400 font-bold">
                          Slot: {item.time_preferred}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-bold">
                          {new Date(item.requested_at).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Bottom Context Interaction Bar */}
                      <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-slate-800/10">
                        {/* Interactive Toggle for Resident Completion Status */}
                        <TouchableOpacity
                          disabled={updatingCompletionId === item.id}
                          onPress={async () => {
                            setUpdatingCompletionId(item.id);
                            const res = await updateServiceRequestCompletion(
                              item.id,
                              !item.is_completed,
                              selectedEstateId!,
                            );
                            if (res.success) {
                              fetchHistory(); // Refresh layout to capture state transitions
                            } else {
                              Alert.alert("Status Shift Failed", res.message);
                            }
                            setUpdatingCompletionId(null);
                          }}
                          className={`flex-row items-center px-4 py-2 rounded-xl border ${
                            item.is_completed
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {updatingCompletionId === item.id ? (
                            <ActivityIndicator size="small" color="#10b981" />
                          ) : (
                            <>
                              <CheckCircle
                                size={14}
                                color={
                                  item.is_completed ? "#10b981" : "#94a3b8"
                                }
                              />
                              <Text
                                className={`ml-2 text-xs font-black uppercase tracking-tight ${
                                  item.is_completed
                                    ? "text-emerald-700"
                                    : "text-slate-500"
                                }`}
                              >
                                {item.is_completed
                                  ? "Completed"
                                  : "Mark Completed"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {!item.is_completed && (
                          <View className="flex-row items-center gap-3">
                            <TouchableOpacity
                              className="flex-row items-center"
                              onPress={() => openReportModal(item)}
                            >
                              <ShieldAlert size={16} color="#ef4444" />
                            </TouchableOpacity>
                            {!item.is_dispatched && (
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
                    </View>
                  ))
                ) : (
                  <Text className="text-center text-slate-400 mt-10 font-medium">
                    No previous requests logged for this property.
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          {activeTab === "COMPLAINTS" && (
            <View className="flex-1">
              {selectedEstateId ? (
                <ServicesReportsHistory estate_id={selectedEstateId} />
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
          )}
        </View>

        {/* MODAL PICKER OVERLAY COMPONENT FOR SERVICES ROSTER */}
        <Modal visible={servicePickerVisible} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/50">
            <View
              className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[40px] p-6 h-[60%]`}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`text-lg font-black ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                >
                  Select Category
                </Text>
                <TouchableOpacity
                  onPress={() => setServicePickerVisible(false)}
                >
                  <XCircle
                    size={24}
                    color={isDarkMode ? "#D4AF37" : "#0A1F44"}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {servicesCatalog.map((svc) => (
                  <TouchableOpacity
                    key={svc.id}
                    onPress={() => {
                      setForm({
                        ...form,
                        service_id: svc.id,
                        service_name: svc.service_name,
                      });
                      setServicePickerVisible(false);
                    }}
                    className="p-4 border-b border-slate-100/10"
                  >
                    <Text
                      className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
                      {svc.service_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={estatePickerVisible}
          animationType="slide"
          transparent={true}
        >
          <View className="flex-1 justify-center px-4 bg-black/50">
            <View
              className={`${isDarkMode ? "bg-slate-900" : "bg-white"} p-6 max-h-[65%]`}
            >
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
              <TouchableOpacity
                onPress={() => setEstatePickerVisible(false)}
                className="mt-2 p-4 bg-slate-200 rounded-2xl items-center"
              >
                <Text className="text-slate-700 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL LOCATION SELECTOR ENVELOPE OVERLAY FOR TENANTS */}
        <Modal visible={unitPickerVisible} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/50">
            <View
              className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[40px] p-6 h-[50%]`}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`text-lg font-black ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                >
                  Select Active Unit Location
                </Text>
                <TouchableOpacity onPress={() => setUnitPickerVisible(false)}>
                  <XCircle
                    size={24}
                    color={isDarkMode ? "#D4AF37" : "#0A1F44"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {flatLocationList.length > 0 ? (
                  <View
                    className={`p-1 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}
                  >
                    {flatLocationList.map((item) => {
                      const isChecked =
                        form.unit === `Block ${item.block} ➔ Unit ${item.unit}`;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            setForm({
                              ...form,
                              unit: `Block ${item.block} ➔ Unit ${item.unit}`,
                            });
                            setUnitPickerVisible(false);
                          }}
                          className={`flex-row items-center justify-between p-3.5 border-b ${
                            isDarkMode
                              ? "border-slate-900"
                              : "border-slate-200/60"
                          } last:border-b-0`}
                        >
                          <Text
                            className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}
                          >
                            Block {item.block} ➔ Unit {item.unit}
                          </Text>
                          <View
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isChecked
                                ? isDarkMode
                                  ? "bg-gm-gold border-gm-gold"
                                  : "bg-indigo-600 border-indigo-500"
                                : isDarkMode
                                  ? "border-slate-700 bg-slate-900"
                                  : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && (
                              <Check
                                size={11}
                                color={isDarkMode ? "#0A1F44" : "#fff"}
                                strokeWidth={3}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-center text-slate-400 mt-6 font-medium text-xs">
                    No active unit configurations linked to your user profile
                    inside this property.
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={complaintModal} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/50">
            <View
              className={`${isDarkMode ? "bg-slate-900 border-t border-gm-gold" : "bg-white"} rounded-t-[40px] p-8 h-[70%]`}
            >
              <View className="flex-row justify-between items-center mb-6">
                <Text
                  className={`text-xl font-montserrat-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                >
                  File a complaint
                </Text>
                <TouchableOpacity onPress={() => setComplaintModal(false)}>
                  <XCircle
                    size={24}
                    color={isDarkMode ? "#D4AF37" : "#0A1F44"}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <InputField
                  label="Subject"
                  value={complaintSubject}
                  onChangeText={setComplaintSubject}
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
                  value={complaintDescription}
                  onChangeText={setComplaintDescription}
                  isDarkMode={isDarkMode}
                />
                <TouchableOpacity
                  onPress={handleReportSubmit}
                  disabled={submittingComplaint}
                  className={`p-5 rounded-3xl items-center mt-6 border ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-gm-navy"}`}
                >
                  {submittingComplaint ? (
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

        {/* --- ASSIGNED CONTRACTORS LEDGER DISPLAY PANEL --- */}
        <Modal visible={vendorModalVisible} animationType="fade" transparent>
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View
              className={`w-full rounded-[40px] p-6 shadow-2xl ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"}`}
            >
              <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-slate-100/10">
                <View>
                  <Text
                    className={`text-lg font-black ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                  >
                    Assigned Contractors
                  </Text>
                  <Text className="text-xs text-slate-400 font-medium">
                    Authorized maintenance technicians dispatched to your unit.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setVendorModalVisible(false)}>
                  <XCircle
                    size={24}
                    color={isDarkMode ? "#D4AF37" : "#0A1F44"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                className="max-h-[40vh]"
                showsVerticalScrollIndicator={false}
              >
                {selectedVendors.map((vendor, vIdx) => (
                  <View
                    key={vIdx}
                    className={`p-4 rounded-2xl border mb-3 last:mb-0 ${
                      isDarkMode
                        ? "bg-gm-navy/50 border-slate-800"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <Text
                      className={`font-black text-sm uppercase ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
                      {vendor.name}
                    </Text>
                    <Text className="text-xs text-slate-400 font-bold mt-1">
                      Phone: {vendor.phone}
                    </Text>
                    {vendor.email && (
                      <Text className="text-xs text-slate-400 font-medium">
                        Email: {vendor.email}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* {showDatePicker && (
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
        )} */}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
