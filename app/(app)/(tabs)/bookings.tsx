import AllEventsScreen from "@/app/AllEvents";
import {
  createEvent,
  getAllLocations,
} from "@/app/services/api";
import { EstateFacility } from "@/app/services/interfaces";
import { useUser } from "@/app/UserContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";

import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  History,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SectionHeader = ({
  title,
  isDarkMode,
}: {
  title: string;
  isDarkMode: boolean;
}) => (
  <Text
    className={`text-xs font-black uppercase tracking-wider mb-3 ${
      isDarkMode ? "text-slate-400" : "text-slate-500"
    }`}
  >
    {title}
  </Text>
);

export default function CreateEventScreen() {
  const { user, isDarkMode, contextEstateId } = useUser();
  const [activeTab, setActiveTab] = useState<"CREATE BOOKING" | "ALL BOOKINGS">(
    "CREATE BOOKING"
  );
  const [showPicker, setShowPicker] = useState<
    "start_time" | "end_time" | null
  >(null);
  const [showEstateModal, setShowEstateModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [venueSearchQuery, setVenueSearchQuery] = useState("");
  const [estateSearchQuery, setEstateSearchQuery] = useState("");
  const [locations, setLocations] = useState<EstateFacility[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  const [selectedVenue, setSelectedVenue] = useState<EstateFacility | null>(
    null
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState<Date>(new Date());

  // Calendar View Window state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(
    new Date()
  );

  // Form State
  const [form, setForm] = useState({
    id: "",
    estate_id: "",
    venue_id: "",
    venue_name: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    booked_dates: [],
    isPaid: false,
  });

  // Sync selection to estate ID context
  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(contextEstateId);
    }
  }, [user, contextEstateId]);

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

  useEffect(() => {
    fetchLocations(selectedEstateId);
  }, [selectedEstateId]);

  // Chosen venue helper context
  const chosenLocationData = useMemo(() => {
    return (
      locations.find((loc) => loc.id === Number(selectedVenue?.id)) || null
    );
  }, [selectedVenue, locations]);

  // Booked dates set tracking
  const completelyTakenDatesSet = useMemo(() => {
    const takenSet = new Set<string>();
    if (!chosenLocationData || !chosenLocationData.event_booked_on)
      return takenSet;

    Object.values(chosenLocationData.event_booked_on).forEach(
      (bookingContext: any) => {
        if (bookingContext && Array.isArray(bookingContext.dates)) {
          bookingContext.dates.forEach((d: string) => takenSet.add(d));
        }
      }
    );
    return takenSet;
  }, [chosenLocationData]);

  // Calendar grid math
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
        : [...prev, dateStr]
    );
  };

  // Keep form data synced with venue and dates selection
  useEffect(() => {
    if (selectedVenue) {
      setForm((prev) => ({
        ...prev,
        venue_id: selectedVenue.id.toString(),
        venue_name: selectedVenue.name,
      }));
    } else {
      setForm((prev) => ({ ...prev, venue_id: "", venue_name: "" }));
    }
  }, [selectedVenue]);

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
      (e) => e.id.toString() === selectedEstateId.toString()
    );
    return found ? found.name : "Select Target Estate";
  }, [selectedEstateId, user?.estates]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(venueSearchQuery.toLowerCase())
    );
  }, [locations, venueSearchQuery]);

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

  const handleSubmit = async () => {
    if (!selectedEstateId)
      return Alert.alert(
        "Missing Target",
        "Please link an estate to this booking."
      );
    if (!form.venue_id || selectedDates.length === 0)
      return Alert.alert(
        "Missing Venue Plan",
        "Please select a venue and target dates."
      );

    if (!form.start_time || !form.end_time)
      return Alert.alert("Missing Info", "Set event start and end hours.");

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        estate_id: selectedEstateId,
        venue_id: parseInt(form.venue_id, 10),
        booked_dates_list: [...selectedDates].sort(),
        isPaid: chosenLocationData?.is_paid || false,
      };

      await createEvent(payload);
      Alert.alert(
        "Booking Requested",
        "Your event request has been submitted for approval. You will receive payment instructions once confirmed by admin."
      );
      resetEvent();
      setActiveTab("ALL BOOKINGS");
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
    setSelectedVenue(null);
    setSelectedDates([]);
    setForm({
      id: "",
      estate_id: "",
      venue_id: "",
      venue_name: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      booked_dates: [],
      isPaid: false,
    });
  };

  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;

  if (hasNoEstates) {
    return (
      <View
        className={`${
          isDarkMode ? "bg-slate-950" : "bg-slate-50"
        } flex-1 justify-center items-center p-6`}
      >
        <View
          className={`${
            isDarkMode
              ? "bg-gm-navy border-slate-800"
              : "bg-white border-slate-100"
          } p-8 rounded-[2.5rem] shadow-sm items-center border`}
        >
          <ShieldCheck size={60} color={isDarkMode ? "#D4AF37" : "#0A1F44"} />
          <Text
            className={`text-xl font-bold ${
              isDarkMode ? "text-gm-gold" : "text-gm-navy"
            } mt-4 text-center`}
          >
            Access Restricted
          </Text>
          <Text
            className={`text-sm ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            } mt-2 text-center px-4 max-w-[280px]`}
          >
            You are currently not attached to any active estates on GateMan.
          </Text>
          <TouchableOpacity
            className={`w-full p-4 rounded-2xl shadow-sm mt-6 border items-center ${
              isDarkMode
                ? "bg-gm-charcoal border-gm-gold"
                : "bg-slate-900 border-transparent"
            }`}
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
          onPress={() => setActiveTab("CREATE BOOKING")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "CREATE BOOKING"
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
              activeTab === "CREATE BOOKING"
                ? "#D4AF37"
                : isDarkMode
                ? "#A0AEC0"
                : "#0A1F44"
            }
          />
          <Text
            className={`ml-2 font-oswald-semibold text-xs ${
              activeTab === "CREATE BOOKING"
                ? "text-gm-gold"
                : isDarkMode
                ? "text-slate-400"
                : "text-gm-navy"
            }`}
          >
            NEW BOOKING
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ALL BOOKINGS")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "ALL BOOKINGS"
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
              activeTab === "ALL BOOKINGS"
                ? "#D4AF37"
                : isDarkMode
                ? "#A0AEC0"
                : "#0A1F44"
            }
          />
          <Text
            className={`ml-2 font-oswald-semibold text-xs ${
              activeTab === "ALL BOOKINGS"
                ? "text-gm-gold"
                : isDarkMode
                ? "text-slate-400"
                : "text-gm-navy"
            }`}
          >
            ALL BOOKINGS
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "CREATE BOOKING" ? (
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
                className={`font-oswald-semibold text-[10px] uppercase tracking-widest mb-1 ${
                  isDarkMode ? "text-gm-gold" : "text-amber-900"
                }`}
              >
                Scheduling Requirement
              </Text>
              <Text
                className={`text-xs font-bold leading-relaxed ${
                  isDarkMode ? "text-slate-300" : "text-amber-700"
                }`}
              >
                Schedule at least{" "}
                <Text
                  className={`font-black ${
                    isDarkMode ? "text-gm-gold" : "text-amber-900"
                  }`}
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
                    className={`ml-3 font-bold ${
                      isDarkMode ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {selectedEstateName}
                  </Text>
                </View>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {/* --- FACILITY SELECTION DROPDOWN WITH PAID BADGE --- */}
          <SectionHeader
            title="Facility & Date Selection"
            isDarkMode={isDarkMode}
          />
          <View className="mb-4">
            <TouchableOpacity
              onPress={() => setShowVenueModal(true)}
              className={`p-5 rounded-2xl border flex-row justify-between items-center ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <MapPin size={18} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
                <Text
                  className={`ml-3 font-bold flex-shrink ${
                    chosenLocationData
                      ? isDarkMode
                        ? "text-white"
                        : "text-slate-800"
                      : "text-slate-400"
                  }`}
                  numberOfLines={1}
                >
                  {chosenLocationData
                    ? `${chosenLocationData.name} ${
                        chosenLocationData.capacity
                          ? `(${chosenLocationData.capacity} Max)`
                          : ""
                      }`
                    : "Choose Facility"}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                {chosenLocationData && (
                  <View
                    className={`px-2.5 py-1 rounded-lg ${
                      chosenLocationData.is_paid
                        ? "bg-amber-500/10 border border-amber-500/30"
                        : "bg-emerald-500/10 border border-emerald-500/30"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase ${
                        chosenLocationData.is_paid
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {chosenLocationData.is_paid ? "Paid" : "Free"}
                    </Text>
                  </View>
                )}
                <ChevronDown size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* --- DYNAMIC CALENDAR GRID --- */}
          <View className="mb-6">
            <Text
              className={`text-xs font-black uppercase tracking-wider mb-2 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Select Booking Dates{" "}
              {selectedDates.length > 0 &&
                `(${selectedDates.length} Selected)`}
            </Text>

            {!selectedVenue ? (
              <View
                className={`p-6 border border-dashed rounded-2xl text-center items-center justify-center ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <Text className="text-xs font-bold text-slate-400 text-center">
                  Please choose a facility first to unlock available booking
                  calendars.
                </Text>
              </View>
            ) : (
              <View
                className={`border rounded-3xl p-5 ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text
                    className={`text-xs font-black uppercase tracking-wider ${
                      isDarkMode ? "text-slate-200" : "text-slate-700"
                    }`}
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
                            1
                          )
                        )
                      }
                      className={`p-2 rounded-lg border ${
                        isDarkMode
                          ? "bg-gm-navy border-slate-800"
                          : "bg-white border-slate-200"
                      }`}
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
                            1
                          )
                        )
                      }
                      className={`p-2 rounded-lg border ${
                        isDarkMode
                          ? "bg-gm-navy border-slate-800"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <ChevronRight
                        size={14}
                        color={isDarkMode ? "#fff" : "#000"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Weekdays Row */}
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

          {/* Time Picker Inputs */}
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
                className={`ml-3 font-bold ${
                  isDarkMode ? "text-white" : "text-slate-700"
                }`}
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
                className={`ml-3 font-bold ${
                  isDarkMode ? "text-white" : "text-slate-700"
                }`}
              >
                {getDisplayValue("end_time", "End Time")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending Payment Info Banner */}
          {chosenLocationData?.is_paid && (
            <View
              className={`p-4 rounded-2xl mb-6 border flex-row items-center ${
                isDarkMode
                  ? "bg-slate-900 border-slate-800"
                  : "bg-blue-50/60 border-blue-100"
              }`}
            >
              <Info size={16} color={isDarkMode ? "#38bdf8" : "#0284c7"} />
              <Text
                className={`ml-3 text-xs flex-1 ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                This is a paid facility. Complete details and payment options will
                be provided once your booking dates are confirmed by administration.
              </Text>
            </View>
          )}

          {/* Submit & Reset Buttons */}
          <View className="flex-row gap-3 items-center justify-between mb-12">
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
                  Submit Request
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetEvent}
              className={`p-5 rounded-3xl items-center border ${
                isDarkMode
                  ? "bg-slate-900 border-slate-800"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <Text
                className={`font-bold ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <AllEventsScreen />
      )}

      {/* Date Time Picker Modal */}
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true}
          onChange={handleDateChange}
        />
      )}

      {/* --- VENUE SELECTION MODAL --- */}
      <Modal visible={showVenueModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View
            className={`w-full max-h-[80%] rounded-[2.5rem] p-6 border ${
              isDarkMode
                ? "bg-slate-950 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            <Text
              className={`text-lg font-black uppercase mb-4 tracking-wide ${
                isDarkMode ? "text-gm-gold" : "text-gm-navy"
              }`}
            >
              Select Facility
            </Text>

            <TextInput
              placeholder="Search venues..."
              placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
              className={`p-4 rounded-xl border mb-4 font-bold ${
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
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
                    className={`p-4 rounded-xl border mb-2 flex-row justify-between items-center ${
                      isDarkMode
                        ? "bg-gm-navy border-slate-800"
                        : "bg-slate-50 border-slate-100"
                    }`}
                    onPress={() => {
                      setSelectedVenue(item);
                      setSelectedDates([]);
                      setShowVenueModal(false);
                      setVenueSearchQuery("");
                    }}
                  >
                    <View className="flex-1 mr-2">
                      <Text
                        className={`font-bold ${
                          isDarkMode ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {item.name}
                      </Text>
                      {item.capacity && (
                        <Text className="text-xs text-slate-400 mt-0.5">
                          Cap: {item.capacity}
                        </Text>
                      )}
                    </View>

                    {/* Paid vs Free Badge */}
                    <View
                      className={`px-2.5 py-1 rounded-lg ${
                        item.is_paid
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "bg-emerald-500/10 border border-emerald-500/30"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black uppercase ${
                          item.is_paid ? "text-amber-500" : "text-emerald-500"
                        }`}
                      >
                        {item.is_paid ? "Paid" : "Free"}
                      </Text>
                    </View>
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

      {/* --- ESTATE SELECTOR MODAL --- */}
      <Modal visible={showEstateModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View
            className={`w-full max-h-[70%] p-6 rounded-[2.5rem] border ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            }`}
          >
            <Text
              className={`text-xl font-bold mb-4 ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Select Active Estate
            </Text>

            <FlatList
              data={(user?.estates || []).filter((e) =>
                e.name
                  .toLowerCase()
                  .includes(estateSearchQuery.toLowerCase())
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
                    className={`font-bold ${
                      isDarkMode ? "text-white" : "text-slate-800"
                    }`}
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
    </View>
  );
}