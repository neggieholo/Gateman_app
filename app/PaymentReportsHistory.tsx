import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Mail,
  MessageSquare,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { deleteReport, getMyReports } from "./services/api";
import { EstateReport } from "./services/interfaces";
import { useUser } from "./UserContext";

type StatusType = "ALL" | "PENDING" | "REVIEWED" | "RESOLVED";

export default function PaymentReportsHistory({
  estate_id,
}: {
  estate_id: string;
}) {
  const { user, theme, isDarkMode } = useUser();
  const [reports, setReports] = useState<EstateReport[]>([]);
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusType>("ALL");
  const [selectedReport, setSelectedReport] = useState<EstateReport | null>(
    null,
  );
  const [responseModal, setResponseModal] = useState(false);

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const reportRes = await getMyReports(estate_id);

      if (reportRes.success) {
        setReports(
          reportRes.reports.filter((r: EstateReport) => r.type === "PAYMENT"),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      <View
        className={`flex-row items-center px-2 py-1 rounded-lg ${config.bg}`}
      >
        {config.icon}
        <Text
          className={`ml-1 text-[8px] font-black uppercase ${config.color}`}
        >
          {status}
        </Text>
      </View>
    );
  };

  // --- DETAIL VIEW ---
  if (selectedReport) {
    return (
      <View className="flex-1 p-6 pb-20">
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity
            onPress={() => setSelectedReport(null)}
            className="p-2 -ml-2"
          >
            <ArrowLeft size={24} color={theme.accent} />
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
              onPress={() => {
                setResponseModal(true);
              }}
              className={`${isDarkMode ? "bg-gray-400" : "bg-indigo-600"} p-2 rounded-2xl flex-row items-center`}
            >
              <MessageSquare size={12} color="white" />
              <Text className={`${isDarkMode ? "text--gray-400" : "text-white "} ml-2 font-oswald-semibold text-[11px] uppercase`}>
                View Response
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className={`text-3xl font-montserrat-bold ${isDarkMode ? 'text-gray-400':'text-gm-navy'} mb-6`}>
          {selectedReport.subject}
        </Text>

        <View className="flex-row items-center gap-4 mb-8">
          <View className={`flex-row items-center  ${isDarkMode ? "bg-gm-charcoal" : "bg-slate-50 "} px-3 py-2 rounded-xl`}>
            <Calendar size={16} color={isDarkMode ? "#D4AF37":"#94a3b8"} />
            <Text
              className={`ml-2 text-xs font-oswald-semibold ${isDarkMode ? "text-gm-gold" : "text-slate-500 "}`}
            >
              {new Date(selectedReport.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text
          className={`${isDarkMode ? "text-slate-500" : "text-slate-400"} text-[10px] uppercase font-oswald-semibold tracking-widest mb-3`}
        >
          Description
        </Text>
        <ScrollView>
          <Text className="text-slate-700 text-lg font-roboto-regular leading-7 mb-6">
            {selectedReport.description}
          </Text>
        </ScrollView>
        <Modal visible={responseModal} animationType="fade" transparent>
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="bg-white w-full rounded-[40px] p-8 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center">
                  <View className="bg-indigo-100 p-2 rounded-xl mr-3">
                    <ShieldAlert size={20} color="#4f46e5" />
                  </View>
                  <Text className="text-xl font-black text-slate-900">
                    Admin Response
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setResponseModal(false)}>
                  <XCircle size={28} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6">
                <Text className="text-[10px] font-black text-indigo-500 uppercase mb-2">
                  Official Feedback
                </Text>
                <Text className="text-base font-medium text-slate-800 leading-6">
                  {selectedReport?.admin_response || "No message provided."}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View className="flex-1 px-2">
      <View className="p-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 5 }}
        >
          {["ALL", "PENDING", "REVIEWED", "RESOLVED"].map((s) => (
            <TouchableOpacity
              key={`status-${s}`}
              onPress={() => setStatusFilter(s as StatusType)}
              className={`px-5 py-2 rounded-full border ${statusFilter === s ? (isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-gm-navy border-gray-200") : isDarkMode ? "" : "bg-white border-slate-200"}`}
            >
              <Text
                className={`text-[10px] font-black ${statusFilter === s ? (isDarkMode ? "text-gm-gold" : "text-white") : "text-slate-500"}`}
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
        refreshControl={
          <RefreshControl refreshing={fetching} onRefresh={loadData} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedReport(item)}
            className={`p-5 rounded-[30px] mb-4 border shadow-sm flex-row items-center justify-between ${isDarkMode ? "bg-gm-navy" : "bg-white border-slate-100 "}`}
          >
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1 justify-between">
                <View className="flex-1">
                  <Text
                    className={`text-base font-oswald-semibold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} flex-shrink`}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.subject.length > 30
                      ? `${item.subject.substring(0, 30)}...`
                      : item.subject}
                  </Text>
                </View>

                <View className="flex-row gap-2">
                  <View
                    style={{
                      backgroundColor:
                        item.status === "PENDING"
                          ? "#64748b"
                          : item.status === "REVIEWED"
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                    className="w-3 h-3 rounded-full mx-2 items-center"
                  />

                  {/* Mail Icon if Admin Response exists */}
                  {item.admin_response && (
                    <View
                      className={`${isDarkMode ? "bg-gm-charcoal" : "bg-indigo-100"} p-1.5 rounded-full`}
                    >
                      <Mail size={12} color={theme.accent} strokeWidth={3} />
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

            {/* Right-side Arrow for better UX */}
            <ChevronRight size={20} color={theme.accent} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !fetching ? (
            <View className="items-center mt-20 animate-in fade-in duration-500">
              <ClipboardList size={40} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 font-bold uppercase tracking-widest text-[10px]">
                No reports found
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
