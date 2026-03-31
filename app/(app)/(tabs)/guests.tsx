import { InvitationCard } from "@/app/components/InvitationCard";
import TrackGuestView from "@/app/components/TrackGuest";
import { getCloudinaryUrl, invitationApi } from "@/app/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { Calendar, Clock, ImageIcon, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";

// --- 1. Invite Guest View Component ---
const InviteGuestForm = () => {
  const [guestType, setGuestType] = useState("one_time");
  const [guestName, setGuestName] = useState("");
  const viewShotRef = useRef<any>(null);
  const [generatedCode, setGeneratedCode] = useState("000000");

  // Real Date/Time States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 7)),
  ); // Default 1 week
  const [excludedDates, setExcludedDates] = useState<string[]>([]); // Array of ISO strings
  const [fromTime, setFromTime] = useState(new Date());
  const [toTime, setToTime] = useState(
    new Date(new Date().setHours(new Date().getHours() + 2)),
  );

  // UI Visibility States
  const [showPicker, setShowPicker] = useState({ type: "", visible: false });
  const [guestImage, setGuestImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      // Logic: Prevent end date from being before start date
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
      const rangeEnd = new Date(endDate.setHours(0, 0, 0, 0));
      const selected = new Date(currentDate.setHours(0, 0, 0, 0));

      if (selected < rangeStart || selected > rangeEnd) {
        Alert.alert(
          "Invalid Date",
          "Excluded dates must be between the Start and End dates of the invitation.",
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  const handleGenerateCode = async () => {
    if (!guestName.trim()) return Alert.alert("Error", "Enter guest name");

    try {
      setIsUploading(true);

      // 1. Upload Photo if it exists
      let uploadedUrl = null;
      if (guestImage) {
        // console.log("Uploading image to Cloudinary...");
        const url = await getCloudinaryUrl(guestImage, "image");
        // console.log("Cloudinary URL:", url);
        if (url) uploadedUrl = url;
      }

      // 2. Prepare & Send Payload
      const payload = {
        guest_name: guestName,
        guest_image_url: uploadedUrl,
        invite_type: guestType,
        start_date: startDate.toISOString().split("T")[0],
        end_date:
          guestType === "one_time"
            ? startDate.toISOString().split("T")[0]
            : endDate.toISOString().split("T")[0],
        start_time: formatTime(fromTime),
        end_time: formatTime(toTime),
        excluded_dates: guestType === "multi_entry" ? excludedDates : [],
      };

      const response = await invitationApi.createInvitation(payload);

      if (response && response.access_code) {
        setGeneratedCode(response.access_code);

        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!viewShotRef.current) {
          return Alert.alert(
            "Debug Error",
            "viewShotRef is null. The component isn't mounted.",
          );
        }
        // 5. CAPTURE & SHARE
        const imageUri = await captureRef(viewShotRef, {
          format: "png",
          quality: 1.0,
          result: "tmpfile",
        });

        if (imageUri) {
          const isAvailable = await Sharing.isAvailableAsync();

          const exclusionMsg =
            excludedDates.length > 0
              ? `\n\n⚠️ NOTE: Access is DENIED on these dates: \n• ${excludedDates.join("\n• ")}`
              : "";

          const finalMessage = `Hello ${guestName}, here is your access pass for GateMan estate.${exclusionMsg}`;

          if (isAvailable) {
            await Sharing.shareAsync(imageUri, {
              mimeType: "image/png",
              dialogTitle: "Share Guest Access Pass",
              UTI: "public.png", // For iOS support
            });

            if (excludedDates.length > 0) {
              await Share.share({
                message: finalMessage,
              });
            }
          } else {
            // Fallback to standard share if expo-sharing isn't available
            await Share.share({ title: "Access Pass", url: imageUri });
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Failed", error.message);
    } finally {
      setIsUploading(false);
      setGuestName("");
      setGuestImage(null);
      setGeneratedCode("000000");
      setExcludedDates([]);
    }
  };

  return (
    <>
      {/* Guest Type Selector */}
      <View className="flex-row gap-4 mb-6">
        {["one_time", "multi_entry"].map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setGuestType(type)}
            className={`flex-row items-center p-2 rounded-full ${guestType === type ? "bg-indigo-100" : ""}`}
          >
            <View
              className={`w-4 h-4 rounded-full border-2 mr-2 ${guestType === type ? "border-indigo-600 bg-indigo-600" : "border-gray-400"}`}
            />
            <Text
              className={`font-semibold capitalize ${guestType === type ? "text-indigo-800" : "text-gray-600"}`}
            >
              {type.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView className="pb-3 mt-2 flex gap-5">
        <View className="flex gap-5">
          {/* Guest Name */}
          <View>
            <Text className="text-gray-600 font-medium mb-1">Guest Name:</Text>
            <TextInput
              className="bg-white p-4 rounded-lg border border-gray-300 text-gray-900"
              placeholder="Enter guest name"
              value={guestName}
              onChangeText={setGuestName}
            />
          </View>

          {/* Arrival Date Selector */}
          <View>
            <Text className="text-gray-600 font-medium mb-1">
              {guestType === "one_time" ? "Arrival Date:" : "Start Date:"}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setShowPicker({ type: "startDate", visible: true })
              }
              className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300"
            >
              <View className="flex-row items-center">
                <Calendar size={20} color="#4f46e5" className="mr-2" />
                <Text className="text-gray-900 font-medium">
                  {formatDate(startDate)}
                </Text>
              </View>
              <Text className="text-gray-400 text-xs">Tap to change</Text>
            </TouchableOpacity>
          </View>
          {/* --- Excluded Dates Section (Multi-Entry Only) --- */}
          {guestType === "multi_entry" && (
            <View className="mt-4 border-t border-gray-200 pt-4">
              <View>
                <Text className="text-gray-600 font-medium mb-1">
                  End Date:
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowPicker({ type: "endDate", visible: true })
                  }
                  className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300"
                >
                  <View className="flex-row items-center">
                    <Calendar size={20} color="#4f46e5" className="mr-2" />
                    <Text className="text-gray-900 font-medium">
                      {formatDate(endDate)}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-xs">Tap to change</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between items-center my-3">
                <Text className="text-gray-600 font-bold">
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

              {/* Fixed height scrollable list */}
              <View
                style={{ height: 100 }}
                className="bg-gray-100 rounded-xl p-2"
              >
                {excludedDates.length > 0 ? (
                  <ScrollView nestedScrollEnabled={true}>
                    <View className="flex-row flex-wrap gap-2">
                      {excludedDates.map((dateStr) => (
                        <View
                          key={dateStr}
                          className="bg-white border border-gray-300 pl-3 pr-1 py-1 rounded-full flex-row items-center"
                        >
                          <Text className="text-gray-700 text-xs font-medium mr-2">
                            {dateStr.split("-").reverse().join("/")}{" "}
                            {/* DD/MM/YYYY */}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setExcludedDates((prev) =>
                                prev.filter((d) => d !== dateStr),
                              )
                            }
                            className="bg-red-50 p-1 rounded-full"
                          >
                            <X size={14} color="#ef4444" />{" "}
                            {/* Or a Trash icon if you prefer */}
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
            </View>
          )}

          {/* Time Range Selectors */}
          <View className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text className="text-gray-600 font-medium mb-1">From:</Text>
              <TouchableOpacity
                onPress={() => setShowPicker({ type: "from", visible: true })}
                className="flex-row items-center bg-white p-4 rounded-lg border border-gray-300"
              >
                <Clock size={18} color="#4f46e5" className="mr-2" />
                <Text className="text-gray-900 font-medium">
                  {formatTime(fromTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-gray-600 font-medium mb-1">To:</Text>
              <TouchableOpacity
                onPress={() => setShowPicker({ type: "to", visible: true })}
                className="flex-row items-center bg-white p-4 rounded-lg border border-gray-300"
              >
                <Clock size={18} color="#4f46e5" className="mr-2" />
                <Text className="text-gray-900 font-medium">
                  {formatTime(toTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Render Native Picker */}
          {showPicker.visible && (
            <DateTimePicker
              value={
                showPicker.type === "startDate" || showPicker.type === "date"
                  ? startDate
                  : showPicker.type === "endDate"
                    ? endDate
                    : showPicker.type === "exclude"
                      ? new Date() // Default to today for the exclusion picker
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

          <View className="">
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
                  className="flex-row items-center bg-gray-100 self-start px-4 py-3 rounded-xl border border-dashed border-gray-300"
                >
                  <ImageIcon size={20} color="#4f46e5" />
                  <Text className="text-indigo-600 ml-2 font-bold">
                    Add a Photo
                  </Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-xs italic mt-2 px-1 text-center">
                  * Invited guests without a photo might be required to bring
                  along a valid ID for verification at the gate.
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            className={`mt-6 py-4 rounded-xl shadow-lg ${isUploading ? "bg-indigo-400" : "bg-indigo-600"}`}
            onPress={handleGenerateCode}
            disabled={isUploading}
          >
            <Text className="text-white text-lg font-bold text-center">
              {isUploading ? "Processing..." : "Generate Access Code"}
            </Text>
          </TouchableOpacity>
        </View>
        <InvitationCard
          viewShotRef={viewShotRef}
          guestName={guestName}
          guestImage={guestImage}
          accessCode={generatedCode}
          startDate={formatDate(startDate)}
          endDate={formatDate(endDate)}
          startTime={formatTime(fromTime)}
          endTime={formatTime(toTime)}
          inviteType={guestType}
        />
      </ScrollView>
    </>
  );
};

// --- Main Component ---
export default function GuestInvitesComponent() {
  const [currentView, setCurrentView] = useState("invite");
  const tabData = [
    { key: "invite", label: "Invite Guest" },
    { key: "track", label: "Track Guest" },
  ];

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* --- Custom Tab Bar (Invite Guest / Track Guest) --- */}
      <View className="flex-row mb-6 justify-center">
        {tabData.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setCurrentView(tab.key)}
            className={`py-2 px-6 rounded-lg ${
              currentView === tab.key
                ? "border-b-4 border-indigo-600"
                : "border-b-4 border-transparent"
            }`}
          >
            <Text
              className={`text-lg font-bold ${
                currentView === tab.key ? "text-indigo-800" : "text-gray-500"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- Content Area --- */}
      {currentView === "invite" ? (
        <InviteGuestForm />
      ) : (
        <TrackGuestView onInvitePress={() => setCurrentView("invite")} />
      )}
    </View>
  );
}
