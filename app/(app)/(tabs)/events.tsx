import AllEventsScreen from "@/app/AllEvents";
import {
  createEvent,
  getAllLocations,
  getCloudinaryUrl,
} from "@/app/services/api";
import { EstateLocation } from "@/app/services/interfaces";
import { useUser } from "@/app/UserContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import {
  AlertTriangle,
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  const [activeTab, setActiveTab] = useState<"CREATE EVENT" | "ALL EVENTS">(
    "CREATE EVENT",
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPicker, setShowPicker] = useState<
    "start_time" | "end_time" | null
  >(null);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showEstateModal, setShowEstateModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [venueSearchQuery, setVenueSearchQuery] = useState("");
  const [estateSearchQuery, setEstateSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locations, setLocations] = useState<EstateLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  const [selectedVenueId, setSelectedVenueId] = useState<number | "">("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);

  // Calendar View Window state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(
    new Date(),
  );

  // Locate current selection context variables
  const chosenLocationData = useMemo(() => {
    return locations.find((loc) => loc.id === Number(selectedVenueId)) || null;
  }, [selectedVenueId, locations]);

  // Compiled Set tracking of all completely locked down dates for fast grid comparisons
  const completelyTakenDatesSet = useMemo(() => {
    const takenSet = new Set<string>();
    if (!chosenLocationData || !chosenLocationData.event_booked_on)
      return takenSet;

    Object.values(chosenLocationData.event_booked_on).forEach(
      (bookingContext: any) => {
        if (bookingContext && Array.isArray(bookingContext.dates)) {
          bookingContext.dates.forEach((d: string) => takenSet.add(d));
        }
      },
    );
    return takenSet;
  }, [chosenLocationData]);

  const calendarGridDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date | null; dateStr: string }[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, dateStr: "" });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d);
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, "0");
      const dd = String(dayDate.getDate()).padStart(2, "0");
      cells.push({
        date: dayDate,
        dateStr: `${yyyy}-${mm}-${dd}`,
      });
    }
    return cells;
  }, [currentCalendarDate]);

  const toggleDateSelection = (dateStr: string) => {
    if (completelyTakenDatesSet.has(dateStr)) return;

    setSelectedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr],
    );
  };

  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0].toString());
    }
  }, [user]);

  const fetchLocations = async (estateId: string | null) => {
    if (!estateId) return;
    setLoadingLocations(true);
    try {
      const locationsData = await getAllLocations(estateId);
      setLocations(locationsData);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  // FIXED: Actively fetch location configurations whenever the selected estate shifts
  useEffect(() => {
    fetchLocations(selectedEstateId);
  }, [selectedEstateId]);

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

  // Sync state variables back down to form configuration payloads
  useEffect(() => {
    if (selectedVenueId) {
      setForm((prev) => ({
        ...prev,
        venue_detail: selectedVenueId.toString(),
      }));
    } else {
      setForm((prev) => ({ ...prev, venue_detail: "" }));
    }
  }, [selectedVenueId]);

  useEffect(() => {
    if (selectedDates.length > 0) {
      const sorted = [...selectedDates].sort();
      setForm((prev) => ({
        ...prev,
        start_date: sorted[0],
        end_date: sorted[sorted.length - 1],
      }));
    } else {
      setForm((prev) => ({ ...prev, start_date: "", end_date: "" }));
    }
  }, [selectedDates]);

  const selectedEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "Select Target Estate";

    const found = user.estates.find(
      (e) => e.id.toString() === selectedEstateId.toString(),
    );
    return found ? found.name : "Select Target Estate";
  }, [selectedEstateId, user?.estates]); // 🌟 Changed from form.estate_id to selectedEstateId

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(venueSearchQuery.toLowerCase()),
    );
  }, [locations, venueSearchQuery]);

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

    if (field === "start_time" || field === "end_time") {
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
    if (!selectedEstateId)
      return Alert.alert(
        "Missing Target",
        "Please link an estate to this post.",
      );
    if (!form.title) return Alert.alert("Missing Info", "Set event title.");
    if (!form.venue_detail || selectedDates.length === 0)
      return Alert.alert(
        "Missing Venue Plan",
        "Please select a venue and target dates.",
      );
    if (form.expected_guests && chosenLocationData?.capacity) {
      const requestedLimit = parseInt(form.expected_guests, 10);
      const maximumCapacity = parseInt(chosenLocationData.capacity as any, 10);

      if (requestedLimit > maximumCapacity) {
        return Alert.alert(
          "Capacity Exceeded",
          `The chosen venue (${chosenLocationData.name}) can only hold a maximum of ${maximumCapacity} guests. Please reduce your guest limit or choose a larger venue.`,
        );
      }
    }
    if (!form.start_time || !form.end_time)
      return Alert.alert("Missing Info", "Set event start and end hours.");
    if (form.is_paid && (!accountName || accountName === "Invalid Account")) {
      return Alert.alert("KYC Error", "Please verify bank details first");
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        estate_id: selectedEstateId,
        venue_detail: parseInt(form.venue_detail, 10),
        booked_dates_list: [...selectedDates].sort(),
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
    setSelectedVenueId("");
    setSelectedDates([]);
    setForm({
      estate_id: selectedEstateId || "",
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
      <View
        className={`${isDarkMode ? "bg-slate-950" : "bg-slate-50"} flex-1 justify-center items-center p-6`}
      >
        <View
          className={`${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-100"} p-8 rounded-[2.5rem] shadow-sm items-center border`}
        >
          <ShieldCheck size={60} color={isDarkMode ? "#D4AF37" : "#0A1F44"} />
          <Text
            className={`text-xl font-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} mt-4 text-center`}
          >
            Access Restricted
          </Text>
          <Text
            className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-2 text-center px-4 max-w-[280px]`}
          >
            You are currently not attached to any active estates on GateMan.
          </Text>
          <TouchableOpacity
            className={`w-full p-4 rounded-2xl shadow-sm mt-6 border items-center ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
            onPress={() => router.push("/JoinRequest" as any)}
          >
            <Text className="text-white font-roboto-regular font-bold text-base">
              Join an Estate
            </Text>
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
              ? isDarkMode
                ? "bg-gm-navy border-gm-gold"
                : "bg-gm-navy border-gray-200"
              : isDarkMode
                ? "bg-gm-charcoal border-slate-800"
                : "bg-white border-slate-100"
          }`}
        >
          <FileText
            size={18}
            color={
              activeTab === "CREATE EVENT"
                ? "#D4AF37"
                : isDarkMode
                  ? "#A0AEC0"
                  : "#0A1F44"
            }
          />
          <Text
            className={`ml-2 font-oswald-semibold text-xs ${activeTab === "CREATE EVENT" ? "text-gm-gold" : isDarkMode ? "text-slate-400" : "text-gm-navy"}`}
          >
            New Event
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ALL EVENTS")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "ALL EVENTS"
              ? isDarkMode
                ? "bg-gm-navy border-gm-gold"
                : "bg-gm-navy border-gray-200"
              : isDarkMode
                ? "bg-gm-charcoal border-slate-800"
                : "bg-white border-slate-100"
          }`}
        >
          <History
            size={18}
            color={
              activeTab === "ALL EVENTS"
                ? "#D4AF37"
                : isDarkMode
                  ? "#A0AEC0"
                  : "#0A1F44"
            }
          />
          <Text
            className={`ml-2 font-oswald-semibold text-xs ${activeTab === "ALL EVENTS" ? "text-gm-gold" : isDarkMode ? "text-slate-400" : "text-gm-navy"}`}
          >
            All Events
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "CREATE EVENT" ? (
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Administrative Notice */}
          <View
            className={`p-5 rounded-[2rem] mb-6 border flex-row items-start ${
              isDarkMode
                ? "bg-gm-navy border-amber-900/40"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <AlertTriangle
              size={20}
              color={isDarkMode ? "#D4AF37" : "#d97706"}
            />
            <View className="ml-3 flex-1">
              <Text
                className={`font-oswald-semibold text-[10px] uppercase tracking-widest mb-1 ${isDarkMode ? "text-gm-gold" : "text-amber-900"}`}
              >
                Scheduling Requirement
              </Text>
              <Text
                className={`text-xs font-bold leading-relaxed ${isDarkMode ? "text-slate-300" : "text-amber-700"}`}
              >
                Schedule at least{" "}
                <Text
                  className={`font-black ${isDarkMode ? "text-gm-gold" : "text-amber-900"}`}
                >
                  7 days
                </Text>{" "}
                in advance for a timely approval.
              </Text>
            </View>
          </View>

          {/* Target Property Assignment Selector */}
          {user?.estate_ids && user.estate_ids.length > 1 && (
            <View className="mb-6">
              <SectionHeader
                title="Target Hosting Property"
                isDarkMode={isDarkMode}
              />
              <TouchableOpacity
                onPress={() => setShowEstateModal(true)}
                className={`p-5 rounded-2xl border flex-row justify-between items-center ${
                  isDarkMode
                    ? "bg-gm-navy border-slate-800"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <View className="flex-row items-center">
                  <MapPin
                    size={18}
                    color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                  />
                  <Text
                    className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
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
              isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator
                color={isDarkMode ? "#D4AF37" : "#6366f1"}
                size="large"
              />
            ) : form.banner_url ? (
              <Image
                source={{ uri: form.banner_url }}
                className="w-full h-full rounded-[2.5rem]"
                resizeMode="cover"
              />
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
              isDarkMode
                ? "bg-gm-navy border-slate-800 text-white"
                : "bg-slate-50 border-slate-100 text-slate-700"
            }`}
            value={form.title}
            onChangeText={(t) => setForm({ ...form, title: t })}
          />
          <TextInput
            placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
            placeholder="Brief Description"
            multiline
            className={`p-5 rounded-2xl font-medium border mb-6 ${
              isDarkMode
                ? "bg-gm-navy border-slate-800 text-white"
                : "bg-slate-50 border-slate-100 text-slate-700"
            }`}
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
          />

          {/* --- VENUE SELECTION MODAL DROPDOWN TRIGGER --- */}
          <SectionHeader
            title="Venue & Date Selection"
            isDarkMode={isDarkMode}
          />
          <View className="mb-4">
            <Text
              className={`text-xs font-black uppercase tracking-wider mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              Select Venue Location
            </Text>
            <TouchableOpacity
              onPress={() => setShowVenueModal(true)}
              className={`p-5 rounded-2xl border flex-row justify-between items-center ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <View className="flex-row items-center">
                <MapPin size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
                <Text
                  className={`ml-3 font-bold ${chosenLocationData ? (isDarkMode ? "text-white" : "text-slate-800") : "text-slate-400"}`}
                >
                  {chosenLocationData
                    ? `${chosenLocationData.name} ${chosenLocationData.capacity ? `(${chosenLocationData.capacity} Max)` : ""}`
                    : "Choose Venue Location"}
                </Text>
              </View>
              <ChevronDown size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* --- DYNAMIC CONSTRAINED GRID CALENDAR CONTAINER --- */}
          <View className="mb-6">
            <Text
              className={`text-xs font-black uppercase tracking-wider mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              Select Booking Dates{" "}
              {selectedDates.length > 0 && `(${selectedDates.length} Selected)`}
            </Text>

            {!selectedVenueId ? (
              <View
                className={`p-6 border border-dashed rounded-2xl text-center items-center justify-center ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              >
                <Text className="text-xs font-bold text-slate-400 text-center">
                  Please choose a venue location layout first to unlock
                  available booking calendars.
                </Text>
              </View>
            ) : (
              <View
                className={`border rounded-3xl p-5 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"}`}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text
                    className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                  >
                    {currentCalendarDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() =>
                        setCurrentCalendarDate(
                          new Date(
                            currentCalendarDate.getFullYear(),
                            currentCalendarDate.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      className={`p-2 rounded-lg border ${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-200"}`}
                    >
                      <ChevronLeft
                        size={14}
                        color={isDarkMode ? "#fff" : "#000"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setCurrentCalendarDate(
                          new Date(
                            currentCalendarDate.getFullYear(),
                            currentCalendarDate.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className={`p-2 rounded-lg border ${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-200"}`}
                    >
                      <ChevronRight
                        size={14}
                        color={isDarkMode ? "#fff" : "#000"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Grid Weekdays Label Header Row */}
                <View className="flex-row justify-between text-center mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                    <Text
                      key={dayName}
                      className="w-[12%] text-center text-[10px] font-black text-slate-400 uppercase"
                    >
                      {dayName}
                    </Text>
                  ))}
                </View>
                <View className="flex-row flex-wrap gap-y-1 justify-start">
                  {calendarGridDays.map((cell, idx) => {
                    if (!cell.date)
                      return (
                        <View
                          key={`empty-${idx}`}
                          style={{ width: "14.28%" }}
                          className="h-10"
                        />
                      );

                    const isTaken = completelyTakenDatesSet.has(cell.dateStr);
                    const isSelected = selectedDates.includes(cell.dateStr);

                    return (
                      <TouchableOpacity
                        key={cell.dateStr}
                        disabled={isTaken}
                        onPress={() => toggleDateSelection(cell.dateStr)}
                        // FIXED: Forced cell sizing metrics inline to handle 7 columns symmetrically
                        style={{ width: "14.28%" }}
                        className="h-10 p-[2px]"
                      >
                        <View
                          className={`w-full h-full rounded-xl border items-center justify-center ${
                            isTaken
                              ? isDarkMode
                                ? "bg-slate-950 border-transparent text-slate-700"
                                : "bg-slate-200/60 border-transparent text-slate-400"
                              : isSelected
                                ? "bg-indigo-600 border-indigo-600"
                                : isDarkMode
                                  ? "bg-gm-navy border-slate-800"
                                  : "bg-white border-slate-200"
                          }`}
                        >
                          <Text
                            className={`text-xs font-black ${
                              isTaken
                                ? "line-through"
                                : isSelected
                                  ? "text-white"
                                  : isDarkMode
                                    ? "text-slate-200"
                                    : "text-slate-700"
                            }`}
                          >
                            {cell.date.getDate()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <SectionHeader title="Duration & Timing" isDarkMode={isDarkMode} />
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => setShowPicker("start_time")}
              className={`flex-1 p-5 rounded-2xl border flex-row items-center ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <Clock size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text
                className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}
              >
                {getDisplayValue("start_time", "Start Time")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPicker("end_time")}
              className={`flex-1 p-5 rounded-2xl border flex-row items-center ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <Clock size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text
                className={`ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}
              >
                {getDisplayValue("end_time", "End Time")}
              </Text>
            </TouchableOpacity>
          </View>

          <SectionHeader title="Expected Attendance" isDarkMode={isDarkMode} />
          <View
            className={`p-5 rounded-2xl border flex-row items-center mb-6 ${
              isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-slate-50 border-slate-100"
            }`}
          >
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
          <View
            className={`p-6 rounded-[2.5rem] border mb-10 ${
              isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-indigo-50/50 border-indigo-100"
            }`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <Banknote
                  size={20}
                  color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                />
                <Text
                  className={`ml-2 font-oswald-semibold text-xs uppercase tracking-widest ${isDarkMode ? "text-gm-gold" : "text-indigo-900"}`}
                >
                  Paid Event
                </Text>
              </View>
              <Switch
                value={form.is_paid}
                onValueChange={(val) => setForm({ ...form, is_paid: val })}
                trackColor={{
                  false: "#d1d5db",
                  true: isDarkMode ? "#D4AF37" : "#4f46e5",
                }}
              />
            </View>

            {form.is_paid && (
              <View>
                <TextInput
                  placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                  placeholder="Ticket Price (₦)"
                  keyboardType="numeric"
                  className={`p-4 rounded-xl font-black border mb-3 ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-800 text-white"
                      : "bg-white border-indigo-100 text-indigo-900"
                  }`}
                  value={form.ticket_price}
                  onChangeText={(t) => setForm({ ...form, ticket_price: t })}
                />
                <TouchableOpacity
                  onPress={() => setShowBankModal(true)}
                  className={`p-4 rounded-xl border mb-3 flex-row justify-between items-center ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-indigo-100"
                  }`}
                >
                  <Text
                    className={`font-bold ${form.bank_name ? (isDarkMode ? "text-white" : "text-slate-900") : "text-slate-400"}`}
                  >
                    {form.bank_name || "Select Bank"}
                  </Text>
                  <ChevronDown
                    size={20}
                    color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                  />
                </TouchableOpacity>

                <TextInput
                  placeholder="Account Number"
                  placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
                  keyboardType="numeric"
                  maxLength={10}
                  className={`p-4 rounded-xl font-bold border mb-2 ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-800 text-white"
                      : "bg-white border-indigo-100 text-indigo-900"
                  }`}
                  value={form.account_number}
                  onChangeText={(t) => setForm({ ...form, account_number: t })}
                />

                {(isResolving || accountName) && (
                  <View
                    className={`flex-row items-center p-3 rounded-xl ${
                      accountName === "Invalid Account"
                        ? "bg-red-950/40 border border-red-900/30"
                        : "bg-emerald-950/40 border border-emerald-900/30"
                    }`}
                  >
                    {isResolving ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <CheckCircle2
                        size={16}
                        color={
                          accountName === "Invalid Account"
                            ? "#ef4444"
                            : "#10b981"
                        }
                      />
                    )}
                    <Text
                      className={`ml-2 text-[10px] font-black uppercase tracking-widest ${
                        accountName === "Invalid Account"
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
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
                isDarkMode
                  ? "bg-gm-charcoal border-gm-gold"
                  : "bg-slate-900 border-transparent"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-black uppercase text-sm tracking-wide">
                  Submit
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetEvent}
              className={`p-5 rounded-3xl items-center border ${
                isDarkMode
                  ? "bg-red-950/20 border-red-900/40"
                  : "bg-red-50 border-red-100"
              }`}
            >
              <Text className="text-red-500 font-bold uppercase text-sm">
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <AllEventsScreen />
      )}

      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true}
          onChange={handleDateChange}
        />
      )}

      {/* --- VENUE SELECTION CENTERED MODAL --- */}
      <Modal visible={showVenueModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View
            className={`w-full max-h-[80%] rounded-[2.5rem] p-6 border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-100"}`}
          >
            <Text
              className={`text-lg font-black uppercase mb-4 tracking-wide ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
            >
              Select Venue Location
            </Text>
            <TextInput
              placeholder="Search venues..."
              placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
              className={`p-4 rounded-xl border mb-4 font-bold ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
              value={venueSearchQuery}
              onChangeText={setVenueSearchQuery}
            />
            {loadingLocations ? (
              <ActivityIndicator
                size="large"
                color="#6366f1"
                className="my-6"
              />
            ) : (
              <FlatList
                data={filteredLocations}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`p-4 rounded-xl border mb-2 flex-row justify-between items-center ${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"}`}
                    onPress={() => {
                      setSelectedVenueId(item.id);
                      setSelectedDates([]);
                      setShowVenueModal(false);
                      setVenueSearchQuery("");
                    }}
                  >
                    <Text
                      className={`font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
                      {item.name}
                    </Text>
                    {item.capacity && (
                      <Text className="text-xs text-slate-400">
                        Cap: {item.capacity}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              onPress={() => setShowVenueModal(false)}
              className="mt-4 p-4 bg-slate-900 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Estate Selector Modal */}
      <Modal visible={showEstateModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View
            className={`w-full max-h-[70%] p-6 border ${
              isDarkMode ? "bg-slate-900" : "bg-white border-slate-100"
            }`}
          >
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Select Active Estate
            </Text>
            <FlatList
              data={(user?.estates || []).filter((e) =>
                e.name.toLowerCase().includes(estateSearchQuery.toLowerCase()),
              )}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`p-4 rounded-xl mb-2 border ${
                    isDarkMode
                      ? "bg-gm-navy border-slate-800"
                      : "bg-slate-50 border-slate-100"
                  }`}
                  onPress={() => {
                    setSelectedEstateId(item.id.toString());
                    setShowEstateModal(false);
                    setEstateSearchQuery("");
                  }}
                >
                  <Text
                    className={`font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            {selectedEstateId && (
              <TouchableOpacity
                onPress={() => setShowEstateModal(false)}
                className="mt-2 p-4 bg-slate-200 rounded-2xl items-center"
              >
                <Text className="text-slate-700 font-bold">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Bank Selection Modal */}
      <Modal visible={showBankModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View
            className={`w-full h-[80%] rounded-[2.5rem] p-6 border ${
              isDarkMode
                ? "bg-slate-950 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <SectionHeader title="Select Bank" isDarkMode={isDarkMode} />
            <TextInput
              placeholder="Search bank name..."
              placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
              className={`p-4 rounded-xl border mb-4 font-bold ${
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={banks.filter((b) =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()),
              )}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`p-4 rounded-xl mb-2 border ${
                    isDarkMode
                      ? "bg-gm-navy border-slate-800"
                      : "bg-slate-50 border-slate-100"
                  }`}
                  onPress={() => {
                    setForm({
                      ...form,
                      bank_code: item.code,
                      bank_name: item.name,
                    });
                    setShowBankModal(false);
                    setSearchQuery("");
                  }}
                >
                  <Text
                    className={`font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setShowBankModal(false)}
              className="mt-4 p-4 bg-slate-900 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Reusable Local Sub-Header Label component
function SectionHeader({
  title,
  isDarkMode,
}: {
  title: string;
  isDarkMode: boolean;
}) {
  return (
    <Text
      className={`font-oswald-semibold text-[10px] uppercase tracking-[0.15em] mb-3 ${
        isDarkMode ? "text-gm-gold" : "text-slate-400"
      }`}
    >
      {title}
    </Text>
  );
}
