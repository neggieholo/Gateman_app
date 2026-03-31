import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, Clock, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Invitation } from "../services/interfaces";

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  onUpdate: (updatedData: Partial<Invitation>) => void;
}

export const EditInvitationModal = ({
  visible,
  onClose,
  invitation,
  onUpdate,
}: EditModalProps) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<Partial<Invitation>>({});
  const [showPicker, setShowPicker] = useState({ type: "", visible: false });

  useEffect(() => {
    if (invitation) {
      setFormData({
        ...invitation,
        excluded_dates: invitation.excluded_dates || [],
      });
    }
  }, [invitation]);

  // --- Formatting Helpers ---
  const formatDisplayName = (dateStr: string | undefined) => {
    if (!dateStr) return "Select Date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  const formatDisplayTime = (timeStr: string | undefined) => {
    if (!timeStr) return "00:00";
    // Handles both "HH:mm" and "HH:mm:ss"
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ type: "", visible: false });
    if (event.type === "dismissed" || !selectedDate) return;

    // FIX: Manual local date extraction to prevent timezone shifting
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(selectedDate.getDate()).padStart(2, "0");

    const dateString = `${year}-${month}-${day}`; // Always YYYY-MM-DD in local time

    const timeString = selectedDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Apply to the correct field
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

      // Ensure selected date is within the bounds
      if (rangeStart && rangeEnd) {
        // Normalize times for accurate date comparison
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

    // Handle times
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
            className="bg-white rounded-t-[32px] p-6 shadow-2xl"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  Edit Pass
                </Text>
                <Text className="text-gray-400 text-xs">
                  Update guest access and blacklists
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="bg-gray-100 p-2 rounded-full"
              >
                <X size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <View className="gap-y-4">
                {/* Date Selectors using formatDisplayName */}
                <View className="flex-row gap-x-3">
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] font-bold mb-1 uppercase">
                      Start Date
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setShowPicker({ type: "startDate", visible: true })
                      }
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-row items-center"
                    >
                      <Calendar size={16} color="#4f46e5" />
                      <Text className="ml-2 text-gray-900 font-semibold">
                        {formatDisplayName(formData.start_date)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] font-bold mb-1 uppercase">
                      End Date
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setShowPicker({ type: "endDate", visible: true })
                      }
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-row items-center"
                    >
                      <Calendar size={16} color="#4f46e5" />
                      <Text className="ml-2 text-gray-900 font-semibold">
                        {formatDisplayName(formData.end_date)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Time Selectors using formatDisplayTime */}
                <View className="flex-row gap-x-3">
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] font-bold mb-1 uppercase">
                      Entry Time
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setShowPicker({ type: "start_time", visible: true })
                      }
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-row items-center"
                    >
                      <Clock size={16} color="#4f46e5" />
                      <Text className="ml-2 text-gray-900 font-semibold">
                        {formatDisplayTime(formData.start_time)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] font-bold mb-1 uppercase">
                      Expiry Time
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setShowPicker({ type: "end_time", visible: true })
                      }
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-row items-center"
                    >
                      <Clock size={16} color="#4f46e5" />
                      <Text className="ml-2 text-gray-900 font-semibold">
                        {formatDisplayTime(formData.end_time)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Blacklisted Dates Section */}
                <View className="mt-2">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-500 text-[10px] font-bold uppercase">
                      Blacklisted Dates
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setShowPicker({ type: "exclude", visible: true })
                      }
                      className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100"
                    >
                      <Text className="text-indigo-600 text-[10px] font-bold">
                        + Add
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="bg-gray-50 rounded-2xl p-3 min-h-[80px]">
                    {formData.excluded_dates &&
                    formData.excluded_dates.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {formData.excluded_dates.map((date) => (
                          <View
                            key={date}
                            className="bg-white border border-gray-200 pl-3 pr-1 py-1 rounded-full flex-row items-center"
                          >
                            <Text className="text-gray-700 text-xs font-medium mr-1">
                              {formatDisplayName(date)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeExclusion(date)}
                              className="bg-red-50 p-1 rounded-full"
                            >
                              <X size={12} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-gray-400 text-xs italic text-center mt-4">
                        No blacklisted dates
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-x-3 mt-2">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 bg-gray-50 py-4 rounded-2xl items-center border border-gray-100"
              >
                <Text className="text-gray-500 font-bold">Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onUpdate(formData)}
                className="flex-1 bg-indigo-600 py-4 rounded-2xl items-center shadow-md shadow-indigo-200"
              >
                <Text className="text-white font-bold">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>

        {showPicker.visible && (
          <DateTimePicker
            // Fallback to today if the string is empty or invalid
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
          />
        )}
      </View>
    </Modal>
  );
};
