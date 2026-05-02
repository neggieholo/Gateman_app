import {
    AlertTriangle,
    Banknote,
    Calendar,
    CalendarDays,
    Camera,
    Clock,
    FileText,
    History,
    Info,
    Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function CreateEventScreen() {
  const [isPaid, setIsPaid] = useState(false);
  const [activeTab, setActiveTab] = useState<"CREATE EVENT" | "ALL EVENTS">(
    "CREATE EVENT",
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    venue_detail: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    expectedGuests: "",
    ticketPrice: "0",
    bankName: "",
    accountNumber: "",
  });

  const handleSubmit = async () => {
    console.log("Submitting Complex Event:", { ...form, isPaid });
  };

  return (
    <View className="flex-1 bg-white pt-12">
      {/* --- Tab Switcher --- */}
      <View className="flex-row gap-3 px-5 mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab("CREATE EVENT")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "CREATE EVENT"
              ? "bg-indigo-600 border-indigo-600"
              : "bg-white border-slate-100"
          }`}
        >
          <FileText
            size={18}
            color={activeTab === "CREATE EVENT" ? "white" : "#64748b"}
          />
          <Text
            className={`ml-2 font-bold ${activeTab === "CREATE EVENT" ? "text-white" : "text-slate-500"}`}
          >
            New Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ALL EVENTS")}
          className={`flex-1 p-4 rounded-3xl border-2 flex-row items-center justify-center ${
            activeTab === "ALL EVENTS"
              ? "bg-indigo-600 border-indigo-600"
              : "bg-white border-slate-100"
          }`}
        >
          <History
            size={18}
            color={activeTab === "ALL EVENTS" ? "white" : "#64748b"}
          />
          <Text
            className={`ml-2 font-bold ${activeTab === "ALL EVENTS" ? "text-white" : "text-slate-500"}`}
          >
            All Events
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "CREATE EVENT" ? (
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* --- Administrative Instruction Notice --- */}
          <View className="bg-amber-50 border border-amber-100 p-5 rounded-[2rem] mb-6 flex-row items-start">
            <AlertTriangle size={20} color="#d97706" />
            <View className="ml-3 flex-1">
              <Text className="text-amber-900 font-black text-[10px] uppercase tracking-widest mb-1">
                Scheduling Requirement
              </Text>
              <Text className="text-amber-700 text-xs font-bold leading-relaxed">
                To ensure estate security and venue availability, please
                schedule your events at least{" "}
                <Text className="font-black text-amber-900">
                  one week (7 days)
                </Text>{" "}
                in advance for administrative approval.
              </Text>
            </View>
          </View>

          {/* Banner Upload */}
          <TouchableOpacity className="w-full h-44 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 items-center justify-center mb-6">
            <Camera size={32} color="#6366f1" />
            <Text className="text-slate-400 font-black mt-2 text-[10px] uppercase tracking-[0.2em]">
              Upload Event Banner
            </Text>
          </TouchableOpacity>

          {/* Basic Info */}
          <SectionHeader title="General Information" />
          <TextInput
            placeholder="Event Title"
            className="bg-slate-50 p-5 rounded-2xl font-bold text-slate-700 mb-3 border border-slate-100"
            onChangeText={(t) => setForm({ ...form, title: t })}
          />
          <TextInput
            placeholder="Brief Description"
            multiline
            className="bg-slate-50 p-5 rounded-2xl font-medium text-slate-700 border border-slate-100 mb-6"
            onChangeText={(t) => setForm({ ...form, description: t })}
          />

          {/* Duration Logic */}
          <SectionHeader title="Duration & Timing" />
          <View className="flex-row gap-3 mb-3">
            <DateInput
              icon={<Calendar size={18} color="#6366f1" />}
              placeholder="Start Date"
            />
            <DateInput
              icon={<Calendar size={18} color="#6366f1" />}
              placeholder="End Date"
            />
          </View>
          <View className="flex-row gap-3 mb-6">
            <DateInput
              icon={<Clock size={18} color="#6366f1" />}
              placeholder="Start Time"
            />
            <DateInput
              icon={<Clock size={18} color="#6366f1" />}
              placeholder="End Time"
            />
          </View>

          {/* Venue & Capacity */}
          <SectionHeader title="Venue & Guests" />
          <TextInput
            placeholder="Venue (e.g., Block B Rooftop / Unit 4 Garden)"
            className="bg-slate-50 p-5 rounded-2xl font-bold text-slate-700 mb-3 border border-slate-100"
            onChangeText={(t) => setForm({ ...form, venue_detail: t })}
          />
          <View className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex-row items-center mb-6">
            <Users size={18} color="#6366f1" />
            <TextInput
              placeholder="Guest Limit (0 for infinite)"
              keyboardType="numeric"
              className="ml-3 flex-1 font-bold"
            />
          </View>

          {/* Payment Logic */}
          <View className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100 mb-10">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <Banknote size={20} color="#4f46e5" />
                <Text className="ml-2 font-black text-indigo-900 text-xs uppercase tracking-widest">
                  Paid Event
                </Text>
              </View>
              <Switch
                value={isPaid}
                onValueChange={setIsPaid}
                trackColor={{ false: "#d1d5db", true: "#4f46e5" }}
              />
            </View>

            {isPaid ? (
              <View>
                <View className="flex-row items-center mb-4 bg-white/60 p-3 rounded-xl">
                  <Info size={14} color="#4f46e5" />
                  <Text className="ml-2 text-[10px] font-bold text-indigo-600 leading-tight">
                    Funds will be split: Your ticket sales go to your subaccount
                    after commission.
                  </Text>
                </View>

                <TextInput
                  placeholder="Ticket Price (₦)"
                  keyboardType="numeric"
                  className="bg-white p-4 rounded-xl font-black text-indigo-900 border border-indigo-100 mb-3"
                />
                <Text className="text-[9px] font-black text-indigo-300 uppercase mb-2 ml-1">
                  Payout Details
                </Text>
                <TextInput
                  placeholder="Bank Name"
                  className="bg-white p-4 rounded-xl font-bold mb-3 border border-indigo-100"
                />
                <TextInput
                  placeholder="Account Number"
                  keyboardType="numeric"
                  className="bg-white p-4 rounded-xl font-bold border border-indigo-100"
                />
              </View>
            ) : (
              <Text className="text-xs font-bold text-indigo-400">
                This event will be free for all residents and guests.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-indigo-600 p-6 rounded-3xl items-center mb-12 shadow-2xl shadow-indigo-300"
          >
            <Text className="text-white font-black uppercase tracking-[0.2em]">
              Submit for Approval
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View className="flex-1 px-6">
          <View className="flex-1 items-center justify-center mb-20">
            <View className="bg-slate-50 p-10 rounded-[3rem] mb-6">
              <CalendarDays size={48} color="#cbd5e1" />
            </View>
            <Text className="text-slate-900 font-black uppercase tracking-tight text-xl">
              Event Records
            </Text>
            <Text className="text-slate-400 font-bold text-center mt-2 max-w-[250px]">
              Events present in this estate will appear here. No active events
              found.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const SectionHeader = ({ title }: { title: string }) => (
  <Text className="text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-[0.2em]">
    {title}
  </Text>
);

const DateInput = ({
  icon,
  placeholder,
}: {
  icon: any;
  placeholder: string;
}) => (
  <View className="flex-1 bg-slate-50 p-5 rounded-2xl border border-slate-100 flex-row items-center">
    {icon}
    <TextInput
      placeholder={placeholder}
      className="ml-3 flex-1 font-bold text-slate-700"
    />
  </View>
);
