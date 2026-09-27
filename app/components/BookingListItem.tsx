import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
} from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { formatDate, getBookingStatusBadge } from "../services/api";
import { BookingStatus } from "../services/interfaces";

interface BookedSlot {
  date: string;
  start_time: string;
  end_time: string;
}

interface Booking {
  id: string;
  venue_name: string;
  start_date: string;
  end_date: string;
  status: string;
  booked_dates: string | BookedSlot[];
}

// Converts DD-MM-YYYY or YYYY-MM-DD to standard Date object for reliable comparison
const parseSlotToDate = (dateStr: string, timeStr: string): Date => {
  let year = 0,
    month = 0,
    day = 0;

  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      [year, month, day] = parts.map((p) => parseInt(p, 10));
    } else {
      // DD-MM-YYYY
      [day, month, year] = parts.map((p) => parseInt(p, 10));
    }
  }

  const [hours, minutes] = (timeStr || "23:59:59")
    .split(":")
    .map((p) => parseInt(p, 10));

  return new Date(year, month - 1, day, hours, minutes);
};

// Check if an individual slot is in the past
const checkSlotExpired = (dateStr: string, endTimeStr: string): boolean => {
  const slotEndDateTime = parseSlotToDate(dateStr, endTimeStr);
  return slotEndDateTime < new Date();
};

export const BookingListItem = ({
  booking,
  isDarkMode,
  onPress,
}: {
  booking: Booking;
  isDarkMode: boolean;
  onPress: () => void;
}) => {
  // Parse booked_dates safely
  let slots: BookedSlot[] = [];
  if (typeof booking.booked_dates === "string") {
    try {
      slots = JSON.parse(booking.booked_dates);
    } catch (e) {
      slots = [];
    }
  } else if (Array.isArray(booking.booked_dates)) {
    slots = booking.booked_dates;
  }

  // Frontend calculation of active vs expired slot counts
  const expiredCount = slots.filter((slot) =>
    checkSlotExpired(slot.date, slot.end_time),
  ).length;
  const activeCount = slots.length - expiredCount;

  const badge = getBookingStatusBadge(booking.status as BookingStatus);
  const isApproved = booking.status === "APPROVED";
  const isRejected = booking.status === "REJECTED";

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`p-4 rounded-2xl mb-4 border ${
        isDarkMode
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header: Venue Name & Booking Status */}
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className={`text-base font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {booking.venue_name}
        </Text>
        <View className="px-2.5 py-1 rounded-full bg-blue-100">
          <Text className={`text-[10px] font-bold text-${badge.color} uppercase`}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Main Column: Overall Start Date and End Date */}
      <View className="flex-row items-center mb-3">
        <Calendar size={15} color={isDarkMode ? "#94a3b8" : "#64748b"} />
        <Text
          className={`text-xs ml-2 font-medium ${
            isDarkMode ? "text-slate-400" : "text-gray-600"
          }`}
        >
          {formatDate(booking.start_date)} to {formatDate(booking.end_date)}
        </Text>
      </View>

      {/* Summary Chips: Active & Expired Slot Counters */}
      <View className="flex-row items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
        <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/50">
          <CheckCircle2 size={12} color="#059669" />
          <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 ml-1.5">
            {activeCount} Active
          </Text>
        </View>

        <View className="flex-row items-center bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200/50">
          <AlertCircle size={12} color="#e11d48" />
          <Text className="text-xs font-semibold text-rose-700 dark:text-rose-400 ml-1.5">
            {expiredCount} Expired
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const BookedSlotDetailItem = ({
  slot,
  isDarkMode,
}: {
  slot: BookedSlot;
  isDarkMode: boolean;
}) => {
  const isSlotExpired = checkSlotExpired(slot.date, slot.end_time);

  return (
    <View
      className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${
        isSlotExpired
          ? isDarkMode
            ? "bg-rose-950/30 border-rose-900/40"
            : "bg-rose-50 border-rose-100"
          : isDarkMode
            ? "bg-slate-900 border-slate-800"
            : "bg-gray-50 border-gray-200/60"
      }`}
    >
      <View className="flex-row items-center">
        <Clock size={18} color={isSlotExpired ? "#e11d48" : "#4f46e5"} />
        <View className="ml-3">
          <Text
            className={`text-sm font-oswald-semibold ${
              isSlotExpired
                ? "text-rose-600 line-through"
                : isDarkMode
                  ? "text-white"
                  : "text-gm-navy"
            }`}
          >
            {slot.date}
          </Text>
          <Text
            className={`text-xs ${
              isSlotExpired
                ? "text-rose-400"
                : isDarkMode
                  ? "text-slate-400"
                  : "text-gray-500"
            }`}
          >
            {slot.start_time} - {slot.end_time}
          </Text>
        </View>
      </View>

      {/* Status Tag */}
      <View
        className={`px-3 py-1 rounded-full flex-row items-center ${
          isSlotExpired ? "bg-rose-100" : "bg-emerald-100"
        }`}
      >
        {isSlotExpired ? (
          <AlertCircle size={12} color="#e11d48" />
        ) : (
          <CheckCircle2 size={12} color="#047857" />
        )}
        <Text
          className={`text-[10px] font-bold uppercase ml-1 ${
            isSlotExpired ? "text-rose-700" : "text-emerald-700"
          }`}
        >
          {isSlotExpired ? "Expired" : "Active"}
        </Text>
      </View>
    </View>
  );
};
