import { Camera, Clock } from "lucide-react-native";
import React from "react";
import { Image, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";

interface CardProps {
  viewShotRef: any;
  guestName: string;
  guestImage: string | null;
  accessCode: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  inviteType: string;
}

export const TrackInvitationCard = ({
  viewShotRef,
  guestName,
  guestImage,
  accessCode,
  startDate,
  endDate,
  startTime,
  endTime,
  inviteType,
}: CardProps) => {
  return (
    <View style={{ position: "absolute", left: -1000, top: -1000 }}>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View
          className="bg-white p-6 rounded-2xl border-4 border-indigo-600"
          style={{ width: 350 }}
        >
          <Text className="text-2xl font-black text-indigo-900 text-center mb-5 tracking-tight">
            GATE MAN ACCESS PASS
          </Text>

          <View className="flex-row items-center gap-4 mb-5 border-b-2 border-dashed border-gray-200 pb-5">
            {guestImage ? (
              <Image
                source={{ uri: guestImage }}
                className="w-24 h-24 rounded-xl"
              />
            ) : (
              <View className="w-24 h-24 rounded-xl bg-gray-100 items-center justify-center border border-dashed border-gray-300">
                <Camera size={32} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs mt-1 text-center">
                  CHECK ID
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-gray-500 text-sm font-medium">
                GUEST NAME:
              </Text>
              <Text
                className="text-xl font-bold text-gray-900 capitalize"
                numberOfLines={2}
              >
                {guestName || "Guest"}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between gap-3 mb-4">
            <View className="flex-1 bg-indigo-50 p-4 rounded-xl items-center">
              <Text className="text-gray-500 text-sm font-medium">
                ACCESS CODE:
              </Text>
              <Text className="text-4xl font-black text-indigo-700 tracking-wider">
                {accessCode}
              </Text>
            </View>
            <View className="w-32 bg-gray-50 p-4 rounded-xl items-center">
              <Text className="text-gray-500 text-sm font-medium">DATE:</Text>
              <Text className="text-xl font-bold text-gray-800">
                {!endDate || startDate === endDate
                  ? startDate
                  : `${startDate.split("/")[0]}/${startDate.split("/")[1]} - ${endDate.split("/")[0]}/${endDate.split("/")[1]}`}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center gap-3 bg-gray-100 p-3 rounded-lg">
            <Clock size={20} color="#6B7280" />
            <Text className="text-gray-600 font-semibold text-lg uppercase">
              {startTime} - {endTime}
            </Text>
          </View>

          <View className="mt-6 border-t border-gray-200 pt-4">
            <Text className="text-[8px] text-indigo-600 font-bold">
              {inviteType === "multi_entry" ? "MULTI-ENTRY" : "ONE-TIME"}
            </Text>
          </View>

          <Text className="text-center text-gray-400 text-[10px] italic mt-5 leading-4">
            This is a secure access pass for the GateMan network. Please present
            this at the gate for verification.
          </Text>
        </View>
      </ViewShot>
    </View>
  );
};
