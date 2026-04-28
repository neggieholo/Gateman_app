import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { deleteReport, getMyReports } from "../services/api";
import { EstateReport } from "../services/interfaces";

type StatusType = "ALL" | "PENDING" | "REVIEWED" | "RESOLVED";

export default function ReportsHistory() {
  const [reports, setReports] = useState<EstateReport[]>([]);
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusType>("ALL");
  const [selectedReport, setSelectedReport] = useState<EstateReport | null>(
    null,
  );

  const loadReports = useCallback(async () => {
    setFetching(true);
    try {
      const res = await getMyReports();
      if (res.success) {
        // Filter strictly for General as requested earlier
        const generalReports = res.reports.filter(
          (r: EstateReport) => r.type === "GENERAL",
        );
        setReports(generalReports);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to remove this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const res = await deleteReport(id);
            if (res.success) {
              setReports(reports.filter((r) => r.id !== id));
              setSelectedReport(null);
            } else {
              Alert.alert("Error", "Could not delete report.");
            }
          },
        },
      ],
    );
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
      <View className="flex-1 bg-white p-6">
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity
            onPress={() => setSelectedReport(null)}
            className="p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(selectedReport.id)}
            className="p-2 bg-rose-50 rounded-xl"
          >
            <Trash2 size={20} color="#e11d48" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2 mb-4">
          <View className="bg-indigo-50 px-3 py-1 rounded-full">
          </View>
          {renderStatusBadge(selectedReport.status)}
        </View>

        <Text className="text-3xl font-black text-slate-900 mb-6">
          {selectedReport.subject}
        </Text>

        <View className="flex-row items-center gap-4 mb-8">
          <View className="flex-row items-center bg-slate-50 px-3 py-2 rounded-xl">
            <Calendar size={16} color="#94a3b8" />
            <Text className="ml-2 text-slate-500 text-xs font-bold">
              {new Date(selectedReport.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-3">
          Description
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="text-slate-700 text-lg font-medium leading-7 mb-10">
            {selectedReport.description}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // --- LIST VIEW ---
  return (
    <View className="flex-1 bg-slate-50">
      <View className="py-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          {["ALL", "PENDING", "REVIEWED", "RESOLVED"].map((s) => (
            <TouchableOpacity
              key={`status-${s}`}
              onPress={() => setStatusFilter(s as StatusType)}
              className={`px-5 py-2 rounded-full border ${statusFilter === s ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200"}`}
            >
              <Text
                className={`text-[10px] font-black ${statusFilter === s ? "text-white" : "text-slate-500"}`}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => `report-item-${item.id}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={fetching} onRefresh={loadReports} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedReport(item)}
            className="bg-white p-5 rounded-[30px] mb-4 border border-slate-100 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Text
                  className="text-base font-black text-slate-900"
                  numberOfLines={1}
                >
                  {item.subject}
                </Text>
                <View className="w-1 h-1 rounded-full bg-slate-300" />
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[9px] text-slate-300 mt-2 font-bold">
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          // This only renders if data is empty AND we aren't currently fetching
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
