import { InvitationCard } from "@/app/components/InvitationCard";
import { getCloudinaryUrl, invitationApi } from "@/app/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import {
  Calendar,
  Clock,
  ImageIcon,
  MapPin,
  Search,
  Send,
  X,
} from "lucide-react-native";
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
  const [date, setDate] = useState(new Date());
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
    setShowPicker({ type: "", visible: false });

    if (showPicker.type === "date") setDate(currentDate);
    if (showPicker.type === "from") setFromTime(currentDate);
    if (showPicker.type === "to") setToTime(currentDate);
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
        console.log("Uploading image to Cloudinary...");
        const url = await getCloudinaryUrl(guestImage, "image");
        console.log("Cloudinary URL:", url);
        if (url) uploadedUrl = url;
      }

      // 2. Prepare & Send Payload
      const payload = {
        guest_name: guestName,
        guest_image_url: uploadedUrl,
        invite_type: guestType,
        start_date: date.toISOString().split("T")[0],
        end_date: date.toISOString().split("T")[0],
        start_time: formatTime(fromTime),
        end_time: formatTime(toTime),
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

          if (isAvailable) {
            await Sharing.shareAsync(imageUri, {
              mimeType: "image/png",
              dialogTitle: "Share Guest Access Pass",
              UTI: "public.png", // For iOS support
            });
          } else {
            // Fallback to standard share if expo-sharing isn't available
            await Share.share({ title: "Access Pass", url: imageUri });
          }
        }

        // if (Platform.OS === "ios") {
        //   await Share.share({
        //     url: imageUri,
        //   });
        // } else {
        //   await Share.share({
        //     title: "GateMan Access Pass",
        //     url: imageUri,
        //   });
        // }

        // Reset
        setGuestName("");
        setGuestImage(null);
        setGeneratedCode("000000");
      }
    } catch (error: any) {
      Alert.alert("Failed", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView className="pb-3 flex gap-5">
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
          <Text className="text-gray-600 font-medium mb-1">Arrival Date:</Text>
          <TouchableOpacity
            onPress={() => setShowPicker({ type: "date", visible: true })}
            className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300"
          >
            <View className="flex-row items-center">
              <Calendar size={20} color="#4f46e5" className="mr-2" />
              <Text className="text-gray-900 font-medium">
                {formatDate(date)}
              </Text>
            </View>
            <Text className="text-gray-400 text-xs">Tap to change</Text>
          </TouchableOpacity>
        </View>

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
              showPicker.type === "date"
                ? date
                : showPicker.type === "from"
                  ? fromTime
                  : toTime
            }
            mode={showPicker.type === "date" ? "date" : "time"}
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
        date={formatDate(date)}
        startTime={formatTime(fromTime)}
        endTime={formatTime(toTime)}
      />
    </ScrollView>
  );
};

// --- 2. Track Guest View Component ---
const TrackGuestView = () => {
  return (
    <View className="flex-1 items-center justify-center p-6">
      {/* Search Bar (Mocked) */}
      <View className="absolute top-0 right-0 p-4">
        <TouchableOpacity className="bg-white p-3 rounded-full border border-gray-200 shadow-sm">
          <Search size={22} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Empty State Content */}
      <View className="items-center mt-[-100]">
        {/* Icon Placeholder */}
        <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center mb-4 border border-gray-200">
          <MapPin size={36} color="#4B5563" />
        </View>

        <Text className="text-lg font-semibold text-gray-700 mb-6">
          Nothing to show here
        </Text>

        <TouchableOpacity
          onPress={() => {
            /* Logic to switch back to Invite View */
          }}
          className="bg-indigo-600 py-3 px-6 rounded-xl shadow-md"
        >
          <Text className="text-white text-base font-bold text-center">
            Invite a guest
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Main Component ---
export default function GuestInvitesComponent() {
  // State to toggle between 'Invite Guest' and 'Track Guest'
  const [currentView, setCurrentView] = useState("invite"); // 'invite' or 'track'

  // Mock data for the tab bar and current view state
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
      {currentView === "invite" ? <InviteGuestForm /> : <TrackGuestView />}

      {/* --- Floating Action Button (Moved the FAB from TrackGuestView here for consistency) --- */}
      {currentView === "track" && (
        <TouchableOpacity
          onPress={() => setCurrentView("invite")}
          className="absolute bottom-6 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-2xl shadow-indigo-500/50 z-10"
        >
          <Send size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
