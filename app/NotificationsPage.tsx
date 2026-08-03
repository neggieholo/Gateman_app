import React, { useContext, useEffect } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { UserContext } from "./UserContext";
import NotificationCard from "./components/NotificationCard";
import SwipeDismiss from "./components/SwipeableNotification";
import TempNotificationCard from "./components/TempNotificationCard";
import {
  deleteNotificationApi,
  dismissNotification,
  markAllAsReadApi,
  markNotificationAsRead,
} from "./services/api";

export default function NotificationsPage() {
  const {
    user,
    isDarkMode,
    tempnotification,
    setTempnotification,
    notifications,
    setNotifications,
    triggerRefresh,
    setBadgeCount,
    loadingNotifications,
  } = useContext(UserContext);

  useEffect(() => {
    if (user?.isTemp) {
      triggerRefresh();
    }
  }, []);

  useEffect(() => {
    const handleRead = async () => {
      if (user?.isTemp && tempnotification) {
        setBadgeCount(0);
        await markNotificationAsRead();
      } else if (!user?.isTemp && notifications.length > 0) {
        await markAllAsReadApi();
        setBadgeCount(0);
      }
    };
    handleRead();
  }, [tempnotification, notifications.length]);

  const handleDelete = async (id?: string) => {
    if (user?.isTemp) {
      setTempnotification(null);
      await dismissNotification();
    } else if (id) {
      setNotifications(notifications.filter((n) => n.id !== id));
      await deleteNotificationApi(id);
    }
  };

  return (
    <View className={`flex flex-1 ${isDarkMode ? "bg-slate-950" : "bg-gray-50"}`}>
      {/* Header Bar */}
      <View className="p-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={triggerRefresh}>
          <Text className={`font-black ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className={`${isDarkMode ? "bg-slate-950" : "bg-gray-50"}`}
        refreshControl={
          <RefreshControl
            refreshing={loadingNotifications}
            tintColor={isDarkMode ? "#D4AF37" : "#4f46e5"}
            onRefresh={triggerRefresh}
          />
        }
      >
        {/* Render Temp Notification (Singular) */}
        {user?.isTemp && tempnotification && (
          <SwipeDismiss onDismiss={() => handleDelete()}>
            <TempNotificationCard data={tempnotification} />
          </SwipeDismiss>
        )}

        {/* Render Permanent Notifications (List) */}
        {!user?.isTemp && notifications.length > 0
          ? notifications.map((item) => (
              <SwipeDismiss
                key={item.id}
                onDismiss={() => handleDelete(item.id)}
              >
                <NotificationCard item={item} />
              </SwipeDismiss>
            ))
          : !user?.isTemp && (
              <View className="items-center mt-20 px-10">
                <Text className="text-slate-400 text-center font-medium">
                  Your notification tray is empty.
                </Text>
              </View>
            )}

        {/* Empty State for Temp Users */}
        {user?.isTemp && !tempnotification && (
          <View className="items-center mt-20 px-10">
            <Text className="text-slate-400 text-center font-medium">
              Your notification tray is empty.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}