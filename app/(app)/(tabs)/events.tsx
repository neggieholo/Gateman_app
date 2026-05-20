import AllEventsScreen from "@/app/AllEvents";
import { createEvent, getCloudinaryUrl } from "@/app/services/api";
import { useUser } from "@/app/UserContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import {
  AlertTriangle,
  Banknote,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  History,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateEventScreen() {
  const { user, isDarkMode } = useUser();
  const [activeTab, setActiveTab] = useState<"CREATE EVENT" | "ALL EVENTS">("CREATE EVENT");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPicker, setShowPicker] = useState<"start_date" | "end_date" | "start_time" | "end_time" | null>(null);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showEstateModal, setShowEstateModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [estateSearchQuery, setEstateSearchQuery] = useState("");

  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;
  const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}/api`;

  const [form, setForm] = useState({
    estate_id: "",
    title: "",
    banner_url: "",
    description: "",
    venue_detail: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    expected_guests: "",
    is_paid: false,
    ticket_price: "0",
    bank_code: "",
    bank_name: "",
    account_number: "",
  });

  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setForm((prev) => ({
        ...prev,
        estate_id: user.estate_ids![0].toString(),
      }));
    }
  }, [user]);

  const selectedEstateName = useMemo(() => {
    if (!user?.estates || !form.estate_id) return "Select Target Estate";
    const found = user.estates.find(
      (e) => e.id.toString() === form.estate_id.toString(),
    );
    return found ? found.name : "Select Target Estate";
  }, [form.estate_id, user?.estates]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch("https://api.paystack.co/bank", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}`,
          },
        });
        const data = await res.json();
        setBanks(data.data);
      } catch (err) {
        console.error("Failed to fetch banks");
      }
    };
    if (form.is_paid) fetchBanks();
  }, [form.is_paid]);

  useEffect(() => {
    const resolve = async () => {
      if (form.account_number.length === 10 && form.bank_code) {
        setIsResolving(true);
        try {
          const res = await fetch(
            `${BASE_URL}/kyc/resolve-bank?accountNumber=${form.account_number}&bankCode=${form.bank_code}`,
          );
          const data = await res.json();
          setAccountName(
            data.status ? data.data.account_name : "Invalid Account",
          );
        } catch (err) {
          setAccountName("Verification Failed");
        } finally {
          setIsResolving(false);
        }
      } else {
        setAccountName("");
      }
    };
    resolve();
  }, [form.account_number, form.bank_code, BASE_URL]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === "dismissed" || !selectedDate) {
      setShowPicker(null);
      return;
    }
    const field = showPicker;
    setShowPicker(null);

    if (field === "start_date" || field === "end_date") {
      const dateString = selectedDate.toISOString().split("T")[0];
      setForm((prev) => ({ ...prev, [field]: dateString }));
    } else if (field === "start_time" || field === "end_time") {
      const timeString = selectedDate.toTimeString().split(" ")[0];
      setForm((prev) => ({ ...prev, [field]: timeString }));
    }
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
          setForm((prev) => ({ ...prev, banner_url: cloudUrl }));
        }
      }
    } catch (error) {
      Alert.alert("Upload Error", "Could not process image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.estate_id)
      return Alert.alert("Missing Target", "Please link an estate to this post.");
    if (!form.title) return Alert.alert("Missing Info", "Set event title.");
    if (!form.start_date || !form.start_time)
      return Alert.alert("Missing Info", "Set event date/time.");
    if (form.is_paid && (!accountName || accountName === "Invalid Account")) {
      return Alert.alert("KYC Error", "Please verify bank details first.");
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        expected_guests: parseInt(form.expected_guests || "0", 10),
        ticket_price: parseFloat(form.ticket_price || "0"),
      };

      await createEvent(payload);
      Alert.alert("Success", "Event submitted for approval");
      resetEvent();
      setActiveTab("ALL EVENTS");
    } catch (error: any) {
      Alert.alert("Error", error.toString());
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = (field: string, placeholder: string) => {
    return form[field as keyof typeof form] || placeholder;
  };

  const resetEvent = () => {
    setIsResolving(false);
    setAccountName("");
    setForm({
      estate_id: user?.estate_ids?.[0]?.toString() || "",
      title: "",
      banner_url: "",
      description: "",
      venue_detail: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      expected_guests: "",
      is_paid: false,
      ticket_price: "0",
      bank_code: "",
      bank_name: "",
      account_number: "",
    });
  };

  if (hasNoEstates) {
    return (
      <View className={`${isDarkMode ? "bg-slate-950" : "bg-slate-50"} flex-1 justify-center items-center p-6`}>
        <View className={`${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-100"} p-8 rounded-[2.5rem] shadow-sm items-center border`}>
          <ShieldCheck size={60} color={isDarkMode ? "#D4AF37" : "#0A1F44"} />
          <Text className={`text-xl font-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} mt-4 text-center`}>
            Security Access Restricted
          </Text>
          <Text className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-2 text-center px-4 max-w-[280px]`}>
            You are currently not attached to any active estates on GateMan.
          </Text>
          <TouchableOpacity
            className={`w-full py-4 rounded-2xl shadow-sm mt-6 border items-center ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
            onPress={() => router.push("/JoinRequest" as any)}
          >
            <Text className="text-white font-bold text-base">Join an Estate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 pt-6 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
      
      {/* --- Tab Switcher --- */}
      <View className="flex-row gap-3 px-5 mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab("CREATE EVENT")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "CREATE EVENT"
              ? isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-gm-navy border-gray-200"
              : isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-slate-100"
          }`}
        >
          <FileText size={18} color={activeTab === "CREATE EVENT" ? "#D4AF37" : isDarkMode ? "#A0AEC0" : "#0A1F44"} />
          <Text className={`ml-2 font-oswald-semibold text-xs ${activeTab === "CREATE EVENT" ? "text-gm-gold" : isDarkMode ? "text-slate-400" : "text-gm-navy"}`}>
            New Event
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ALL EVENTS")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "ALL EVENTS"
              ? isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-gm-navy border-gray-200"
              : isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-slate-100"
          }`}
        >
          <History size={18} color={activeTab === "ALL EVENTS" ? "#D4AF37" : isDarkMode ? "#A0AEC0" : "#0A1F44"} />
          <Text className={`ml-2 font-oswald-semibold text-xs ${activeTab === "ALL EVENTS" ? "text-gm-gold" : isDarkMode ? "text-slate-400" : "text-gm-navy"}`}>
            All Events
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "CREATE EVENT" ? (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          
          {/* Administrative Notice */}
          <View className={`p-5 rounded-[2rem] mb-6 border flex-row items-start ${
            isDarkMode ? "bg-gm-navy border-amber-900/40" : "bg-amber-50 border-amber-100"
          }`}>
            <AlertTriangle size={20} color={isDarkMode ? "#D4AF37" : "#d97706"} />
            <View className="ml-3 flex-1">
              <Text className={`font-oswald-semibold text-[10px] uppercase tracking-widest mb-1 ${isDarkMode ? "text-gm-gold" : "text-amber-900"}`}>
                Scheduling Requirement
              </Text>
              <Text className={`text-xs font-bold leading-relaxed ${isDarkMode ? "text-slate-300" : "text-amber-700"}`}>
                Schedule at least <Text className={`font-black ${isDarkMode ? "text-gm-gold" : "text-amber-900"}`}>7 days</Text> in advance for approval.
              </Text>
            </View>
          </View>

          {/* Target Property Assignment Selector */}
          {user?.estate_ids && user.estate_ids.length > 1 && (
            <View className="mb-6">
              <SectionHeader title="Target Hosting Property" isDarkMode={isDarkMode} />
              <TouchableOpacity
                onPress={() => setShowEstateModal(true)}
                className={`p-5 rounded-2xl border flex-row justify-between items-center ${
                  isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
                }`}
              >
                <View className="flex-row items-center">
                  <MapPin size={18} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                  <Text className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    {selectedEstateName}
                  </Text>
                </View>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Banner Upload */}
          <TouchableOpacity
            className={`w-full h-44 rounded-[2.5rem] border-2 border-dashed items-center justify-center mb-6 ${
              isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator color={isDarkMode ? "#D4AF37" : "#6366f1"} size="large" />
            ) : form.banner_url ? (
              <Image source={{ uri: form.banner_url }} className="w-full h-full rounded-[2.5rem]" resizeMode="cover" />
            ) : (
              <View className="items-center">
                <Camera size={32} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
                <Text className="text-slate-400 font-black mt-2 text-[10px] uppercase tracking-[0.2em]">
                  Upload Banner
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <SectionHeader title="General Information" isDarkMode={isDarkMode} />
          <TextInput
            placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
            placeholder="Event Title"
            className={`p-5 rounded-2xl font-bold mb-3 border ${
              isDarkMode ? "bg-gm-navy border-slate-800 text-white" : "bg-slate-50 border-slate-100 text-slate-700"
            }`}
            value={form.title}
            onChangeText={(t) => setForm({ ...form, title: t })}
          />
          <TextInput
            placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
            placeholder="Brief Description"
            multiline
            className={`p-5 rounded-2xl font-medium border mb-6 ${
              isDarkMode ? "bg-gm-navy border-slate-800 text-white" : "bg-slate-50 border-slate-100 text-slate-700"
            }`}
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
          />

          <SectionHeader title="Duration & Timing" isDarkMode={isDarkMode} />
          <View className="flex-row gap-3 mb-3">
            <TouchableOpacity
              onPress={() => setShowPicker("start_date")}
              className={`flex-1 p-5 rounded-2xl border flex-row items-center ${
                isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
              }`}
            >
              <Calendar size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}>
                {getDisplayValue("start_date", "Start Date")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPicker("end_date")}
              className={`flex-1 p-5 rounded-2xl border flex-row items-center ${
                isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
              }`}
            >
              <Calendar size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}>
                {getDisplayValue("end_date", "End Date")}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => setShowPicker("start_time")}
              className={`flex-1 p-5 rounded-2xl border flex-row items-center ${
                isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
              }`}
            >
              <Clock size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}>
                {getDisplayValue("start_time", "Start Time")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPicker("end_time")}
              className={`flex-1 p-5 rounded-2xl border flex-row items-center ${
                isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
              }`}
            >
              <Clock size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}>
                {getDisplayValue("end_time", "End Time")}
              </Text>
            </TouchableOpacity>
          </View>

          <SectionHeader title="Venue & Guests" isDarkMode={isDarkMode} />
          <TextInput
            placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
            placeholder="Venue"
            className={`p-5 rounded-2xl font-bold mb-3 border ${
              isDarkMode ? "bg-gm-navy border-slate-800 text-white" : "bg-slate-50 border-slate-100 text-slate-700"
            }`}
            value={form.venue_detail}
            onChangeText={(t) => setForm({ ...form, venue_detail: t })}
          />
          <View className={`p-5 rounded-2xl border flex-row items-center mb-6 ${
            isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
          }`}>
            <Users size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
            <TextInput
              placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
              placeholder="Guest Limit"
              keyboardType="numeric"
              className={`ml-3 flex-1 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}
              value={form.expected_guests}
              onChangeText={(t) => setForm({ ...form, expected_guests: t })}
            />
          </View>

          {/* Payment Section */}
          <View className={`p-6 rounded-[2.5rem] border mb-10 ${
            isDarkMode ? "bg-gm-navy border-slate-800" : "bg-indigo-50/50 border-indigo-100"
          }`}>
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <Banknote size={20} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                <Text className={`ml-2 font-oswald-semibold text-xs uppercase tracking-widest ${isDarkMode ? "text-gm-gold" : "text-indigo-900"}`}>
                  Paid Event
                </Text>
              </View>
              <Switch
                value={form.is_paid}
                onValueChange={(val) => setForm({ ...form, is_paid: val })}
                trackColor={{ false: "#d1d5db", true: isDarkMode ? "#D4AF37" : "#4f46e5" }}
              />
            </View>

            {form.is_paid && (
              <View>
                <TextInput
                  placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                  placeholder="Ticket Price (₦)"
                  keyboardType="numeric"
                  className={`p-4 rounded-xl font-black border mb-3 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-indigo-100 text-indigo-900"
                  }`}
                  onChangeText={(t) => setForm({ ...form, ticket_price: t })}
                />
                <TouchableOpacity
                  onPress={() => setShowBankModal(true)}
                  className={`p-4 rounded-xl border mb-3 flex-row justify-between items-center ${
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-indigo-100"
                  }`}
                >
                  <Text className={`font-bold ${form.bank_name ? (isDarkMode ? "text-white" : "text-slate-900") : "text-slate-400"}`}>
                    {form.bank_name || "Select Bank"}
                  </Text>
                  <ChevronDown size={20} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                </TouchableOpacity>

                <TextInput
                  placeholder="Account Number"
                  placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                  keyboardType="numeric"
                  maxLength={10}
                  className={`p-4 rounded-xl font-bold border mb-2 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-indigo-100 text-indigo-900"
                  }`}
                  onChangeText={(t) => setForm({ ...form, account_number: t })}
                />

                {(isResolving || accountName) && (
                  <View className={`flex-row items-center p-3 rounded-xl ${
                    accountName === "Invalid Account" ? "bg-red-950/40 border border-red-900/30" : "bg-emerald-950/40 border border-emerald-900/30"
                  }`}>
                    {isResolving ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <CheckCircle2 size={16} color={accountName === "Invalid Account" ? "#ef4444" : "#10b981"} />
                    )}
                    <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${
                      accountName === "Invalid Account" ? "text-red-400" : "text-emerald-400"
                    }`}>
                      {isResolving ? "Verifying..." : accountName}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Submission and Action Buttons */}
          <View className="flex-row gap-3 items-center px-1 justify-between mb-12">
            <TouchableOpacity
              onPress={handleSubmit}
              className={`flex-1 p-5 rounded-3xl items-center border shadow-sm ${
                isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-black uppercase text-sm tracking-wide">Submit</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetEvent}
              className={`p-5 rounded-3xl items-center border ${
                isDarkMode ? "bg-red-950/20 border-red-900/40" : "bg-red-50 border-red-100"
              }`}
            >
              <Text className="text-red-500 font-bold uppercase text-sm">Reset</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <AllEventsScreen />
      )}

      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode={showPicker.includes("time") ? "time" : "date"}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true}
          onChange={handleDateChange}
        />
      )}

      {/* --- Assign Estate Modal Context --- */}
      <Modal visible={showEstateModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`h-[60%] rounded-t-[3rem] p-6 border-t ${isDarkMode ? "bg-slate-900 border-gm-gold" : "bg-white"}`}>
            <View className="flex-row justify-between items-center mb-4 px-2">
              <Text className={`font-black text-xl ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}>
                Assign Estate Destination
              </Text>
              <TouchableOpacity onPress={() => setShowEstateModal(false)}>
                <Text className={`font-bold ${isDarkMode ? "text-white" : "text-gm-navy"}`}>Close</Text>
              </TouchableOpacity>
            </View>
            <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}>
              <TextInput
                placeholder="Search connected properties..."
                className={`flex-1 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}
                placeholderTextColor="#94a3b8"
                onChangeText={(text) => setEstateSearchQuery(text)}
              />
            </View>
            <FlatList
              data={(user?.estates || []).filter((e) =>
                e.name.toLowerCase().includes(estateSearchQuery.toLowerCase()),
              )}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = form.estate_id === item.id.toString();
                return (
                  <TouchableOpacity
                    className="p-5 border-b border-slate-800/40 flex-row items-center justify-between"
                    onPress={() => {
                      setForm({ ...form, estate_id: item.id.toString() });
                      setEstateSearchQuery("");
                      setShowEstateModal(false);
                    }}
                  >
                    <Text className={`font-bold text-base ${
                      isSelected ? (isDarkMode ? "text-gm-gold" : "text-indigo-600") : (isDarkMode ? "text-slate-300" : "text-slate-700")
                    }`}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <View className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-gm-gold" : "bg-indigo-600"}`} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* --- Select Bank Modal --- */}
      <Modal visible={showBankModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`h-[80%] rounded-t-[3rem] p-6 border-t ${isDarkMode ? "bg-slate-900 border-gm-gold" : "bg-white"}`}>
            <View className="flex-row justify-between items-center mb-4 px-2">
              <Text className={`font-black text-xl ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}>
                Select Bank
              </Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Text className={`font-bold ${isDarkMode ? "text-white" : "text-gm-navy"}`}>Close</Text>
              </TouchableOpacity>
            </View>
            <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}>
              <TextInput
                placeholder="Search bank name..."
                className={`flex-1 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}
                placeholderTextColor="#94a3b8"
                onChangeText={(text) => setSearchQuery(text)}
              />
            </View>
            <FlatList
              data={banks.filter((b) =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()),
              )}
              keyExtractor={(item, index) => `${item.code}-${index}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="p-5 border-b border-slate-800/40 flex-row items-center justify-between"
                  onPress={() => {
                    setForm({
                      ...form,
                      bank_name: item.name,
                      bank_code: item.code,
                    });
                    setSearchQuery("");
                    setShowBankModal(false);
                  }}
                >
                  <Text className={`font-bold text-base ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    {item.name}
                  </Text>
                  <View className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SectionHeader = ({ title, isDarkMode }: { title: string; isDarkMode?: boolean }) => (
  <Text className={`text-[10px] font-oswald-semibold uppercase mb-3 ml-1 tracking-[0.2em] ${
    isDarkMode ? "text-gm-gold" : "text-slate-400"
  }`}>
    {title}
  </Text>
);