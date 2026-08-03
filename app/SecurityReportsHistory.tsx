import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "./UserContext"; // Linked User Context hook
import {
  deleteReport,
  getMyReports,
  getSecurityColleagues,
} from "./services/api";
import { EstateReport, Guard } from "./services/interfaces";

type StatusType = "ALL" | "PENDING" | "REVIEWED" | "RESOLVED";

export default function SecurityReportsHistory({estate_id}:{estate_id:string}) {
  const { user, isDarkMode } = useUser();
  const [reports, setReports] = useState<EstateReport[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusType>("ALL");
  const [selectedReport, setSelectedReport] = useState<EstateReport | null>(null);
  const [responseModal, setResponseModal] = useState(false);

  // Estate Context Assignment States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(estate_id);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  useEffect(() => {
    if (estate_id) {
      setSelectedEstateId(estate_id);
    }
  }, [estate_id]);

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const loadData = useCallback(async (estateId: string) => {
    setFetching(true);
    try {
      const [reportRes, guardRes] = await Promise.all([
        getMyReports(estateId),
        getSecurityColleagues(estateId),
      ]);
      
      if (reportRes.success) {
        setReports(
          (reportRes.reports || []).filter((r: EstateReport) => r.type === "SECURITY"),
        );
      } else {
        setReports([]);
      }
      
      if (guardRes.success) {
        setGuards(guardRes.securityGuards || []);
      } else {
        setGuards([]);
      }
    } catch (e) {
      console.error("Historical Load Errors:", e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEstateId) {
      loadData(selectedEstateId);
    }
  }, [selectedEstateId, loadData]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete Record", "Remove this security report?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await deleteReport(id);
          if (res.success) {
            setReports(reports.filter((r) => r.id !== id));
            setSelectedReport(null);
          }
        },
      },
    ]);
  };

  const filteredData = reports.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    return true;
  });

  const renderStatusBadge = (status: string) => {
    const configs = {
      PENDING: {
        color: "text-slate-500",
        bg: "bg-slate-50",
        icon: <Clock size={12} color="#64748b" />,
      },
      REVIEWED: {
        color: "text-amber-600",
        bg: "bg-amber-50",
        icon: <AlertCircle size={12} color="#f59e0b" />,
      },
      RESOLVED: {
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        icon: <CheckCircle2 size={12} color="#10b981" />,
      },
    };
    const config = configs[status as keyof typeof configs] || configs.PENDING;

    return (
      <View className={`flex-row items-center px-2 py-1 rounded-lg ${config.bg}`}>
        {config.icon}
        <Text className={`ml-1 text-[8px] font-black uppercase ${config.color}`}>
          {status}
        </Text>
      </View>
    );
  };

  const renderPersonnel = (targetIds: string[]) => {
    const mentionedGuards = guards.filter((g) => targetIds.includes(g.id));
    if (mentionedGuards.length === 0) return null;

    return (
      <View className="mt-6 pt-6">
        <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">
          Mentioned Personnel
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {mentionedGuards.map((guard) => (
            <View
              key={guard.id}
              className={`flex-row items-center p-3 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"}`}
            >
              <View className="w-8 h-8 rounded-full bg-indigo-100 overflow-hidden items-center justify-center mr-3">
                <Image
                  source={{
                    uri: guard.avatar || "https://via.placeholder.com/150",
                  }}
                  className="w-8 h-8"
                  resizeMode="cover"
                />
              </View>
              <View>
                <Text className={`text-xs font-black ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                  {guard.name}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // --- DETAIL SUB-VIEW ARCHITECTURE ---
  if (selectedReport) {
    return (
      <View className={`flex-1 p-6 pb-20 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity
            onPress={() => setSelectedReport(null)}
            className="p-2 -ml-2"
          >
            <ArrowLeft size={24} color={isDarkMode ? "#fff" : "#0f172a"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(selectedReport.id)}
            className="p-2 bg-rose-50 rounded-xl"
          >
            <Trash2 size={20} color="#e11d48" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2 mb-4 justify-between">
          <View className="flex-row items-center gap-2">
            {renderStatusBadge(selectedReport.status)}
          </View>
          {selectedReport.admin_response && (
            <TouchableOpacity
              onPress={() => setResponseModal(true)}
              className="bg-indigo-600 p-2 rounded-2xl flex-row items-center"
            >
              <MessageSquare size={12} color="white" />
              <Text className="ml-2 text-white font-bold text-[11px] uppercase">
                View Response
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className={`text-3xl font-black mb-6 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          {selectedReport.subject}
        </Text>

        <View className="flex-row items-center gap-4 mb-8">
          <View className={`flex-row items-center px-3 py-2 rounded-xl ${isDarkMode ? "bg-slate-900" : "bg-slate-50"}`}>
            <Calendar size={16} color="#94a3b8" />
            <Text className="ml-2 text-slate-500 text-xs font-bold">
              {new Date(selectedReport.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-3">
          Description
        </Text>
        <ScrollView>
          <Text className={`text-lg font-medium leading-7 mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            {selectedReport.description}
          </Text>
          {selectedReport.category === "COMPLAINT" &&
            selectedReport.target_security_ids &&
            selectedReport.target_security_ids.length > 0 && (
              <View className={`flex-1 pt-2 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                {renderPersonnel(selectedReport.target_security_ids)}
              </View>
            )}
        </ScrollView>

        <Modal visible={responseModal} animationType="fade" transparent>
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className={`w-full rounded-[40px] p-8 shadow-2xl ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center">
                  <View className="bg-indigo-100 p-2 rounded-xl mr-3">
                    <ShieldAlert size={20} color="#4f46e5" />
                  </View>
                  <Text className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    Admin Response
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setResponseModal(false)}>
                  <XCircle size={28} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View className={`p-6 rounded-3xl border mb-6 ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                <Text className="text-[10px] font-black text-indigo-500 uppercase mb-2">
                  Official Feedback
                </Text>
                <Text className={`text-base font-medium leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
                  {selectedReport?.admin_response || "No message provided."}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- CORE VIEW LAYOUT ---
  return (
    <View className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
      {/* 🔄 Dynamic Context Banner Switcher for Multi-property users */}
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mx-4 mt-2 mb-1 flex-row items-center justify-between p-3 rounded-2xl border ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={12} color="#6366f1" />
            <Text className={`ml-2 text-[11px] font-black uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-600"} flex-1`} numberOfLines={1}>
              Logs for: {activeEstateName || "Switch Property"}
            </Text>
          </View>
          <ChevronDown size={14} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {/* Filter Chips Bar */}
      <View className="py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 5 }}
        >
          {["ALL", "PENDING", "REVIEWED", "RESOLVED"].map((s) => (
            <TouchableOpacity
              key={`status-${s}`}
              onPress={() => setStatusFilter(s as StatusType)}
              className={`px-5 py-2 rounded-full border ${
                statusFilter === s 
                  ? isDarkMode ? "bg-slate-100 border-slate-100" : "bg-slate-900 border-slate-900" 
                  : isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[10px] font-black ${
                  statusFilter === s 
                    ? isDarkMode ? "text-slate-900" : "text-white" 
                    : "text-slate-500"
                }`}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => `sec-${item.id}`}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl 
            refreshing={fetching} 
            onRefresh={() => selectedEstateId && loadData(selectedEstateId)} 
            tintColor={isDarkMode ? "#4f46e5" : undefined}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedReport(item)}
            className={`p-5 rounded-[30px] mb-4 border shadow-sm flex-row items-center justify-between ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            }`}
          >
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1 justify-between">
                <View className="flex-1">
                  <Text
                    className={`text-base font-black flex-shrink ${isDarkMode ? "text-white" : "text-slate-900"}`}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.subject}
                  </Text>
                </View>

                <View className="flex-row gap-2 items-center">
                  <View
                    style={{
                      backgroundColor:
                        item.status === "PENDING"
                          ? "#64748b"
                          : item.status === "REVIEWED"
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                    className="w-2.5 h-2.5 rounded-full mx-2"
                  />

                  {item.admin_response && (
                    <View className="bg-indigo-100 p-1.5 rounded-full">
                      <Mail size={12} color="#4f46e5" strokeWidth={3} />
                    </View>
                  )}
                </View>
              </View>

              <View className="items-start">
                <Text className="text-[10px] text-slate-400 mt-1 font-bold">
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !fetching ? (
            <View className="items-center mt-20">
              <ClipboardList size={40} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 font-bold uppercase tracking-widest text-[10px]">
                No reports found
              </Text>
            </View>
          ) : null
        }
      />

      {/* Slide-Up Workspace Selection Sheet */}
      <Modal visible={estatePickerVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className={`${isDarkMode ? "bg-slate-900" : "bg-white"} rounded-t-[2.5rem] p-6 max-h-[60%]`}>
            <View className="w-12 h-1 bg-slate-300 rounded-full self-center mb-6 mx-auto" />
            <Text className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Select Active Property Context</Text>
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
                    <Text className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            {selectedEstateId && (
              <TouchableOpacity onPress={() => setEstatePickerVisible(false)} className="mt-2 p-4 bg-slate-200 rounded-2xl items-center">
                <Text className="text-slate-700 font-bold">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}