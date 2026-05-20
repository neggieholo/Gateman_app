import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Invitation } from "../services/interfaces";
import { useUser } from "../UserContext";

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  onUpdate: (updatedData: Partial<Invitation>) => void;
}

const STAFF_POSITIONS = [
  "Driver",
  "Chef / Cook",
  "Cleaner / Housekeeper",
  "Gardener",
  "Security / Gatekeeper",
  "Nanny / Babysitter",
  "Electrician / Plumber",
  "Facility Maintenance",
  "Tailor / Fashion Designer",
  "Delivery / Logistics",
];

const DAYS_OF_WEEK = [
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
  { label: "S", value: 7 },
];

export const EditInvitationModal = ({
  visible,
  onClose,
  invitation,
  onUpdate,
}: EditModalProps) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode, theme } = useUser();
  const [formData, setFormData] = useState<Partial<Invitation>>({});
  const [showPicker, setShowPicker] = useState({ type: "", visible: false });
  const [positionModalVisible, setPositionModalVisible] = useState(false);

  useEffect(() => {
    if (invitation) {
      setFormData({
        ...invitation,
        permitted_days: invitation.permitted_days || [],
        excluded_dates: invitation.excluded_dates || [],
        is_activated:
          invitation.is_activated !== undefined
            ? invitation.is_activated
            : true,
        staff_position: invitation.staff_position || "",
      });
    }
  }, [invitation]);

  const isStaffEntry = invitation?.invite_type === "staff_entry";
  const isMultiEntry = invitation?.invite_type === "multi_entry";

  // --- Formatting Helpers ---
  const formatDisplayName = (dateStr: string | undefined) => {
    if (!dateStr) return "Select Date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB");
  };

  const formatDisplayTime = (timeStr: string | undefined) => {
    if (!timeStr) return "00:00";
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const togglePermittedDay = (dayValue: number) => {
    const currentDays = formData.permitted_days || [];
    let updatedDays: number[];

    if (currentDays.includes(dayValue)) {
      updatedDays = currentDays.filter((d) => d !== dayValue);
    } else {
      updatedDays = [...currentDays, dayValue];
    }

    setFormData({ ...formData, permitted_days: updatedDays });
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ type: "", visible: false });
    if (event.type === "dismissed" || !selectedDate) return;

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    const timeString = selectedDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (showPicker.type === "startDate")
      setFormData({ ...formData, start_date: dateString });
    if (showPicker.type === "endDate")
      setFormData({ ...formData, end_date: dateString });

    if (showPicker.type === "exclude") {
      const rangeStart = formData.start_date
        ? new Date(formData.start_date)
        : null;
      const rangeEnd = formData.end_date ? new Date(formData.end_date) : null;
      const selected = new Date(dateString);

      if (rangeStart && rangeEnd) {
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);

        if (selected < rangeStart || selected > rangeEnd) {
          Alert.alert(
            "Invalid Date",
            "Excluded dates must be between the Start and End dates.",
          );
          return;
        }
      }
      const currentExclusions = formData.excluded_dates || [];
      if (!currentExclusions.includes(dateString)) {
        setFormData({
          ...formData,
          excluded_dates: [...currentExclusions, dateString].sort(),
        });
      }
    }

    if (showPicker.type === "start_time")
      setFormData({ ...formData, start_time: timeString });
    if (showPicker.type === "end_time")
      setFormData({ ...formData, end_time: timeString });
  };

  const removeExclusion = (dateStr: string) => {
    setFormData({
      ...formData,
      excluded_dates: (formData.excluded_dates || []).filter(
        (d) => d !== dateStr,
      ),
    });
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/50">
          <KeyboardAwareScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          >
            <TouchableOpacity
              className="flex-1"
              activeOpacity={1}
              onPress={onClose}
            />

            <View
              className={`rounded-t-[32px] p-6 shadow-2xl border-t ${
                isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-transparent"
              }`}
              style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
              {/* Top Drag Indicator */}
              <View className="items-center mb-4">
                <View className={`w-12 h-1.5 rounded-full ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`} />
              </View>

              {/* Header Title */}
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text className={`text-xl font-bold font-sans ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}>
                    Edit Pass
                  </Text>
                  <Text className="text-gray-400 text-xs font-sans">
                    Update access controls
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className={`p-2 rounded-full ${isDarkMode ? "bg-gm-charcoal" : "bg-gray-100"}`}
                >
                  <X size={20} color={isDarkMode ? "#D4AF37" : "#4B5563"} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                <View className="gap-y-4">
                  {/* --- Staff Management Tools Section --- */}
                  {isStaffEntry && (
                    <View className={`border p-4 rounded-2xl gap-y-4 mb-2 ${
                      isDarkMode ? "bg-gm-charcoal/40 border-slate-800" : "bg-slate-50 border-slate-100"
                    }`}>
                      {/* Activation Control */}
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1 pr-4">
                          <Text className={`font-bold font-sans text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                            Pass Activation Status
                          </Text>
                          <Text className="text-gray-400 text-xs font-sans mt-0.5">
                            Toggle to instantly suspend or allow gatehouse passage
                          </Text>
                        </View>
                        <Switch
                          trackColor={{
                            false: isDarkMode ? "#334155" : "#f1f5f9",
                            true: "#c7d2fe",
                          }}
                          thumbColor={
                            formData.is_activated
                              ? "#4f46e5"
                              : isDarkMode
                                ? "#64748b"
                                : "#cbd5e1"
                          }
                          ios_backgroundColor={isDarkMode ? "#334155" : "#f1f5f9"}
                          onValueChange={(val) =>
                            setFormData({ ...formData, is_activated: val })
                          }
                          value={formData.is_activated}
                        />
                      </View>

                      <View className={`h-[1px] ${isDarkMode ? "bg-slate-800" : "bg-gray-200/60"}`} />

                      {/* Staff Position Role Selector */}
                      <View>
                        <Text className="text-gray-400 text-[10px] font-bold font-sans mb-1 uppercase tracking-wider">
                          Staff Position Role
                        </Text>
                        <TouchableOpacity
                          onPress={() => setPositionModalVisible(true)}
                          className={`border rounded-2xl p-4 flex-row justify-between items-center shadow-sm ${
                            isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-gray-200"
                          }`}
                        >
                          <View className="flex-row items-center">
                            <Briefcase size={16} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                            <Text className={`ml-2 font-semibold font-sans ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                              {formData.staff_position || "Select Role"}
                            </Text>
                          </View>
                          <ChevronDown
                            size={16}
                            color={isDarkMode ? "#D4AF37" : "#94a3b8"}
                          />
                        </TouchableOpacity>
                      </View>

                      <View className={`h-[1px] ${isDarkMode ? "bg-slate-800" : "bg-gray-200/60"}`} />

                      {/* Permitted Access Days */}
                      <View>
                        <Text className="text-gray-400 text-[10px] font-bold font-sans mb-1 uppercase tracking-wider">
                          Permitted Access Days
                        </Text>
                        <Text className="text-gray-400 text-xs font-sans mb-2">
                          Select the days this staff member is authorized to access the estate
                        </Text>
                        <View className="flex-row justify-between mt-1">
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected =
                              formData.permitted_days?.includes(day.value);
                            return (
                              <TouchableOpacity
                                key={day.value}
                                onPress={() => togglePermittedDay(day.value)}
                                className={`w-10 h-10 rounded-full items-center justify-center border ${
                                  isSelected
                                    ? isDarkMode
                                      ? "bg-gm-gold border-gm-gold"
                                      : "bg-indigo-600 border-indigo-600"
                                    : isDarkMode
                                      ? "bg-gm-navy border-slate-800"
                                      : "bg-white border-gray-200"
                                }`}
                              >
                                <Text
                                  className={`text-xs font-bold font-sans ${
                                    isSelected
                                      ? isDarkMode
                                        ? "text-gm-navy"
                                        : "text-white"
                                      : isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-700"
                                  }`}
                                >
                                  {day.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Date Selectors */}
                  <View className="flex-row gap-x-3">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-bold font-sans mb-1 uppercase tracking-wider">
                        Start Date
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setShowPicker({ type: "startDate", visible: true })
                        }
                        className={`border rounded-2xl p-4 flex-row items-center ${
                          isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Calendar size={16} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                        <Text className={`ml-2 font-semibold font-sans ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          {formatDisplayName(formData.start_date)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-bold font-sans mb-1 uppercase tracking-wider">
                        End Date
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setShowPicker({ type: "endDate", visible: true })
                        }
                        className={`border rounded-2xl p-4 flex-row items-center ${
                          isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Calendar size={16} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                        <Text className={`ml-2 font-semibold font-sans ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          {formatDisplayName(formData.end_date) || "No Expiry"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Time Selectors */}
                  <View className="flex-row gap-x-3">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-bold font-sans mb-1 uppercase tracking-wider">
                        Entry Time
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setShowPicker({ type: "start_time", visible: true })
                        }
                        className={`border rounded-2xl p-4 flex-row items-center ${
                          isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Clock size={16} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                        <Text className={`ml-2 font-semibold font-sans ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          {formatDisplayTime(formData.start_time)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-bold font-sans mb-1 uppercase tracking-wider">
                        Expiry Time
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setShowPicker({ type: "end_time", visible: true })
                        }
                        className={`border rounded-2xl p-4 flex-row items-center ${
                          isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Clock size={16} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                        <Text className={`ml-2 font-semibold font-sans ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          {formatDisplayTime(formData.end_time)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Blacklisted Dates Section — Enforced ONLY for multi-entry */}
                  {isMultiEntry && (
                    <View className="mt-2">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-400 text-[10px] font-bold font-sans uppercase tracking-wider">
                          Blacklisted Dates
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setShowPicker({ type: "exclude", visible: true })
                          }
                          className={`px-3 py-1 rounded-lg border ${
                            isDarkMode
                              ? "bg-gm-charcoal border-slate-800"
                              : "bg-indigo-50 border-indigo-100"
                          }`}
                        >
                          <Text className={`text-[10px] font-bold font-sans ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}>
                            + Add
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View className={`border rounded-2xl p-3 min-h-[80px] ${
                        isDarkMode ? "bg-gm-charcoal/40 border-slate-800" : "bg-gray-50 border-transparent"
                      }`}>
                        {formData.excluded_dates &&
                        formData.excluded_dates.length > 0 ? (
                          <View className="flex-row flex-wrap gap-2">
                            {formData.excluded_dates.map((date) => (
                              <View
                                key={date}
                                className={`border pl-3 pr-1 py-1 rounded-full flex-row items-center ${
                                  isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-gray-200"
                                }`}
                              >
                                <Text className={`text-xs font-medium font-sans mr-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                  {formatDisplayName(date)}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => removeExclusion(date)}
                                  className="bg-red-50 dark:bg-red-950/40 p-1 rounded-full"
                                >
                                  <X size={12} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text className="text-gray-400 text-xs italic font-sans text-center mt-4">
                            No blacklisted dates
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="flex-row gap-x-3 mt-2">
                <TouchableOpacity
                  onPress={onClose}
                  className={`flex-1 py-4 rounded-2xl items-center border ${
                    isDarkMode
                      ? "bg-gm-charcoal border-slate-800"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <Text className="text-gray-400 font-bold font-sans">
                    Discard
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onUpdate(formData)}
                  className={`flex-1 py-4 rounded-2xl items-center border ${
                    isDarkMode
                      ? "bg-gm-navy border-gm-gold"
                      : "bg-indigo-600 border-transparent shadow-md shadow-indigo-200"
                  }`}
                >
                  <Text className={`font-bold font-sans ${isDarkMode ? "text-gm-gold" : "text-white"}`}>
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAwareScrollView>

          {showPicker.visible && (
            <DateTimePicker
              value={
                formData.start_date ? new Date(formData.start_date) : new Date()
              }
              mode={
                ["start_time", "end_time"].includes(showPicker.type)
                  ? "time"
                  : "date"
              }
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onPickerChange}
              minimumDate={new Date()}
              themeVariant={isDarkMode ? "dark" : "light"}
            />
          )}
        </View>
      </Modal>

      {/* --- Inline Staff Position Selection Sub-Modal --- */}
      <Modal visible={positionModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <View className={`rounded-t-3xl p-5 max-h-[60%] border-t ${
            isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-transparent"
          }`}>
            <View className={`flex-row justify-between items-center mb-4 pb-2 border-b ${
              isDarkMode ? "border-slate-800" : "border-gray-100"
            }`}>
              <Text className={`text-base font-bold font-sans ${isDarkMode ? "text-gm-gold" : "text-gray-900"}`}>
                Select Staff Role
              </Text>
              <TouchableOpacity
                onPress={() => setPositionModalVisible(false)}
                className={`p-1.5 rounded-full ${isDarkMode ? "bg-gm-charcoal" : "bg-gray-100"}`}
              >
                <X size={16} color={isDarkMode ? "#D4AF37" : "#1e293b"} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STAFF_POSITIONS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setFormData({ ...formData, staff_position: item });
                    setPositionModalVisible(false);
                  }}
                  className={`p-4 border-b flex-row justify-between items-center ${
                    isDarkMode ? "border-slate-800/60" : "border-gray-50"
                  } ${
                    formData.staff_position === item
                      ? isDarkMode
                        ? "bg-gm-charcoal/40"
                        : "bg-indigo-50/40"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-sans ${
                      formData.staff_position === item
                        ? isDarkMode
                          ? "text-gm-gold font-bold"
                          : "text-indigo-600 font-bold"
                        : isDarkMode
                          ? "text-gray-300"
                          : "text-gray-700"
                    }`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};