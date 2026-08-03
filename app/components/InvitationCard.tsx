import React from "react";
import { Image, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";

interface LocationPair {
  block: string;
  unit: string | string[];
}

interface CardProps {
  viewShotRef: any;
  guestName: string;
  guestImage: string | null;
  inviterName: string;
  accessCode: string;
  inviteType: string;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  estate_name: string;
  estate_address: string;
  estate_state: string;
  estate_lga: string;
  locations: LocationPair[];
  staffPosition?: string;
  permittedDays?: number[];
  excludedDates?: string[];
}

export const InvitationCard = ({
  viewShotRef,
  guestName,
  guestImage,
  inviterName,
  accessCode,
  inviteType,
  startDate,
  endDate,
  startTime,
  endTime,
  estate_name,
  estate_address,
  estate_state,
  estate_lga,
  locations = [],
  staffPosition,
  permittedDays,
  excludedDates,
}: CardProps) => {
  const isStaff = inviteType === "staff_entry";

  // Check if a real, valid expiration date text is provided
  const hasValidEndDate =
    endDate &&
    endDate.trim() !== "" &&
    endDate.trim() !== null &&
    !endDate.toLowerCase().includes("no expiration");

  // Determine the top label dynamically
  const validityLabel = hasValidEndDate
    ? "Validity Period"
    : isStaff
      ? "Activation Date"
      : "Validity Period";

  const displayDateRange = () => {
    if (isStaff && !hasValidEndDate) {
      return `${startDate} (Perpetual)`;
    }
    return `${startDate} - ${endDate}`;
  };

  

  return (
    /* We keep it contained for the capture layout */
    <View
      className="my-4 items-center"
      style={{ position: "absolute", left: -1000, top: -1000 }}
    >
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View
          className="bg-white p-8 rounded-[50px] border-[6px] border-[#D4AF37] relative overflow-hidden"
          style={{ width: 400, minHeight: 820 }}
        >
          {/* 1. TOP HEADER & APP BRAND ICON */}
          <View className="w-full flex-row justify-between items-center mt-4 mb-4">
            <View className="bg-[#0A1F44] px-4 py-1.5 rounded-full">
              <Text className="text-white text-xs font-black uppercase tracking-wider">
                {inviteType?.replace("_", " ")} Pass
              </Text>
            </View>

            <Image
              source={require("../../assets/images/splash-icon.png")}
              style={{
                width: 45,
                height: 45,
              }}
              resizeMode="contain"
            />
          </View>

          {/* 2. VISITOR'S PICTURE SPOT */}
          <View className="w-full flex-row justify-center items-center mb-4">
            <View className="bg-white p-2 rounded-[35px] border-2 border-[#D4AF37] shadow-xl overflow-hidden">
              {guestImage ? (
                <Image
                  source={{ uri: guestImage }}
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: 28,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{ width: 130, height: 130 }}
                  className="bg-slate-100 rounded-[28px] items-center justify-center"
                >
                  <Text className="text-slate-400 font-bold text-center text-xs px-2">
                    No Photo Provided
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 3. INVITATION HEADER & ESTATE CONTEXT LAYER */}
          <View className="items-center mb-6">
            <Text className="text-[#1C1C1E] text-2xl font-black text-center leading-tight mb-2">
              {guestName || "Guest"}
            </Text>

            {/* 🛠️ FIXED: Lifted View out of Text nesting container to prevent core layout crashes */}
            {isStaff && staffPosition && (
              <View className="bg-amber-100 border border-amber-200 px-4 py-1 rounded-full mb-3 mt-1">
                <Text className="text-amber-900 text-xs font-black uppercase tracking-wider">
                  🛠️ {staffPosition}
                </Text>
              </View>
            )}

            <Text className="text-base text-slate-500 font-medium text-center">
              {isStaff ? "is a staff of " : "has been invited by "}
              <Text className="text-[#0A1F44] text-2xl font-black">
                {inviterName || "Resident"}
              </Text>
            </Text>

            {locations && locations.length > 0 && (
              <View className="flex-row flex-wrap justify-center gap-2 mt-4 px-4 w-full">
                {locations.map((loc, idx) => {
                  const unitsString = Array.isArray(loc.unit)
                    ? loc.unit.join(", ")
                    : typeof loc.unit === "string"
                      ? loc.unit
                      : "";

                  return (
                    <View
                      key={`card-loc-${idx}`}
                      className="bg-indigo-50/90 border border-indigo-100 px-3 py-1.5 rounded-xl flex-row items-center"
                    >
                      <Text className="text-indigo-950 font-black text-xs">
                        Blk {loc.block}{" "}
                        <Text className="text-slate-300 font-normal">|</Text>{" "}
                        Unit(s): {unitsString}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Estate Branding Context Line */}
            <Text className="text-[#0A1F44] text-lg font-bold text-center mt-3">
              🏠 {estate_name || "Premium Estate"}
            </Text>

            {/* Estate Address Context Line */}
            <Text className="text-slate-400 text-md font-montserrat-bold text-center mt-0.5 px-6">
              {estate_address || "Estate Location Address"}
            </Text>
            <Text className="text-slate-400 text-xs font-montserrat-bold text-center mt-0.5 px-6">
              {estate_lga && estate_state
                ? `${estate_lga}, ${estate_state}`
                : "Isolo, Lagos"}
            </Text>
          </View>

          {/* 4. PASS VALIDITY SCHEDULE WINDOW */}
          <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 w-full flex-row justify-around">
            <View className="items-center flex-1 px-1">
              <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider text-center">
                {validityLabel}
              </Text>
              <Text className="text-[#0A1F44] font-black text-xs mt-1 text-center">
                {displayDateRange()}
              </Text>
            </View>
            <View className="w-[1px] bg-slate-200 h-full" />
            <View className="items-center flex-1 px-1">
              <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider text-center">
                Access Hours
              </Text>
              <Text className="text-[#0A1F44] font-black text-xs mt-1 text-center">
                {startTime} - {endTime}
              </Text>
            </View>
          </View>

          {/* 5. QR CODE SECTION */}
          <View className="items-center justify-center mb-6">
            <Text className="text-slate-500 font-bold text-center mb-4 px-4 text-xs">
              Please show this QR code or OTP to the Gate Man for entry.
            </Text>
            <View className="p-4 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm">
              <QRCode
                value={accessCode || "000000"}
                size={160}
                color="#1C1C1E"
                backgroundColor="white"
              />
            </View>
            <Text className="text-slate-300 font-black mt-3 tracking-[10px] text-xs">
              —— OR ——
            </Text>
          </View>

          {/* 6. OTP / ACCESS CODE BADGE */}
          <View className="items-center mb-8">
            <View className="bg-[#0A1F44] px-10 py-3 rounded-2xl border-b-4 border-[#D4AF37] items-center">
              <Text className="text-[#D4AF37] text-4xl font-black tracking-[8px]">
                {accessCode}
              </Text>
              <Text className="text-[#D4AF37] text-[9px] font-bold uppercase tracking-[3px] mt-1">
                GateMan OTP
              </Text>
            </View>
          </View>
          {/* 4b. DYNAMIC PERMISSIONS & EXCLUSIONS LAYER */}
          {isStaff && permittedDays && permittedDays.length > 0 && (
            <View className="w-full px-2 mb-4">
              <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                🗓️ Approved Workdays
              </Text>
              <View className="flex-row flex-wrap gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (dayName, index) => {
                    const isAllowed = permittedDays.includes(index);
                    return (
                      <View
                        key={`workday-${index}`}
                        className={`px-2.5 py-1 rounded-md border ${
                          isAllowed
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-slate-50 border-slate-100 opacity-40"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isAllowed
                              ? "text-emerald-700"
                              : "text-slate-400 line-through"
                          }`}
                        >
                          {dayName}
                        </Text>
                      </View>
                    );
                  },
                )}
              </View>
            </View>
          )}

          {inviteType === "multi_entry" &&
            excludedDates &&
            excludedDates.length > 0 && (
              <View className="w-full px-2 mb-4">
                <Text className="text-rose-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  ⚠️ Access Denied On These Dates
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {excludedDates.map((dateStr, idx) => (
                    <View
                      key={`excluded-${idx}`}
                      className="bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md"
                    >
                      <Text className="text-rose-700 font-bold text-[11px]">
                        {dateStr}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* 7. FOOTER SECTION */}
          <View className="items-center border-t border-slate-100 pt-6">
            <Text className="text-[#0A1F44] text-lg font-black uppercase tracking-[4px]">
              GATE MAN SECURE PASS
            </Text>
            <Text className="text-[#D4AF37] font-bold text-xs mt-1">
              Your Security, Our Mission
            </Text>
          </View>

          {/* Background Decorative Arches */}
          <View className="absolute bottom-0 left-0 right-0 h-20 bg-[#D4AF37]/10 -z-10" />
        </View>
      </ViewShot>
    </View>
  );
};
