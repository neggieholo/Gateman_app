
import React, { useContext } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { UserContext } from "./UserContext";
import TempNotificationCard from "./components/TempNotificationCard";

export default function NotificationsPage() {
  const { user, tempnotification, triggerRefresh } = useContext(UserContext);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
        {user?.isTemp && (
          <TouchableOpacity onPress={triggerRefresh}>
            <Text className="text-blue-600 font-semibold">Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {user?.isTemp ? (
        <View>
          {tempnotification ? (
            <TempNotificationCard data={tempnotification} />
          ) : (
            <View className="items-center justify-center mt-20 px-10">
              <Text className="text-gray-400 text-center">
                No active requests found. Use the &quot;Join Estate&quot; option to get started.
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Regular Tenant Notifications go here */
        <View className="p-10 items-center">
          <Text className="text-gray-400 text-center">Your notification tray is empty.</Text>
        </View>
      )}
    </ScrollView>
  );
}