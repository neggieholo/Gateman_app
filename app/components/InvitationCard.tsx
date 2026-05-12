import React from "react";
import { View, Text, Image } from "react-native";
import ViewShot from "react-native-view-shot";
import QRCode from "react-native-qrcode-svg";
import { ShieldCheck } from "lucide-react-native";

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
}


export const InvitationCard = ({
  viewShotRef,
  inviterName,
  accessCode,
  inviteType,
}: CardProps) => {
  return (
    /* We keep it off-screen for the capture */
    <View style={{ position: "absolute", left: -1000, top: -1000 }}>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View 
          className="bg-white p-8 rounded-[50px] border-[6px] border-[#D4AF37]" 
          style={{ width: 400, minHeight: 600 }}
        >
          {/* 1. TOP SHIELD SECTION */}
          <View className="items-center -mt-14 mb-8">
            <View className="bg-[#0A1F44] p-4 rounded-3xl border-4 border-[#D4AF37] shadow-xl">
              <ShieldCheck size={48} color="#D4AF37" strokeWidth={2.5} />
            </View>
          </View>

          {/* 2. INVITATION HEADER */}
          <View className="items-center mb-10">
            <Text className="text-[#1C1C1E] text-3xl font-black text-center leading-tight">
              You have been invited{"\n"}
              <Text className="text-[#0A1F44]">by {inviterName || "Resident"}</Text>
            </Text>
            
            <Text className="text-slate-500 font-bold text-center mt-6 px-4">
              Please show this QR code or OTP to the Gate Man for entry.
            </Text>
          </View>

          {/* 3. QR CODE SECTION */}
          <View className="items-center justify-center mb-10">
            <View className="p-5 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm">
              <QRCode
                value={accessCode || "000000"}
                size={180}
                color="#1C1C1E"
                backgroundColor="white"
              />
            </View>
            <Text className="text-slate-300 font-black mt-4 tracking-[10px]">—— OR ——</Text>
          </View>

          {/* 4. OTP / ACCESS CODE BADGE */}
          <View className="items-center mb-12">
            <View className="bg-[#0A1F44] px-10 py-4 rounded-2xl border-b-4 border-[#D4AF37] items-center">
              <Text className="text-[#D4AF37] text-5xl font-black tracking-[8px]">
                {accessCode}
              </Text>
              <Text className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[3px] mt-1">
                GateMan OTP
              </Text>
            </View>
          </View>

          {/* 5. FOOTER SECTION */}
          <View className="items-center border-t border-slate-100 pt-8">
            <Text className="text-[#0A1F44] text-xl font-black uppercase tracking-[4px]">
              GATE MAN SECURE PASS
            </Text>
            <Text className="text-[#D4AF37] font-bold text-sm mt-1">
              Your Security, Our Mission
            </Text>
          </View>

          {/* Background Decorative Arches (GM Style) */}
          <View className="absolute bottom-0 left-0 right-0 h-24 bg-[#D4AF37]/10 -z-10 rounded-b-[40px]" />
        </View>
      </ViewShot>
    </View>
  );
};