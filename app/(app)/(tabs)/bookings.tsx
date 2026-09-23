import AllEventsScreen from "@/app/AllEvents";
import { createEvent, getAllLocations } from "@/app/services/api";
import { BookedDateSlot, EstateFacility } from "@/app/services/interfaces";
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
  Zap,
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
    "CREATE BOOKING",
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
    null,
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);

  // Calendar View Window state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(
    new Date(),
  );
  const [dateTimes, setDateTimes] = useState<
    Record<string, { start_time: string; end_time: string }>
  >({});

  const [longPressedDate, setLongPressedDate] = useState<string | null>(null);

  const [applyTimeToAll, setApplyTimeToAll] = useState(false);

  const [timePickerDate, setTimePickerDate] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    estate_id: "",
    venue_id: "",
    venue_name: "",
    start_date: "",
    end_date: "",
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

  const bookedSlotsByDate = useMemo(() => {
    const slotsByDate: Record<string, BookedDateSlot[]> = {};

    if (!chosenLocationData?.event_booked_on) {
      return slotsByDate;
    }

    Object.values(chosenLocationData.event_booked_on).forEach(
      (bookingContext) => {
        if (!bookingContext?.dates) return;

        bookingContext.dates.forEach((slot) => {
          const existing = slotsByDate[slot.date] || [];

          slotsByDate[slot.date] = [...existing, slot];
        });
      },
    );

    return slotsByDate;
  }, [chosenLocationData]);

  // Booked dates set tracking
  const completelyTakenDatesSet = useMemo(() => {
    const takenSet = new Set<string>();

    if (!chosenLocationData) return takenSet;

    // Calculate required facility booking duration in total minutes
    const requiredDurationMinutes =
      (chosenLocationData.bookingDurationHours || 0) * 60 +
      (chosenLocationData.bookingDurationMinutes || 0);

    // Fallback: Default to at least 1 hour (60 min) if not specified
    const minRequiredMinutes =
      requiredDurationMinutes > 0 ? requiredDurationMinutes : 60;

    Object.entries(bookedSlotsByDate).forEach(([date, slots]) => {
      if (!slots || slots.length === 0) return;

      // 1. Convert booked slots to minute intervals [startMinutes, endMinutes]
      const intervals = slots
        .map((slot) => {
          const [startHour, startMinute] = slot.start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = slot.end_time.split(":").map(Number);
          return {
            start: startHour * 60 + startMinute,
            end: endHour * 60 + endMinute,
          };
        })
        .sort((a, b) => a.start - b.start);

      // 2. Merge overlapping or adjacent booked intervals
      const mergedIntervals: { start: number; end: number }[] = [];
      for (const interval of intervals) {
        if (mergedIntervals.length === 0) {
          mergedIntervals.push(interval);
        } else {
          const last = mergedIntervals[mergedIntervals.length - 1];
          if (interval.start <= last.end) {
            last.end = Math.max(last.end, interval.end);
          } else {
            mergedIntervals.push(interval);
          }
        }
      }

      // 3. Calculate continuous free gaps across the 24-hour day (1440 minutes)
      let maxFreeContinuousMinutes = 0;
      let currentPointer = 0; // Starts at 00:00

      for (const interval of mergedIntervals) {
        if (interval.start > currentPointer) {
          const gap = interval.start - currentPointer;
          if (gap > maxFreeContinuousMinutes) {
            maxFreeContinuousMinutes = gap;
          }
        }
        currentPointer = Math.max(currentPointer, interval.end);
      }

      // Check remaining gap after last booking until end of day (24:00 / 1440 mins)
      if (currentPointer < 1440) {
        const remainingGap = 1440 - currentPointer;
        if (remainingGap > maxFreeContinuousMinutes) {
          maxFreeContinuousMinutes = remainingGap;
        }
      }

      if (maxFreeContinuousMinutes < minRequiredMinutes) {
        takenSet.add(date);
      }
    });

    return takenSet;
  }, [bookedSlotsByDate, chosenLocationData]);

  const hasBookingOnDate = (dateStr: string) => {
    return (bookedSlotsByDate[dateStr]?.length || 0) > 0;
  };

  const toggleDateSelection = (dateStr: string) => {
    if (completelyTakenDatesSet.has(dateStr)) return;

    const [day, month, year] = dateStr.split("-").map(Number);
    const selectedDateObj = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time components for accurate day comparison

    if (selectedDateObj < today) {
      Alert.alert("Invalid Selection", "You cannot select a past date.");
      return;
    }
    //

    setSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        setDateTimes((times) => {
          const next = { ...times };
          delete next[dateStr];
          return next;
        });

        return prev.filter((d) => d !== dateStr);
      }

      setDateTimes((times) => ({
        ...times,
        [dateStr]: {
          start_time: "",
          end_time: "",
        },
      }));

      return [...prev, dateStr];
    });
  };

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
        dateStr: `${dd}-${mm}-${yyyy}`,
      });
    }
    return cells;
  }, [currentCalendarDate]);

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
      (e) => e.id.toString() === selectedEstateId.toString(),
    );
    return found ? found.name : "Select Target Estate";
  }, [selectedEstateId, user?.estates]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(venueSearchQuery.toLowerCase()),
    );
  }, [locations, venueSearchQuery]);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
  // Guard: cancel if picker was dismissed, date is missing, or neither target mode is active
  if (
    event.type === "dismissed" ||
    !selectedDate ||
    (!applyTimeToAll && !timePickerDate)
  ) {
    setShowPicker(null);
    setTimePickerDate(null);
    setApplyTimeToAll(false);
    return;
  }

  const timeString = selectedDate.toTimeString().split(" ")[0]; // "HH:MM:SS"
  const field = showPicker;

  if (field === "start_time" || field === "end_time") {
    const datesToCheck = applyTimeToAll ? selectedDates : [timePickerDate!];

    // 1. Prevent multiple bookings on the same day for this resident
    for (const dateStr of datesToCheck) {
      const residentBookingsOnDate = (
        bookedSlotsByDate[dateStr] || []
      ).filter((slot) => slot.resident_id === user?.id);

      if (residentBookingsOnDate.length > 0) {
        Alert.alert(
          "Booking Limit Reached",
          `You already have an existing booking on ${dateStr}. Multiple bookings on the same day are not allowed.`
        );
        setShowPicker(null);
        setTimePickerDate(null);
        setApplyTimeToAll(false);
        return;
      }
    }

    // 2. Check time validity and interval overlaps
    for (const dateStr of datesToCheck) {
      const existingTimes = dateTimes[dateStr] || {
        start_time: "",
        end_time: "",
      };
      const newStartTime =
        field === "start_time" ? timeString : existingTimes.start_time;
      const newEndTime =
        field === "end_time" ? timeString : existingTimes.end_time;

      if (newStartTime && newEndTime) {
        const [newStartH, newStartM] = newStartTime.split(":").map(Number);
        const [newEndH, newEndM] = newEndTime.split(":").map(Number);
        const proposedStart = newStartH * 60 + newStartM;
        const proposedEnd = newEndH * 60 + newEndM;
        const maxAllowedMinutes =
          (chosenLocationData?.bookingDurationHours || 0) * 60 +
          (chosenLocationData?.bookingDurationMinutes || 0);

        if (proposedStart >= proposedEnd) {
          Alert.alert(
            "Invalid Time Range",
            "End time must be strictly after start time within the same day."
          );
          setShowPicker(null);
          setTimePickerDate(null);
          setApplyTimeToAll(false);
          return;
        }

        if (proposedEnd > 1439) {
          Alert.alert(
            "Invalid End Time",
            "Bookings cannot extend past 11:59 PM on the same day."
          );
          setShowPicker(null);
          setTimePickerDate(null);
          setApplyTimeToAll(false);
          return;
        }

        // --- DURATION LIMIT GUARD ---
        if (maxAllowedMinutes > 0) {
          const selectedDuration = proposedEnd - proposedStart;
          if (selectedDuration > maxAllowedMinutes) {
            const maxHours = Math.floor(maxAllowedMinutes / 60);
            const maxMins = maxAllowedMinutes % 60;
            const durationLabel =
              `${maxHours > 0 ? `${maxHours}h ` : ""}${maxMins > 0 ? `${maxMins}m` : ""}`.trim();

            Alert.alert(
              "Duration Exceeded",
              `The maximum allowed booking duration for this facility is ${durationLabel}.`
            );
            setShowPicker(null);
            setTimePickerDate(null);
            setApplyTimeToAll(false);
            return;
          }
        }

        // Validate collision against existing booked slots
        const existingSlots = bookedSlotsByDate[dateStr] || [];
        const hasConflict = existingSlots.some((slot) => {
          const [sH, sM] = slot.start_time.split(":").map(Number);
          const [eH, eM] = slot.end_time.split(":").map(Number);
          const slotStart = sH * 60 + sM;
          const slotEnd = eH * 60 + eM;

          return (
            Math.max(proposedStart, slotStart) <
            Math.min(proposedEnd, slotEnd)
          );
        });

        if (hasConflict) {
          Alert.alert(
            "Time Conflict Error",
            `The selected time range overlaps with an existing booking on ${dateStr}. Please select a different time window.`
          );
          setShowPicker(null);
          setTimePickerDate(null);
          setApplyTimeToAll(false);
          return;
        }
      }
    }

    // Apply valid time update across resolved targets
    setDateTimes((prev) => {
      const next = { ...prev };
      datesToCheck.forEach((d) => {
        next[d] = {
          ...(next[d] || { start_time: "", end_time: "" }),
          [field]: timeString,
        };
      });
      return next;
    });
  }

  // Always reset controls on exit
  setShowPicker(null);
  setTimePickerDate(null);
  setApplyTimeToAll(false);
};

  const booked_dates_list = selectedDates.sort().map((date) => ({
    date,
    start_time: dateTimes[date]?.start_time || "",
    end_time: dateTimes[date]?.end_time || "",
    resident_id: user?.id,
  }));

  const handleSubmit = async () => {
    if (!selectedEstateId)
      return Alert.alert(
        "Missing Target",
        "Please link an estate to this booking.",
      );
    if (!form.venue_id || selectedDates.length === 0)
      return Alert.alert(
        "Missing Venue Plan",
        "Please select a venue and target dates.",
      );

    const missingTimeDate = selectedDates.find(
      (date) => !dateTimes[date]?.start_time || !dateTimes[date]?.end_time,
    );

    if (missingTimeDate) {
      return Alert.alert(
        "Missing Time",
        `Please set the start and end time for ${new Date(
          `${missingTimeDate}T00:00:00`,
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}.`,
      );
    }

    const sortedDates = [...selectedDates].sort();
    const start_date = sortedDates[0] || "";
    const end_date = sortedDates[sortedDates.length - 1] || "";

    setIsSaving(true);
    try {
      const payload = {
        estate_id: selectedEstateId,
        venue_id: parseInt(form.venue_id, 10),
        venue_name: form.venue_name,
        start_date: start_date,
        end_date: end_date,
        booked_dates: booked_dates_list,
        isPaid: chosenLocationData?.is_paid || false,
      };

      await createEvent(payload);
      Alert.alert(
        "Booking Requested",
        "Your event request has been submitted for approval. You will receive payment instructions once confirmed by admin.",
      );
      resetEvent();
      setActiveTab("ALL BOOKINGS");
    } catch (error: any) {
      Alert.alert("Error", error.toString());
    } finally {
      setIsSaving(false);
    }
  };

  // const getDisplayValue = (field: string, placeholder: string) => {
  //   return form[field as keyof typeof form] || placeholder;
  // };

  const resetEvent = () => {
    setSelectedVenue(null);
    setSelectedDates([]);
    setForm({
      estate_id: "",
      venue_id: "",
      venue_name: "",
      start_date: "",
      end_date: "",
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
                Scheduling Requirement for paid locations
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
              {selectedDates.length > 0 && `(${selectedDates.length} Selected)`}
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
                            1,
                          ),
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
                            1,
                          ),
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

                    const hasBooking = hasBookingOnDate(cell.dateStr);
                    const isTaken =
                      completelyTakenDatesSet.has(cell.dateStr) || hasBooking;
                    const isSelected = selectedDates.includes(cell.dateStr);

                    return (
                      <TouchableOpacity
                        key={cell.dateStr}
                        disabled={isTaken}
                        onPress={() => toggleDateSelection(cell.dateStr)}
                        onLongPress={() => {
                          if (hasBooking) {
                            setLongPressedDate(cell.dateStr);
                          }
                        }}
                        style={{ width: "14.28%" }}
                        className="h-10 p-[2px]"
                      >
                        <View
                          className={`w-full h-full rounded-xl border items-center justify-center ${
                            isTaken
                              ? isDarkMode
                                ? "bg-black border-transparent"
                                : "bg-slate-200 border-transparent"
                              : isSelected
                                ? "bg-indigo-600 border-indigo-600"
                                : hasBooking
                                  ? isDarkMode
                                    ? "bg-gm-navy border-yellow-500"
                                    : "bg-white border-indigo-500"
                                  : isDarkMode
                                    ? "bg-gm-navy border-slate-800"
                                    : "bg-white border-slate-200"
                          }`}
                        >
                          {hasBooking && !isTaken && (
                            <View
                              className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                                isDarkMode ? "bg-yellow-400" : "bg-indigo-500"
                              }`}
                            />
                          )}
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
          {/* <View className="flex-row gap-3 mb-6">
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
          </View> */}
          {selectedDates.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className={`text-xs font-black uppercase tracking-wider ${
                    isDarkMode ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Booking Times
                </Text>

                {selectedDates.length > 1 && (
                  <View
                    className={`p-4 rounded-2xl border mb-4 flex-row items-center justify-between ${
                      isDarkMode
                        ? "bg-gm-navy border-slate-800"
                        : "bg-indigo-50/60 border-indigo-100"
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <Zap
                        size={16}
                        color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                      />
                      <Text
                        className={`ml-2 text-xs font-bold ${
                          isDarkMode ? "text-slate-200" : "text-indigo-950"
                        }`}
                      >
                        Apply Same Time to All Dates
                      </Text>
                    </View>

                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          setApplyTimeToAll(true);
                          setShowPicker("start_time");
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-600"
                      >
                        <Text className="text-[10px] font-black uppercase text-white">
                          Set All Start
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setApplyTimeToAll(true);
                          setShowPicker("end_time");
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-600"
                      >
                        <Text className="text-[10px] font-black uppercase text-white">
                          Set All End
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
              {selectedDates.sort().map((date) => {
                const dateTime = dateTimes[date] || {
                  start_time: "",
                  end_time: "",
                };
                const hasBooking = hasBookingOnDate(date);

                return (
                  <View
                    key={date}
                    className={`p-4 rounded-2xl border mb-3 ${
                      isDarkMode
                        ? "bg-gm-navy border-slate-800"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <TouchableOpacity
                        onLongPress={() => {
                          if (hasBooking) {
                            setLongPressedDate(date);
                          }
                        }}
                      >
                        <Text
                          className={`font-black ${
                            isDarkMode ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {new Date(`${date}T00:00:00`).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </Text>
                      </TouchableOpacity>

                      {hasBookingOnDate(date) && (
                        <View className="px-2 py-1 rounded-lg bg-yellow-500/10">
                          <Text className="text-[10px] font-black text-yellow-500">
                            PARTIALLY BOOKED
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => {
                          setApplyTimeToAll(false);
                          setTimePickerDate(date); // e.g., '15-09-2026'
                          setShowPicker("start_time");
                        }}
                        className={`flex-1 p-4 rounded-xl border ${
                          isDarkMode
                            ? "bg-slate-900 border-slate-800"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <Text className="text-[10px] font-black text-slate-400 uppercase">
                          Start
                        </Text>

                        <Text
                          className={`mt-1 font-bold ${
                            dateTime.start_time
                              ? isDarkMode
                                ? "text-white"
                                : "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {dateTime.start_time || "Set time"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setApplyTimeToAll(false);
                          setTimePickerDate(date); // e.g., '15-09-2026'
                          setShowPicker("end_time");
                        }}
                        className={`flex-1 p-4 rounded-xl border ${
                          isDarkMode
                            ? "bg-slate-900 border-slate-800"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <Text className="text-[10px] font-black text-slate-400 uppercase">
                          End
                        </Text>

                        <Text
                          className={`mt-1 font-bold ${
                            dateTime.end_time
                              ? isDarkMode
                                ? "text-white"
                                : "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {dateTime.end_time || "Set time"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
                This is a paid facility. Complete details and payment options
                will be provided once your booking dates are confirmed by
                administration.
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
          onChange={handleTimeChange}
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
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100"
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
      {/* --- BOOKED SLOTS DETAILS BOTTOM MODAL --- */}
      <Modal
        visible={!!longPressedDate}
        animationType="slide"
        transparent
        onRequestClose={() => setLongPressedDate(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View
            className={`w-full rounded-t-[2.5rem] p-6 border-t ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            {/* Drag handle pill */}
            <View className="w-12 h-1.5 bg-slate-400/40 rounded-full self-center mb-4" />

            <Text
              className={`text-base font-black uppercase mb-1 tracking-wide ${
                isDarkMode ? "text-gm-gold" : "text-gm-navy"
              }`}
            >
              Existing Bookings
            </Text>

            <Text
              className={`text-xs font-bold mb-4 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {longPressedDate &&
                new Date(`${longPressedDate}T00:00:00`).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
            </Text>

            {/* Booked Time Intervals List */}
            <View className="mb-4 max-h-60">
              <ScrollView showsVerticalScrollIndicator={false}>
                {(bookedSlotsByDate[longPressedDate || ""] || []).map(
                  (slot, idx) => (
                    <View
                      key={idx}
                      className={`p-4 rounded-2xl border mb-2 flex-row justify-between items-center ${
                        isDarkMode
                          ? "bg-gm-navy border-slate-800"
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <Clock
                          size={16}
                          color={isDarkMode ? "#D4AF37" : "#6366f1"}
                        />
                        <Text
                          className={`font-black text-sm ${
                            isDarkMode ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {slot.start_time} - {slot.end_time}
                        </Text>
                      </View>

                      <View className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <Text className="text-[10px] font-black uppercase text-amber-500">
                          Reserved
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => setLongPressedDate(null)}
              className={`p-4 rounded-2xl items-center border ${
                isDarkMode
                  ? "bg-gm-charcoal border-gm-gold"
                  : "bg-slate-900 border-transparent"
              }`}
            >
              <Text className="text-white font-black text-xs uppercase tracking-wider">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
