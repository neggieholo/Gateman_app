import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Plus, Trash2, FileText, CheckCircle2, ChevronDown } from "lucide-react-native";
import { createJoinRequest, fetchAllEstates } from "./services/api";
import { Estate, KYCSelection } from "./services/interfaces";
import { UserContext } from "./UserContext";

type IDType = "voters" | "nin" | "drivers";

interface BlockNode {
  block: string;
  units: string[];
}

interface ContractFileMeta {
  uri: string;
  name: string;
  blockTarget: string;
  unitTarget: string;
}

export default function JoinRequestForm() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Estate Selection States
  const [estateId, setEstateId] = useState("");
  const [estateLabel, setEstateLabel] = useState("");
  const [estates, setEstates] = useState<Estate[]>([]);
  const [selectorOpen, setSelectorOpen] = useState<boolean>(false);

  // Structural Groupings Nested Array State
  const [locations, setLocations] = useState<BlockNode[]>([
    { block: "", units: [""] }
  ]);

  const [activeConfig, setActiveConfig] = useState<KYCSelection>({
    selfie: true, rent_contract: true, ids: false, utility_bill: false
  });

  // KYC Asset Upload URI Stores
  const [selfie, setSelfie] = useState<string | null>(null);
  const [idType, setIdType] = useState<IDType>("nin");
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [utilityBill, setUtilityBill] = useState<string | null>(null);

  // Flattened local tracker managing individual files per assigned housing unit
  const [contracts, setContracts] = useState<(ContractFileMeta | null)[]>([]);

  const { user, triggerRefresh } = useContext(UserContext);
  const tempTenantId = user?.id;

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAllEstates();
        setEstates(data);
      } catch (err) {
        Alert.alert("System Error", "Could not synchronize baseline properties.");
      }
    })();
  }, []);

  // Sync contracts arrays maps whenever locations allocations state modifications occur
  useEffect(() => {
    const list: (ContractFileMeta | null)[] = [];
    locations.forEach((bObj) => {
      bObj.units.forEach((uName) => {
        const existing = contracts.find(c => c?.blockTarget === bObj.block && c?.unitTarget === uName);
        list.push(existing || null);
      });
    });
    setContracts(list);
  }, [locations]);

  const handleEstateSelect = (selected: Estate) => {
    setEstateId(selected.id);
    setEstateLabel(`${selected.name} (${selected.estate_code})`);
    setSelectorOpen(false);
    if (selected.kyc_selection) setActiveConfig(selected.kyc_selection);
  };

  // Nesting management workflows 
  const updateBlockName = (bIndex: number, text: string) => {
    const next = [...locations];
    next[bIndex].block = text;
    setLocations(next);
  };

  const updateUnitName = (bIndex: number, uIndex: number, text: string) => {
    const next = [...locations];
    next[bIndex].units[uIndex] = text;
    setLocations(next);
  };

  const addUnitToBlock = (bIndex: number) => {
    const next = [...locations];
    next[bIndex].units.push("");
    setLocations(next);
  };

  const removeUnitFromBlock = (bIndex: number, uIndex: number) => {
    const next = [...locations];
    if (next[bIndex].units.length === 1) {
      removeBlockNode(bIndex);
    } else {
      next[bIndex].units.splice(uIndex, 1);
      setLocations(next);
    }
  };

  const addBlockNode = () => {
    setLocations([...locations, { block: "", units: [""] }]);
  };

  const removeBlockNode = (bIndex: number) => {
    if (locations.length === 1) return;
    setLocations(locations.filter((_, idx) => idx !== bIndex));
  };

  const handleCapture = async (type: "selfie" | "idFront" | "idBack" | "utility") => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Required", "Camera permissions are required.");

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (type === "selfie") setSelfie(uri);
      if (type === "idFront") setIdFront(uri);
      if (type === "idBack") setIdBack(uri);
      if (type === "utility") setUtilityBill(uri);
    }
  };

  const handlePickContract = async (flatTargetIndex: number, bName: string, uName: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
      if (!result.canceled) {
        const nextContracts = [...contracts];
        nextContracts[flatTargetIndex] = {
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          blockTarget: bName,
          unitTarget: uName
        };
        setContracts(nextContracts);
      }
    } catch (err) {
      Alert.alert("File Error", "Could not secure local PDF file pointer.");
    }
  };

  const stepChain = ["estate_details", activeConfig.selfie && "selfie", activeConfig.ids && "identification", activeConfig.utility_bill && "address_bill", activeConfig.rent_contract && "rent_contract"].filter(Boolean) as string[];
  const currentViewKey = stepChain[step - 1];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("tempTenantId", tempTenantId || "");
      formData.append("estateId", estateId);
      formData.append("idType", idType);
      formData.append("locations", JSON.stringify(locations));

      if (activeConfig.selfie && selfie) formData.append("selfie", { uri: selfie, name: "selfie.jpg", type: "image/jpeg" } as any);
      if (activeConfig.ids && idFront) {
        formData.append("idFront", { uri: idFront, name: "idFront.jpg", type: "image/jpeg" } as any);
        if (idType !== "nin" && idBack) formData.append("idBack", { uri: idBack, name: "idBack.jpg", type: "image/jpeg" } as any);
      }
      if (activeConfig.utility_bill && utilityBill) formData.append("utilityBill", { uri: utilityBill, name: "utility.jpg", type: "image/jpeg" } as any);

      if (activeConfig.rent_contract) {
        contracts.forEach((cItem) => {
          if (cItem) {
            formData.append("rentContract", {
              uri: cItem.uri,
              name: cItem.name,
              type: "application/pdf"
            } as any);
          }
        });
      }

      const response = await createJoinRequest(formData);
      if (response.success) {
        Alert.alert("Success", "Request transmitted into verification sequence.", [
          { text: "OK", onPress: () => { navigation.goBack(); triggerRefresh(); } }
        ]);
      }
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed validating registration files.");
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = !!estateId && locations.every(b => b.block.trim() !== "" && b.units.every(u => u.trim() !== ""));
  const isIdValid = idType === "nin" ? !!idFront : !!idFront && !!idBack;
  const areAllContractsUploaded = contracts.every(c => c !== null);

  return (
    <ScrollView className="flex-1 bg-[#121826] p-4">
      {/* Step Tracker Header */}
      <View className="mb-6 mt-2 flex-row justify-between items-center bg-[#1e293b] p-4 rounded-xl border border-[#334155]">
        <Text className="text-sm font-bold text-slate-400">APPLICATION STATUS</Text>
        <Text className="text-sm font-bold text-indigo-400">Step {step} of {stepChain.length}</Text>
      </View>

      {/* STEP 1: ESTATE DETAILS & INTERACTIVE NESTED ALLOCATION FIELDS */}
      {currentViewKey === "estate_details" && (
        <View className="bg-[#1e293b] p-5 rounded-2xl border border-[#334155] mb-8">
          <Text className="text-lg font-bold mb-4 text-white">Select Property Hub</Text>
          
          <View className="mb-6">
            <Text className="text-slate-400 mb-2 text-xs font-semibold uppercase tracking-wider">Target Estate Hub</Text>
            <TouchableOpacity 
              onPress={() => setSelectorOpen(true)} 
              className="flex-row justify-between items-center border border-[#475569] rounded-xl p-4 bg-[#0f172a]"
            >
              <Text className={estateLabel ? "text-slate-200 font-medium" : "text-slate-500"}>
                {estateLabel || "Tap to select target destination"}
              </Text>
              <ChevronDown size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Modal visible={selectorOpen} transparent animationType="fade">
            <TouchableOpacity className="flex-1 bg-black/60 justify-center p-5" onPress={() => setSelectorOpen(false)}>
              <View className="bg-[#1e293b] rounded-2xl max-h-[70%] p-2 border border-[#475569]">
                <FlatList data={estates} keyExtractor={(item) => item.id} renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleEstateSelect(item)} className="p-4 border-b border-[#334155]">
                    <Text className="font-bold text-slate-200">{item.name}</Text>
                    <Text className="text-xs text-indigo-400 mt-1">{item.estate_code}</Text>
                  </TouchableOpacity>
                )}/>
              </View>
            </TouchableOpacity>
          </Modal>

          <Text className="text-slate-300 font-bold text-sm mb-3">Unit Location Allocations</Text>
          
          {locations.map((blockNode, bIdx) => (
            <View key={bIdx} className="p-4 bg-[#0f172a] border border-[#334155] rounded-2xl mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase">Block Domain Cluster #{bIdx + 1}</Text>
                {locations.length > 1 && (
                  <TouchableOpacity onPress={() => removeBlockNode(bIdx)} className="p-1">
                    <Trash2 size={16} color="#f43f5e" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                value={blockNode.block}
                onChangeText={(text) => updateBlockName(bIdx, text)}
                placeholder="Enter Block (e.g. Block C)"
                placeholderTextColor="#64748b"
                className="border border-[#334155] rounded-xl p-3 bg-[#1e293b] text-slate-100 text-sm font-semibold mb-4"
              />

              <Text className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">Assigned Units in Block</Text>
              
              {blockNode.units.map((unitNode, uIdx) => (
                <View key={uIdx} className="flex-row items-center gap-x-2 mb-2">
                  <View className="flex-1">
                    <TextInput
                      value={unitNode}
                      onChangeText={(text) => updateUnitName(bIdx, uIdx, text)}
                      placeholder={`Flat / Unit Identifier (e.g. Flat ${uIdx + 1})`}
                      placeholderTextColor="#64748b"
                      className="border border-[#334155] rounded-xl p-3 bg-[#1e293b] text-slate-200 text-xs"
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeUnitFromBlock(bIdx, uIdx)} className="p-2">
                    <Trash2 size={14} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity 
                onPress={() => addUnitToBlock(bIdx)} 
                className="flex-row items-center mt-3 self-start py-2 px-3 border border-[#334155] rounded-lg bg-[#1e293b]"
              >
                <Plus size={12} color="#818cf8" className="mr-1.5"/>
                <Text className="text-indigo-400 Regal text-[11px] font-bold">Add Unit to this Block</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addBlockNode} className="flex-row items-center justify-center p-4 border border-dashed border-[#4f46e5] rounded-xl mb-6 bg-[#4f46e5]/10">
            <Plus size={16} color="#818cf8" className="mr-1.5"/>
            <Text className="text-indigo-400 font-bold text-xs">Add Another Separate Block</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            disabled={!isStep1Valid} 
            onPress={() => setStep(2)} 
            className={`py-4 rounded-xl items-center ${isStep1Valid ? "bg-indigo-600" : "bg-[#334155]"}`}
          >
            <Text className={`font-bold ${isStep1Valid ? "text-white" : "text-slate-500"}`}>Move to Document Verification</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: PHOTO LIVE CAPTURE */}
      {currentViewKey === "selfie" && (
        <View className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155]">
          <Text className="text-lg font-bold mb-1 text-white">Biometric Verification Selfie</Text>
          <Text className="text-slate-400 text-xs mb-4">Please take a clear front face capture under bright lighting.</Text>
          
          <TouchableOpacity onPress={() => handleCapture("selfie")} className="border-dashed border-2 border-[#475569] h-56 rounded-2xl items-center justify-center bg-[#0f172a] overflow-hidden">
            {selfie ? <Image source={{ uri: selfie }} className="w-full h-full" /> : <Text className="text-indigo-400 font-semibold">📸 Engage System Camera</Text>}
          </TouchableOpacity>
          
          <View className="flex-row justify-between mt-8">
            <TouchableOpacity onPress={() => setStep(step - 1)} className="p-4"><Text className="text-slate-400 font-bold">Back</Text></TouchableOpacity>
            <TouchableOpacity disabled={!selfie} onPress={() => step === stepChain.length ? handleSubmit() : setStep(step + 1)} className={`py-4 px-10 rounded-xl ${selfie ? "bg-indigo-600" : "bg-[#334155]"}`}>
              <Text className={`font-bold ${selfie ? "text-white" : "text-slate-500"}`}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP: PRIMARY IDENTITY CARD DETAILS */}
      {currentViewKey === "identification" && (
        <View className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155]">
          <Text className="text-lg font-bold mb-4 text-white">Identification Documents</Text>
          
          <TouchableOpacity onPress={() => setIdType("nin")} className="flex-row items-center mb-4 p-3 bg-[#0f172a] rounded-xl border border-[#334155]">
            <View className="w-5 h-5 rounded-full border-2 border-indigo-500 mr-3 items-center justify-center">
              {idType === "nin" && <View className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
            </View>
            <Text className="text-slate-200 font-medium text-sm">National ID Slate Slip (NIN)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setIdType("voters")} className="flex-row items-center mb-6 p-3 bg-[#0f172a] rounded-xl border border-[#334155]">
            <View className="w-5 h-5 rounded-full border-2 border-indigo-500 mr-3 items-center justify-center">
              {idType === "voters" && <View className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
            </View>
            <Text className="text-slate-200 font-medium text-sm">Voters Card</Text>
          </TouchableOpacity>

          <View className="space-y-3">
            <TouchableOpacity onPress={() => handleCapture("idFront")} className="border border-dashed border-[#475569] rounded-xl p-4 bg-[#0f172a] items-center">
              <Text className="text-slate-300 text-xs font-semibold">{idFront ? "✅ Front Frame Logged" : "📸 Capture ID Front View"}</Text>
            </TouchableOpacity>
            {idType !== "nin" && (
              <TouchableOpacity onPress={() => handleCapture("idBack")} className="border border-dashed border-[#475569] rounded-xl p-4 mt-3 bg-[#0f172a] items-center">
                <Text className="text-slate-300 text-xs font-semibold">{idBack ? "✅ Back Frame Logged" : "📸 Capture ID Rear View"}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row justify-between mt-8">
            <TouchableOpacity onPress={() => setStep(step - 1)} className="p-4"><Text className="text-slate-400 font-bold">Back</Text></TouchableOpacity>
            <TouchableOpacity disabled={!isIdValid} onPress={() => step === stepChain.length ? handleSubmit() : setStep(step + 1)} className={`py-4 px-10 rounded-xl ${isIdValid ? "bg-indigo-600" : "bg-[#334155]"}`}>
              <Text className={`font-bold ${isIdValid ? "text-white" : "text-slate-500"}`}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP: UTILITY INVOICES ADDRESS PROOFS */}
      {currentViewKey === "address_bill" && (
        <View className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155]">
          <Text className="text-lg font-bold mb-2 text-white">Address Verification Invoice</Text>
          <Text className="text-slate-400 text-xs mb-4">Upload a recent utility receipt verifying resident location matching details.</Text>
          
          <TouchableOpacity onPress={() => handleCapture("utility")} className="border-dashed border-2 border-[#475569] h-48 rounded-xl items-center justify-center bg-[#0f172a] overflow-hidden">
            {utilityBill ? <Image source={{ uri: utilityBill }} className="w-full h-full" /> : <Text className="text-slate-400">Scan Utility Receipt Invoice</Text>}
          </TouchableOpacity>
          
          <View className="flex-row justify-between mt-8">
            <TouchableOpacity onPress={() => setStep(step - 1)} className="p-4"><Text className="text-slate-400 font-bold">Back</Text></TouchableOpacity>
            <TouchableOpacity disabled={!utilityBill} onPress={() => step === stepChain.length ? handleSubmit() : setStep(step + 1)} className={`py-4 px-10 rounded-xl ${utilityBill ? "bg-indigo-600" : "bg-[#334155]"}`}>
              <Text className={`font-bold ${utilityBill ? "text-white" : "text-slate-500"}`}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP: DYNAMIC LEASE ATTACHMENTS FOR CONTEXT LOCATIONS */}
      {currentViewKey === "rent_contract" && (
        <View className="bg-[#1e293b] p-5 rounded-2xl border border-[#334155] mb-8">
          <Text className="text-lg font-bold mb-1 text-white">Tenancy Agreements Indexing</Text>
          <Text className="text-slate-400 mb-5 text-xs">Please attach individual contract verification files matching each unit profile entry parameters.</Text>
          
          {(() => {
            let flatUnitCounter = 0;
            return locations.map((bObj) => 
              bObj.units.map((uName) => {
                const currentFlatIndex = flatUnitCounter;
                flatUnitCounter++;
                
                const currentBlockLabel = bObj.block || "[Block Missing]";
                const currentUnitLabel = uName || "[Unit Missing]";

                return (
                  <View key={`${currentBlockLabel}-${currentUnitLabel}-${currentFlatIndex}`} className="mb-4 p-4 bg-[#0f172a] border border-[#334155] rounded-xl">
                    <View className="flex-row items-center mb-2.5 gap-x-2">
                      <FileText size={14} color="#818cf8" />
                      <Text className="text-slate-300 text-xs font-bold uppercase tracking-wide">
                        Location: {currentBlockLabel} ➔ {currentUnitLabel}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      onPress={() => handlePickContract(currentFlatIndex, currentBlockLabel, currentUnitLabel)}
                      className={`border border-dashed rounded-xl p-3.5 flex-row items-center justify-between bg-[#1e293b] ${
                        contracts[currentFlatIndex] ? "border-emerald-500/50 bg-[#064e3b]/10" : "border-[#475569]"
                      }`}
                    >
                      <Text className={`text-xs max-w-[85%] ${contracts[currentFlatIndex] ? "text-emerald-400 font-medium" : "text-slate-400"}`} numberOfLines={1}>
                        {contracts[currentFlatIndex] ? contracts[currentFlatIndex]?.name : `Import lease PDF for ${currentUnitLabel}`}
                      </Text>
                      {contracts[currentFlatIndex] && <CheckCircle2 size={16} color="#34d399" />}
                    </TouchableOpacity>
                  </View>
                );
              })
            );
          })()}

          <View className="flex-row justify-between mt-6">
            <TouchableOpacity onPress={() => setStep(step - 1)} className="p-4">
              <Text className="text-slate-400 font-bold">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!areAllContractsUploaded || loading}
              onPress={handleSubmit}
              className={`py-4 px-8 rounded-xl flex-row items-center justify-center min-w-[160px] ${
                areAllContractsUploaded ? "bg-indigo-600" : "bg-[#334155]"
              }`}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className={`font-bold ${areAllContractsUploaded ? "text-white" : "text-slate-500"}`}>Submit Application</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}