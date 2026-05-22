import { InvitationCard } from "@/app/components/InvitationCard";
import TrackGuestView from "@/app/components/TrackGuest";
import { getCloudinaryUrl, invitationApi } from "@/app/services/api";
import { LocationPair } from "@/app/services/interfaces";
import { useUser } from "@/app/UserContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  ImageIcon,
  MapPin,
  ShieldCheck,
  Square,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";

interface InviteGuestFormProps {
  selectedEstateId: string | null;
  setEstatePickerVisible: (visible: boolean) => void;
  activeEstate: any;
  activeLocations: LocationPair[];
}

// --- 1. Invite Guest View Component ---
const InviteGuestForm = ({
  selectedEstateId,
  setEstatePickerVisible,
  activeEstate,
  activeLocations,
}: InviteGuestFormProps) => {
  const { user, isDarkMode } = useUser();
  const [guestType, setGuestType] = useState("one_time"); // one_time | multi_entry | staff_entry
  const [guestName, setGuestName] = useState("");
  const [staffPosition, setStaffPosition] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const viewShotRef = useRef<any>(null);
  const [generatedCode, setGeneratedCode] = useState("000000");

  // Real Date/Time States
  const [startDate, setStartDate] = useState(new Date());

  // staff_entry ends are optional; defaults to null
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [fromTime, setFromTime] = useState(new Date());
  const [toTime, setToTime] = useState(
    new Date(new Date().setHours(new Date().getHours() + 2)),
  );

  // UI Visibility States
  const [showPicker, setShowPicker] = useState({ type: "", visible: false });
  const [guestImage, setGuestImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [permittedDays, setPermittedDays] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 0,
  ]);

  const STAFF_POSITIONS = [
    "Driver",
    "Cook",
    "Housekeeper",
    "Gardener",
    "Security",
    "Nanny",
    "Electrician",
    "Plumber",
    "Facility Maintenance",
    "Tailor",
    "Delivery",
  ];

  const DAYS_OF_WEEK = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 },
  ];

  const handleTypeChange = (type: string) => {
    setGuestType(type);
    if (type === "multi_entry") {
      setEndDate(new Date(new Date().setDate(new Date().getDate() + 7)));
    } else {
      setEndDate(null);
    }
  };

  const toggleDay = (dayValue: number) => {
    setPermittedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue],
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
    });

    if (!result.canceled) {
      setGuestImage(result.assets[0].uri);
    }
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowPicker({ type: "", visible: false });
      return;
    }

    const currentDate = selectedDate || new Date();
    const dateString = currentDate.toISOString().split("T")[0];
    setShowPicker({ type: "", visible: false });

    if (showPicker.type === "startDate") setStartDate(currentDate);
    if (showPicker.type === "endDate") {
      if (currentDate < startDate) {
        Alert.alert(
          "Invalid Range",
          "End date cannot be earlier than start date.",
        );
        return;
      }
      setEndDate(currentDate);
    }
    if (showPicker.type === "from") setFromTime(currentDate);
    if (showPicker.type === "to") setToTime(currentDate);

    if (showPicker.type === "exclude") {
      const rangeStart = new Date(startDate.setHours(0, 0, 0, 0));
      const rangeEnd = endDate
        ? new Date(endDate.setHours(0, 0, 0, 0))
        : new Date(new Date().setFullYear(new Date().getFullYear() + 10));
      const selected = new Date(currentDate.setHours(0, 0, 0, 0));

      if (selected < rangeStart || selected > rangeEnd) {
        Alert.alert(
          "Invalid Date",
          "Excluded dates must be within valid entry range bounds.",
        );
        return;
      }
      setExcludedDates((prev) =>
        prev.includes(dateString)
          ? prev.filter((d) => d !== dateString)
          : [...prev, dateString].sort(),
      );
    }
  };

  const formatTime = (time: Date | null) => {
    if (!time) return "00:00 AM";

    return time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date | null, typeContext: string = "normal") => {
    if (!date) return "No Expiration Set";

    let dateToFormat = new Date(date.getTime());

    if (guestType === "one_time" && typeContext === "one_time_end") {
      const fromVal = fromTime.getHours() * 60 + fromTime.getMinutes();
      const toVal = toTime.getHours() * 60 + toTime.getMinutes();

      if (toVal < fromVal) {
        dateToFormat.setDate(dateToFormat.getDate() + 1);
      }
    }

    return dateToFormat.toLocaleDateString("en-GB");
  };
  

  const handleGenerateCode = async () => {
    if (!selectedEstateId)
      return Alert.alert(
        "Context Missing",
        "Please select a property context first.",
      );
    if (!guestName.trim()) return Alert.alert("Error", "Enter name details");
    if (guestType === "staff_entry" && !staffPosition.trim()) {
      return Alert.alert("Error", "Please clarify staff position role");
    }
    if (guestType === "multi_entry" && !endDate) {
      return Alert.alert("Error", "Please set a validity end date");
    }
    if (guestType === "staff_entry" && permittedDays.length === 0) {
      return Alert.alert(
        "Error",
        "Please select at least one permitted workday.",
      );
    }

    try {
      setIsUploading(true);

      let uploadedUrl = null;
      if (guestImage) {
        const url = await getCloudinaryUrl(guestImage, "image");
        if (url) uploadedUrl = url;
      }

      let finalEndDate: string | null = endDate
        ? endDate.toISOString().split("T")[0]
        : null;

      if (guestType === "one_time") {
        const fromVal = fromTime.getHours() * 60 + fromTime.getMinutes();
        const toVal = toTime.getHours() * 60 + toTime.getMinutes();
        const nextDay = new Date(startDate);
        if (toVal < fromVal) {
          nextDay.setDate(nextDay.getDate() + 1);
        }
        finalEndDate = nextDay.toISOString().split("T")[0];
      }

      let computedExclusions: string[] = [...excludedDates];

      // if (guestType === "staff_entry") {
      //   computedExclusions = [];

      //   if (endDate) {
      //     const currentTrackingDate = new Date(startDate);
      //     const evaluationLimit = new Date(endDate);

      //     while (currentTrackingDate <= evaluationLimit) {
      //       const currentDayOfWeek = currentTrackingDate.getDay();
      //       if (!permittedDays.includes(currentDayOfWeek)) {
      //         computedExclusions.push(
      //           currentTrackingDate.toISOString().split("T")[0],
      //         );
      //       }
      //       currentTrackingDate.setDate(currentTrackingDate.getDate() + 1);
      //     }
      //   }
      // }

      const payload = {
        estate_id: selectedEstateId,
        guest_name: guestName,
        guest_image_url: uploadedUrl,
        invite_type: guestType,
        staff_position: guestType === "staff_entry" ? staffPosition : null,
        start_date: startDate.toISOString().split("T")[0],
        end_date: finalEndDate,
        start_time: fromTime.toTimeString().split(" ")[0].slice(0, 5),
        end_time: toTime.toTimeString().split(" ")[0].slice(0, 5),
        excluded_dates:
          guestType === "multi_entry" ? excludedDates : computedExclusions,
        permitted_days: guestType === "staff_entry" ? permittedDays : [], // 🛠️ Added to API Payload
      };

      const response = await invitationApi.createInvitation(payload);

      if (response && response.access_code) {
        setGeneratedCode(response.access_code);

        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!viewShotRef.current) {
          return Alert.alert(
            "Debug Error",
            "viewShotRef element target dropped unexpectedly.",
          );
        }

        const imageUri = await captureRef(viewShotRef, {
          format: "png",
          quality: 1.0,
          result: "tmpfile",
        });

        if (imageUri) {
          const isAvailable = await Sharing.isAvailableAsync();

          if (isAvailable) {
            await Sharing.shareAsync(imageUri, {
              mimeType: "image/png",
              dialogTitle: "Share Staff/Guest Access Pass",
              UTI: "public.png",
            });
          } else {
            await Share.share({
              title: "Access Pass",
              url: imageUri,
              message: `GateMan Access Pass for ${guestName}. Code: ${response.access_code}`,
            });
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Failed", error.message);
    } finally {
      setIsUploading(false);
      setGuestName("");
      setStaffPosition("");
      setGuestImage(null);
      setGeneratedCode("000000");
      setExcludedDates([]);
      setPermittedDays([1, 2, 3, 4, 5, 6, 0]);
    }
  };

  return (
    <>
      {/* Dynamic Estate Selector Banner Inside Form (Visible if user belongs to > 1 estate) */}
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mb-4 flex-row items-center justify-between p-4 rounded-2xl border ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={14} color="#6366f1" />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-wider ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              } flex-1`}
              numberOfLines={1}
            >
              Inviting into: {activeEstate?.name || "Select Estate"}
            </Text>
          </View>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {/* Guest Type Selector */}
      <View className="flex-row gap-4 mb-6 flex-wrap justify-evenly p-2">
        {["one_time", "multi_entry", "staff_entry"].map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => handleTypeChange(type)}
            className={`flex-row items-center p-2 rounded-full border ${
              guestType === type
                ? isDarkMode
                  ? "bg-gm-navy border-gm-gold"
                  : "bg-indigo-100"
                : isDarkMode
                  ? "bg-gm-charcoal border-slate-800"
                  : "bg-white border-gray-200"
            }`}
          >
            <View
              className={`w-4 h-4 rounded-full border-2 mr-2 ${
                guestType === type
                  ? isDarkMode
                    ? "bg-gm-gold border-gm-gold"
                    : "border-indigo-600 bg-indigo-600"
                  : "border-gray-400"
              }`}
            />
            <Text
              className={`font-oswald-semibold capitalize ${
                guestType === type
                  ? isDarkMode
                    ? "text-gm-gold"
                    : "text-indigo-800"
                  : "text-gray-600"
              }`}
            >
              {type.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="pb-3 mt-2 flex gap-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex gap-5">
          {/* Dynamic Name Input Context */}
          <View>
            <Text
              className={`font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
            >
              {guestType === "staff_entry" ? "Staff Name:" : "Guest Name:"}
            </Text>
            <TextInput
              className={`p-4 rounded-lg border ${
                isDarkMode
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder={
                guestType === "staff_entry"
                  ? "Enter staff name"
                  : "Enter guest name"
              }
              placeholderTextColor={"#94a3b8"}
              value={guestName}
              onChangeText={setGuestName}
            />
          </View>

          {/* Conditional Staff Position Entry */}
          {guestType === "staff_entry" && (
            <View>
              <Text
                className={`font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
              >
                Staff Position:
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(true)}
                className={`flex-row justify-between items-center p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`font-medium ${staffPosition ? (isDarkMode ? "text-white" : "text-gray-900") : "text-gray-400"}`}
                >
                  {staffPosition || "Select staff position role"}
                </Text>
                <ChevronDown size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Arrival Date Selector */}
          <View>
            <Text
              className={`font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
            >
              {guestType === "one_time" ? "Arrival Date:" : "Start Date:"}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setShowPicker({ type: "startDate", visible: true })
              }
              className={`flex-row justify-between items-center p-4 rounded-lg border ${
                isDarkMode
                  ? "bg-slate-900 border-slate-800"
                  : "bg-white border-gray-300"
              }`}
            >
              <View className="flex-row items-center">
                <Calendar size={20} color="#4f46e5" className="mr-2" />
                <Text
                  className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {formatDate(startDate)}
                </Text>
              </View>
              <Text className="text-gray-400 text-xs">Tap to change</Text>
            </TouchableOpacity>
          </View>

          {/* Optional End Date Container */}
          {guestType !== "one_time" && (
            <View className="mt-2">
              <View className="flex-row justify-between items-center mb-1">
                <Text
                  className={`font-medium ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                >
                  End Date{" "}
                  {guestType === "staff_entry" && (
                    <Text className="text-gray-400 text-xs">(Optional)</Text>
                  )}
                  :
                </Text>
                {guestType === "staff_entry" && endDate && (
                  <TouchableOpacity onPress={() => setEndDate(null)}>
                    <Text className="text-red-500 font-bold text-xs">
                      Remove Expiry
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() =>
                  setShowPicker({ type: "endDate", visible: true })
                }
                className={`flex-row justify-between items-center p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-gray-300"
                }`}
              >
                <View className="flex-row items-center">
                  <Calendar size={20} color="#4f46e5" className="mr-2" />
                  <Text
                    className={`font-medium ${endDate ? (isDarkMode ? "text-white" : "text-gray-900") : "text-gray-400 italic"}`}
                  >
                    {formatDate(endDate)}
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs">Tap to change</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Permitted Access Workdays Checkboxes */}
          {guestType === "staff_entry" && (
            <View className="mt-2">
              <Text
                className={`font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
              >
                Permitted Access Workdays:
              </Text>
              <View
                className={`flex-row flex-wrap gap-x-4 gap-y-3 p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-gray-300"
                }`}
              >
                {DAYS_OF_WEEK.map((day) => {
                  const isChecked = permittedDays.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      onPress={() => toggleDay(day.value)}
                      className="flex-row items-center w-[21%]"
                    >
                      {isChecked ? (
                        <CheckSquare size={20} color="#4f46e5" />
                      ) : (
                        <Square size={20} color="#64748b" />
                      )}
                      <Text
                        className={`ml-2 text-sm font-medium ${isChecked ? "text-indigo-400 font-bold" : "text-gray-500"}`}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Excluded Blacklisted Entry Blocks (Multi-Entry Only) */}
          {guestType === "multi_entry" && (
            <>
              <View className="flex-row justify-between items-center my-3">
                <Text
                  className={`font-bold ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                >
                  Blacklisted Dates:
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowPicker({ type: "exclude", visible: true })
                  }
                  className="bg-indigo-50 px-3 py-2 rounded-lg flex-row items-center border border-indigo-100"
                >
                  <Calendar size={16} color="#4f46e5" />
                  <Text className="text-indigo-600 ml-2 font-bold text-xs">
                    Add Date
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{ height: 100 }}
                className={`rounded-xl p-2 ${isDarkMode ? "bg-slate-950" : "bg-gray-100"}`}
              >
                {excludedDates.length > 0 ? (
                  <ScrollView nestedScrollEnabled={true}>
                    <View className="flex-row flex-wrap gap-2">
                      {excludedDates.map((dateStr) => (
                        <View
                          key={dateStr}
                          className={`pl-3 pr-1 py-1 rounded-full flex-row items-center border ${
                            isDarkMode
                              ? "bg-slate-900 border-slate-800"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium mr-2 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}
                          >
                            {dateStr.split("-").reverse().join("/")}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setExcludedDates((prev) =>
                                prev.filter((d) => d !== dateStr),
                              )
                            }
                            className="bg-red-50 p-1 rounded-full"
                          >
                            <X size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-400 text-xs italic">
                      No exclusions set.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Time Range Selectors */}
          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text
                className={`font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
              >
                From:
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker({ type: "from", visible: true })}
                className={`flex-row items-center p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-gray-300"
                }`}
              >
                <Clock size={18} color="#4f46e5" className="mr-2" />
                <Text
                  className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {formatTime(fromTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text
                className={`font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
              >
                To:
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker({ type: "to", visible: true })}
                className={`flex-row items-center p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-gray-300"
                }`}
              >
                <Clock size={18} color="#4f46e5" className="mr-2" />
                <Text
                  className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {formatTime(toTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showPicker.visible && (
            <DateTimePicker
              value={
                showPicker.type === "startDate"
                  ? startDate
                  : showPicker.type === "endDate"
                    ? endDate || new Date()
                    : showPicker.type === "exclude"
                      ? new Date()
                      : showPicker.type === "from"
                        ? fromTime
                        : toTime
              }
              mode={["from", "to"].includes(showPicker.type) ? "time" : "date"}
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onPickerChange}
              minimumDate={new Date()}
            />
          )}

          <View>
            {guestImage ? (
              <View className="relative w-24 h-24">
                <Image
                  source={{ uri: guestImage }}
                  className="w-24 h-24 rounded-xl"
                />
                <TouchableOpacity
                  onPress={() => setGuestImage(null)}
                  disabled={isUploading}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                >
                  <X size={12} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={pickImage}
                  className={`flex-row items-center self-start px-4 py-3 rounded-xl border border-dashed ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-700"
                      : "bg-gray-100 border-gray-300"
                  }`}
                >
                  <ImageIcon size={20} color="#4f46e5" />
                  <Text className="text-indigo-600 ml-2 font-bold">
                    Add a Photo
                  </Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-xs italic mt-2 px-1 text-center">
                  * Invited staff/guests without a photo might be required to
                  present verification items at the gatehouse.
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            className={`mt-6 py-4 rounded-xl shadow-lg ${isUploading ? (isDarkMode ? "bg-gray-500" : "bg-indigo-400") : isDarkMode ? "bg-gm-charcoal" : "bg-indigo-600"}`}
            onPress={handleGenerateCode}
            disabled={isUploading}
          >
            <Text className="text-white text-lg font-bold text-center">
              {isUploading ? "Processing..." : "Generate Access Code"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ⚡ LOCATIONS ARE NOW CORRECTLY INJECTED FROM ACTIVE PROPERTY DICTIONARY BOUNDS */}
        <InvitationCard
          viewShotRef={viewShotRef}
          guestName={guestName}
          inviterName={user?.name || "Resident"}
          guestImage={guestImage}
          accessCode={generatedCode}
          startDate={formatDate(startDate)}
          staffPosition={staffPosition}
          endDate={
            guestType === "one_time"
              ? formatDate(startDate, "one_time_end")
              : formatDate(endDate, "normal")
          }
          startTime={formatTime(fromTime)}
          endTime={formatTime(toTime)}
          inviteType={guestType}
          estate_name={activeEstate?.name || ""}
          estate_address={activeEstate?.address || ""}
          estate_state={activeEstate?.state || ""}
          estate_lga={activeEstate?.town || ""}
          locations={activeLocations || []}
          permittedDays={permittedDays}
          excludedDates={excludedDates.map((d) =>
            new Date(d).toLocaleDateString("en-GB"),
          )}
        />
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50 pb-10">
          <View
            className={`rounded-t-3xl p-5 max-h-[70%] ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                Select Staff Position
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <X size={18} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STAFF_POSITIONS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setStaffPosition(item);
                    setIsModalVisible(false);
                  }}
                  className={`p-4 border-b border-gray-100 flex-row justify-between items-center ${
                    staffPosition === item ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${staffPosition === item ? "text-indigo-600 font-bold" : isDarkMode ? "text-slate-300" : "text-gray-700"}`}
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

// --- Main Component ---
export default function GuestInvitesComponent() {
  const [currentView, setCurrentView] = useState("invite");
  const { user, isDarkMode } = useUser();

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // Set default baseline estate ID context mapping on mount
  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0]);
    }
  }, [user?.estate_ids]);

  // Resolves the currently active workspace object mapping dynamically
  const activeEstate = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return null;
    return user.estates.find((e) => e.id === selectedEstateId) || null;
  }, [selectedEstateId, user?.estates]);

  const activeLocations = useMemo(() => {
    if (!user?.locations || !selectedEstateId) return [];
    return user.locations[selectedEstateId] || [];
  }, [selectedEstateId, user?.locations]);

  const tabData = [
    { key: "invite", label: "Invite Guest" },
    { key: "track", label: "Track Guest" },
  ];
  

  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;

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
    <View
      className={`flex-1 p-4 ${isDarkMode ? "bg-slate-950" : "bg-gray-50"}`}
    >
      {/* --- Custom Tab Bar --- */}
      <View className="flex-row mb-6 justify-center">
        {tabData.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setCurrentView(tab.key)}
            className={`py-2 px-6 rounded-lg ${
              currentView === tab.key
                ? isDarkMode
                  ? "border-b-4 border-gm-gold"
                  : "border-b-4 border-indigo-600"
                : "border-b-4 border-transparent"
            }`}
          >
            <Text
              className={`text-lg font-bold ${currentView === tab.key ? (isDarkMode ? "text-gm-gold" : "text-indigo-800") : "text-gray-500"}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- Content Area --- */}
      {currentView === "invite" ? (
        <InviteGuestForm
          selectedEstateId={selectedEstateId}
          setEstatePickerVisible={setEstatePickerVisible}
          activeEstate={activeEstate}
          activeLocations={activeLocations}
        />
      ) : (
        /* Flow the selected workspace down to TrackGuestView natively */
        <TrackGuestView
          estate_id={selectedEstateId ?? ""}
          onInvitePress={() => setCurrentView("invite")}
        />
      )}

      {/* Slide-Up Estate Workspace Context Picker Sheet */}
      <Modal
        visible={estatePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-center bg-black/50 px-4">
          <View
            className={`${isDarkMode ? "bg-slate-900" : "bg-white"} p-6 max-h-[65%]`}
          >
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Select Active Estate
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
                    color={selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"}
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
    </View>
  );
}
