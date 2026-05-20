import {
  getEventDateLabel,
  getResidentDashboardStats,
} from "@/app/services/api";
import { DashboardStats } from "@/app/services/interfaces";
import { router } from "expo-router";
import {
  Bell,
  Calendar,
  ChevronRight,
  Heart,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  MapPin,
  ChevronDown,
} from "lucide-react-native";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserContext } from "../../UserContext";

const StatCard = ({
  title,
  value,
  icon: Icon,
  colorClass,
  isDarkMode,
}: any) => (
  <View
    className={`flex-1 p-4 ${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-gray-100"} rounded-2xl shadow-sm border `}
  >
    <View className="flex-row items-center justify-between mb-2">
      <View
        className={`p-2 rounded-lg ${isDarkMode ? "bg-gm-gold" : colorClass.replace("text-", "bg-") / 10}`}
      >
        <Icon size={18} className={colorClass} />
      </View>
    </View>
    <Text
      className={`text-2xl font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
    >
      {value ?? 0}
    </Text>
    <Text className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
      {title}
    </Text>
  </View>
);

export default function Dashboard() {
  const { user, setUser, isDarkMode, theme } = useContext(UserContext);
  const [showBanner, setShowBanner] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Multi-estate context management
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // 1. Automatically pre-select first estate from matrix context mapping on mount
  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0]);
    }
  }, [user?.estate_ids]);

  // 2. Resolve active workspace object parameters matching active identifier context
  const activeEstate = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return null;
    return user.estates.find((e) => e.id === selectedEstateId) || null;
  }, [selectedEstateId, user?.estates]);

  useEffect(() => {
    const welcomeShown = () => {
      if (user?.showWelcome) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    };
    welcomeShown();
  }, [user]);

  const fetchStats = async () => {
    if (!selectedEstateId) return;

    const result = await getResidentDashboardStats(selectedEstateId);

    if (result.success && result.data) {
      setStats(result.data);
    } else {
      setErrorMessage(result.message || "Could not sync dashboard data.");
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };

    if (selectedEstateId) {
      initializeDashboard();
    }
  }, [selectedEstateId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [selectedEstateId]);

  const handleDismissWelcome = () => {
    setShowBanner(false);
    if (user) {
      setUser({ ...user, showWelcome: false });
    }
  };

  const hasEvents = stats?.events && stats.events.length > 0;
  const mainEvent = hasEvents ? stats.events[0] : null;
  const extraEventsCount = hasEvents ? stats.events.length - 1 : 0;
  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;

  if (hasNoEstates) {
    return (
      <View
        className={`${isDarkMode ? "bg-gm-navy/20" : "bg-gray-50"} flex-1 justify-center items-center p-6`}
      >
        <View
          className={`${isDarkMode ? "bg-gm-navy" : "bg-white"} p-8 rounded-3xl shadow-sm items-center border ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}
        >
          <ShieldCheck size={60} color="#4f46e5" />
          <Text
            className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gm-navy"} mt-4 text-center`}
          >
            Access Restricted
          </Text>
          <Text
            className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} mt-2 text-center px-4 max-w-[280px]`}
          >
            You are currently not attached to any active estates on GateMan.
          </Text>

          <TouchableOpacity
            className={`${isDarkMode ? "bg-gm-charcoal" : "bg-gm-navy"} py-4 px-10 rounded-2xl shadow-md mt-6`}
            onPress={() => router.push("/JoinRequest" as any)}
          >
            <Text className="text-white font-bold text-lg">Join an Estate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading)
  return <ActivityIndicator className={`flex-1 ${isDarkMode? 'bg-slate-950':''}`} color={theme.accent} />;

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-gray-50 "}`}
    >
      <Modal
        animationType="fade"
        transparent={true}
        visible={showBanner}
        onRequestClose={handleDismissWelcome}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-sky-50 rounded-3xl p-6 shadow-2xl border border-sky-100 w-full">
            <View className="items-center mb-4">
              <View className="bg-sky-500 p-3 rounded-full mb-4">
                <Bell size={30} color="white" />
              </View>
              <Text className="text-gray-900 font-black text-2xl text-center mb-2">
                Welcome to {activeEstate?.name || "the Estate"}! 🎉
              </Text>
              <Text className="text-gray-600 text-center leading-5 px-2">
                Your join request has been approved. You can now manage your
                payments, access estate services, and stay updated.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleDismissWelcome}
              className="bg-indigo-600 py-4 rounded-xl shadow-md shadow-indigo-300 active:bg-indigo-700"
            >
              <Text className="text-white text-center font-bold text-lg">
                Get Started
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1 px-5 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4f46e5"]}
            tintColor="#4f46e5"
          />
        }
      >
        {/* --- 1. Header & Multi-Estate Selection Trigger --- */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1 mr-2">
            <Text
              className={`${isDarkMode ? "text-gray-400" : "text-gray-400"} font-roboto-regular`}
            >
              Welcome back,
            </Text>
            <Text
              className={`text-2xl font-montserrat-extrabold d ${isDarkMode? "text-gray-200":"text-gm-navy"}`}
              numberOfLines={1}
            >
              {user.name ? user.name.split(" ")[0] : "Resident"}
            </Text>
          </View>

          {/* 📍 CONDITION: Only renders button interface layer if user is tied to > 1 estate asset */}
          {user?.estate_ids && user.estate_ids.length > 1 && (
            <TouchableOpacity
              onPress={() => setEstatePickerVisible(true)}
              className={`flex-row items-center p-2.5 px-4 rounded-full border shadow-sm ${
                isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <MapPin size={14} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
              <Text
                className={`ml-1.5 text-xs font-black uppercase tracking-wider ${
                  isDarkMode ? "text-gm-gold" : "text-gm-navy"
                }`}
                numberOfLines={1}
              >
                {activeEstate?.name || "Switch Estate"}
              </Text>
              <ChevronDown size={14} color={isDarkMode ? "#D4AF37" : "#94a3b8"} className="ml-1" />
            </TouchableOpacity>
          )}
        </View>

        {/* --- 2. Quick Guest Stats (The "Expected" Section) --- */}
        <View className="mb-6">
          <View className="flex-row justify-between items-end mb-4">
            <Text className={`text-lg font-oswald-semibold ${isDarkMode? "text-gray-300":"text-gm-navy"}`}>
              Today&apos;s Guests
            </Text>
            <TouchableOpacity onPress={() => router.push("/guests")}>
              <Text className="text-indigo-600 font-roboto-regular text-xs">
                View All
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <View className="w-[48%]">
              <StatCard
                title="Expected"
                value={stats?.invitations.total_expected}
                icon={UserPlus}
                colorClass="text-indigo-600"
                isDarkMode={isDarkMode}
              />
            </View>
            <View className="w-[48%]">
              <StatCard
                title="Arrived"
                value={stats?.invitations.checked_in}
                icon={UserCheck}
                colorClass="text-emerald-600"
                isDarkMode={isDarkMode}
              />
            </View>
            <View className="w-[48%]">
              <StatCard
                title="Departed"
                value={stats?.invitations.checked_out}
                icon={UserMinus}
                colorClass="text-amber-500"
                isDarkMode={isDarkMode}
              />
            </View>
            <View className="w-[48%]">
              <StatCard
                title="Overstayed"
                value={stats?.invitations.overstayed}
                icon={UserX}
                colorClass="text-amber-500"
                isDarkMode={isDarkMode}
              />
            </View>
          </View>
        </View>

        {/* --- 4. Community Engagement (Likes & Comments) --- */}
        <View
          className={`mb-6 p-5 rounded-3xl border shadow-sm ${isDarkMode ? "border-gm-gold bg-gm-navy" : "bg-white border-gray-100"}`}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className={`text-lg font-oswald-semibold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
            >
              Community Buzz
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-row items-center">
                <Heart size={16} color="#ef4444" fill="#ef4444" />
                <Text
                  className={`ml-1 font-roboto-regular ${isDarkMode ? "text-white" : "text-gm-navy"}`}
                >
                  {stats?.feed?.likes_on_my_posts || 0}
                </Text>
              </View>
              <View className="flex-row items-center">
                <MessageSquare size={16} color="#4f46e5" />
                <Text
                  className={`ml-1 font-roboto-regular ${isDarkMode ? "text-white" : "text-gm-navy"}`}
                >
                  {stats?.feed?.comments_on_my_posts || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Dynamic Unread Posts Banner */}
          <TouchableOpacity
            onPress={() => router.push("/community" as any)}
            className={`flex-row items-center justify-between ${
              isDarkMode
                ? "bg-gm-charcoal/50 border border-gray-800"
                : "bg-indigo-50/60"
            } p-3 rounded-xl`}
          >
            <View className="flex-1">
              <Text
                className={`${isDarkMode ? "text-gm-gold" : "text-gm-navy"} font-oswald-semibold text-xs`}
              >
                {stats?.feed?.unread_posts && stats.feed.unread_posts > 0
                  ? `${stats.feed.unread_posts} New Update${stats.feed.unread_posts > 1 ? "s" : ""}`
                  : "Community Feed"}
              </Text>
              <Text
                className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} font-roboto-regular text-[10px] mt-0.5`}
              >
                {stats?.feed?.unread_posts && stats.feed.unread_posts > 0
                  ? "Tap to view unread posts from management and residents"
                  : "Catch up on historical estate posts and notices"}
              </Text>
            </View>
            <ChevronRight
              size={16}
              color={isDarkMode ? "#E2E8F0" : "#4f46e5"}
            />
          </TouchableOpacity>
        </View>

        {/* --- 5. Upcoming Events --- */}
        <View className="mb-10">
          <Text className={`text-lg font-oswald-semibold ${isDarkMode? "text-gray-300":"text-gm-navy"} mb-4`}>
            Upcoming Events
          </Text>
          {mainEvent ? (
            <TouchableOpacity
              onPress={() => router.push("/AllEvents" as any)}
              className={`p-4 rounded-2xl border flex-row items-center justify-between ${isDarkMode ? "bg-gm-charcoal border-emerald-900" : "bg-emerald-50 border-emerald-100"}`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className={`${isDarkMode ? "bg-gm-charcoal" : "bg-emerald-500"} p-3 rounded-xl mr-4`}
                >
                  <Calendar
                    size={24}
                    color={isDarkMode ? "#6EE7B7" : "white"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-oswald-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-900"}`}
                    numberOfLines={1}
                  >
                    {mainEvent.title}
                  </Text>
                  <Text
                    className={`${isDarkMode ? "text-emerald-400" : "text-emerald-700"} text-xs font-roboto-regular`}
                  >
                    {getEventDateLabel(mainEvent.start_date)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                {extraEventsCount > 0 && (
                  <Text
                    className={`text-xs font-roboto-medium mr-1 ${isDarkMode ? "text-emerald-300" : "text-emerald-800"}`}
                  >
                    {extraEventsCount} more event
                    {extraEventsCount > 1 ? "s" : ""}
                  </Text>
                )}
                <ChevronRight
                  size={16}
                  color={isDarkMode ? "#6EE7B7" : "#065f46"}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View
              className={`p-6 rounded-2xl border items-center justify-center ${isDarkMode ? "bg-gm-navy border-gray-800" : "bg-white border-gray-100"}`}
            >
              <Text
                className={`font-roboto-regular text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                No upcoming events scheduled
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Slide-Up Property Sheets Modal Selection Area */}
      <Modal visible={estatePickerVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className={`${isDarkMode ? "bg-slate-900" : "bg-white"} rounded-t-[2.5rem] p-6 max-h-[60%]`}>
            <View className="w-12 h-1 bg-slate-300 rounded-full self-center mb-6 mx-auto" />
            <Text className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Select Active Estate Dashboard
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
                      : isDarkMode ? "border-slate-800 bg-slate-800/40" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <MapPin size={20} color={selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"} />
                  <View className="ml-3 flex-1">
                    <Text className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}>
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
    </SafeAreaView>
  );
}