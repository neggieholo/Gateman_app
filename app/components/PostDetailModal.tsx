import { useUser } from "@/app/UserContext";
import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import {
  Download,
  Heart,
  ImageIcon,
  Send,
  Trash,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getRelativeTime } from "../services/api";
import { Comment, Like, Post } from "../services/interfaces";

export interface PostDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  post: Post | null;
  comments: Comment[];
  likes: Like[];
  newComment: string;
  setNewComment: (text: string) => void;
  onAddComment: () => void;
  onLike: (postId: string) => void;
  isLoadingComments: boolean;
  uploadingComment: boolean;
  handleDelete: (commentId: number) => void;
}

export default function PostDetailModal({
  isVisible,
  onClose,
  post,
  comments,
  likes,
  newComment,
  setNewComment,
  onAddComment,
  isLoadingComments,
  uploadingComment,
  handleDelete,
}: PostDetailModalProps) {
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "likes">("comments");
  const { user, isDarkMode } = useUser();

  if (!post) return null;

  const handleSaveImage = async (url: string) => {
    try {
      setIsSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your gallery to save the photo.",
        );
        return;
      }

      const gateManDir = new Directory(Paths.cache, "GateMan");
      if (!gateManDir.exists) gateManDir.create();

      const fileName = `GateMan_Post_${Date.now()}.jpg`;
      const localFile = new File(gateManDir, fileName);

      const downloadedFile = await File.downloadFileAsync(url, localFile);

      if (downloadedFile.exists) {
        const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
        await MediaLibrary.createAlbumAsync("GateMan", asset, false);
        Alert.alert("Success", "Image saved to your gallery!");
      }
    } catch (error) {
      console.error("GateMan Image Save Error:", error);
      Alert.alert("Error", "Could not save the image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      statusBarTranslucent={false}
      presentationStyle="fullScreen"
    >
      <SafeAreaProvider>
        <View className="flex-1">
          <StatusBar
            key={`status-bar-${isDarkMode ? "dark" : "light"}`}
            style={isDarkMode ? "light" : "dark"}
            backgroundColor={isDarkMode ? "#020617" : "#ffffff"}
            translucent={false}
          />
          <SafeAreaView
            className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}
            edges={
              Platform.OS === "ios"
                ? ["top", "left", "right"]
                : ["top", "left", "right", "bottom"]
            }
          >
            {/* --- HEADER --- */}
            <View
              className={`flex-row items-center justify-between p-4 border-b ${
                isDarkMode ? "border-slate-900" : "border-slate-100"
              }`}
            >
              <Text
                style={{ fontFamily: "montserrat-bold" }}
                className={`text-2xl ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}
              >
                Discussion
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className={`p-2.5 rounded-full ${
                  isDarkMode ? "bg-gm-navy" : "bg-slate-100"
                }`}
              >
                <X size={18} color={isDarkMode ? "#ffffff" : "#334155"} />
              </TouchableOpacity>
            </View>

            {/* --- FIXED MAIN POST OBJECT --- */}
            <View
              className={`p-5 border-b ${
                isDarkMode
                  ? "bg-slate-950 border-slate-900"
                  : "bg-white border-slate-50"
              }`}
            >
              <Text
                style={{ fontFamily: "montserrat-bold" }}
                className={`text-xl mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                {post.title}
              </Text>

              <Text
                style={{ fontFamily: "roboto-regular" }}
                className={`text-sm mb-4 leading-6 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {post.content}
              </Text>

              {post.image_url && (
                <TouchableOpacity
                  onPress={() => setImageModalVisible(true)}
                  className={`flex-row items-center self-start px-3 py-1.5 rounded-lg mb-3 ${
                    isDarkMode ? "bg-gm-navy" : "bg-indigo-50"
                  }`}
                >
                  <ImageIcon
                    size={14}
                    color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                  />
                  <Text
                    style={{ fontFamily: "oswald-semibold" }}
                    className={`text-[10px] ml-1.5 uppercase tracking-wide ${
                      isDarkMode ? "text-gm-gold" : "text-indigo-600"
                    }`}
                  >
                    View Image
                  </Text>
                </TouchableOpacity>
              )}

              <Text
                style={{ fontFamily: "oswald-semibold" }}
                className={`text-[10px] uppercase tracking-wider ${
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {`By ${post.author_name} • ${getRelativeTime(post.created_at)}`}
              </Text>
            </View>

            {/* --- ACTION TABS --- */}
            <View className="flex-1">
              <View
                className={`flex-row border-b ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-900"
                    : "bg-white border-slate-100"
                }`}
              >
                <TouchableOpacity
                  onPress={() => setActiveTab("comments")}
                  className={`flex-1 py-3.5 items-center ${
                    activeTab === "comments"
                      ? `border-b-2 ${isDarkMode ? "border-gm-gold" : "border-indigo-600"}`
                      : ""
                  }`}
                >
                  <Text
                    style={{ fontFamily: "montserrat-bold" }}
                    className={`text-xs uppercase tracking-widest ${
                      activeTab === "comments"
                        ? isDarkMode
                          ? "text-gm-gold"
                          : "text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    Comments ({comments?.length ?? 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab("likes")}
                  className={`flex-1 py-3.5 items-center ${
                    activeTab === "likes"
                      ? `border-b-2 ${isDarkMode ? "border-gm-gold" : "border-indigo-600"}`
                      : ""
                  }`}
                >
                  <Text
                    style={{ fontFamily: "montserrat-bold" }}
                    className={`text-xs uppercase tracking-widest ${
                      activeTab === "likes"
                        ? isDarkMode
                          ? "text-gm-gold"
                          : "text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    Likes ({likes?.length ?? 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* --- SCROLL CONTENT FEED --- */}
              <KeyboardAwareScrollView
                className={isDarkMode ? "bg-slate-900" : "bg-slate-50"}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                bottomOffset={0}
              >
                {activeTab === "likes" ? (
                  <View className="flex-1 p-4">
                    {isLoadingComments ? (
                      <View className="flex-1 py-8 justify-center items-center">
                        <ActivityIndicator
                          size="small"
                          color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                        />
                      </View>
                    ) : likes.length > 0 ? (
                      likes.map((like: any, index: number) => (
                        <View
                          key={index}
                          className={`flex-row items-center mb-3 p-3.5 rounded-2xl border shadow-sm ${
                            isDarkMode
                              ? "bg-gm-navy border-slate-800"
                              : "bg-white border-slate-100"
                          }`}
                        >
                          <View
                            className={`w-9 h-9 rounded-full items-center justify-center mr-3 border ${
                              isDarkMode
                                ? "bg-slate-900 border-slate-800"
                                : "bg-indigo-50 border-indigo-100"
                            }`}
                          >
                            <Text
                              style={{ fontFamily: "montserrat-bold" }}
                              className={
                                isDarkMode ? "text-gm-gold" : "text-indigo-600"
                              }
                            >
                              {like.author_name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                          </View>

                          <View className="flex-1">
                            <Text
                              style={{ fontFamily: "montserrat-bold" }}
                              className={`text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}
                            >
                              {like.author_name}
                            </Text>
                            <Text
                              style={{ fontFamily: "oswald-semibold" }}
                              className={`text-[10px] tracking-wide uppercase ${
                                isDarkMode ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Liked {getRelativeTime(like.created_at)}
                            </Text>
                          </View>

                          <View
                            className={`p-2 rounded-full ${
                              isDarkMode ? "bg-red-950/40" : "bg-red-50"
                            }`}
                          >
                            <Heart size={12} color="#ef4444" fill="#ef4444" />
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="items-center py-12">
                        <Text
                          style={{ fontFamily: "roboto-regular" }}
                          className="text-slate-400 text-xs"
                        >
                          No likes yet
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="flex-1 p-4">
                    {isLoadingComments ? (
                      <View className="flex-1 py-8 justify-center items-center">
                        <ActivityIndicator
                          size="small"
                          color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                        />
                      </View>
                    ) : comments.length > 0 ? (
                      comments.map((comment: any) => (
                        <View
                          key={comment.id}
                          className={`mb-3 p-4 rounded-2xl border shadow-sm ${
                            isDarkMode
                              ? "bg-gm-navy border-slate-800"
                              : "bg-white border-slate-100"
                          }`}
                        >
                          <Text
                            style={{ fontFamily: "oswald-semibold" }}
                            className={`text-xs uppercase tracking-wide ${
                              isDarkMode ? "text-gm-gold" : "text-indigo-600"
                            }`}
                          >
                            {comment.author_name}
                          </Text>

                          <Text
                            style={{ fontFamily: "roboto-regular" }}
                            className={`py-1.5 text-sm leading-5 ${
                              isDarkMode ? "text-slate-200" : "text-slate-800"
                            }`}
                          >
                            {comment.content}
                          </Text>

                          <View className="flex-row justify-between items-center w-full mt-1">
                            <Text
                              style={{ fontFamily: "oswald-semibold" }}
                              className={`text-[9px] uppercase tracking-wider ${
                                isDarkMode ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {getRelativeTime(comment.created_at)}
                            </Text>
                            {comment.user_id === user?.id && (
                              <TouchableOpacity
                                onPress={() => handleDelete(comment.id)}
                                className="p-1"
                              >
                                <Trash size={14} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="items-center py-12">
                        <Text
                          style={{ fontFamily: "roboto-regular" }}
                          className="text-slate-400 text-xs"
                        >
                          No comments yet
                        </Text>
                      </View>
                    )}
                    <View className="h-10" />
                  </View>
                )}
              </KeyboardAwareScrollView>
            </View>

            {/* --- LOWER INTERACTIVE COMMENT INPUT BOX --- */}
            {activeTab === "comments" && (
              <View
                className={`p-4 border-t ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-900"
                    : "bg-white border-slate-100"
                }`}
              >
                <KeyboardAwareScrollView
                  keyboardShouldPersistTaps="handled"
                  bottomOffset={0}
                >
                  <View className="flex-row items-center px-2 h-12">
                    <TextInput
                      style={{ fontFamily: "roboto-regular" }}
                      className={`flex-1 text-sm h-12 rounded-2xl px-4 border ${
                        isDarkMode
                          ? "bg-gm-navy border-slate-800 text-white"
                          : "bg-slate-100 border-slate-200 text-slate-900"
                      }`}
                      placeholder="Write a comment..."
                      placeholderTextColor={isDarkMode ? "#475569" : "#9ca3af"}
                      value={newComment}
                      onChangeText={setNewComment}
                    />
                    <TouchableOpacity
                      onPress={onAddComment}
                      disabled={uploadingComment}
                      className={`ml-3 rounded-full p-3 items-center justify-center ${
                        isDarkMode
                          ? "bg-gm-charcoal border border-gm-gold"
                          : "bg-indigo-600"
                      }`}
                    >
                      {uploadingComment ? (
                        <ActivityIndicator
                          size="small"
                          color={isDarkMode ? "#D4AF37" : "white"}
                        />
                      ) : (
                        <Send
                          size={16}
                          color={isDarkMode ? "#D4AF37" : "white"}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </KeyboardAwareScrollView>
              </View>
            )}

            {/* --- IMAGE EXPANDED DETACHED MODAL SHEET --- */}
            <Modal
              visible={isImageModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setImageModalVisible(false)}
            >
              <View className="flex-1 bg-black/95 justify-center items-center">
                {/* Close Overlay Trigger */}
                <TouchableOpacity
                  onPress={() => setImageModalVisible(false)}
                  className="absolute top-12 right-6 z-20 bg-white/10 p-2.5 rounded-full"
                >
                  <X size={22} color="white" />
                </TouchableOpacity>

                {/* Local Action Save Trigger */}
                <TouchableOpacity
                  onPress={() => handleSaveImage(post.image_url!)}
                  disabled={isSaving}
                  className={`absolute top-12 left-6 z-20 p-2.5 rounded-full ${
                    isDarkMode
                      ? "bg-gm-charcoal border border-gm-gold"
                      : "bg-indigo-600"
                  }`}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={isDarkMode ? "#D4AF37" : "white"}
                    />
                  ) : (
                    <Download
                      size={22}
                      color={isDarkMode ? "#D4AF37" : "white"}
                    />
                  )}
                </TouchableOpacity>

                <Image
                  source={{
                    uri: post.image_url || "https://via.placeholder.com/300",
                  }}
                  className="w-full h-[80%]"
                  resizeMode="contain"
                />
              </View>
            </Modal>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
