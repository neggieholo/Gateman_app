import CreatePostModal from "@/app/components/CreatePostModal";
import PostDetailModal from "@/app/components/PostDetailModal";
import { communityApi, getRelativeTime } from "@/app/services/api";
import { Comment, Like, Post } from "@/app/services/interfaces";
import { useRouter } from "expo-router";
import {
  ChevronDown,
  ImageIcon,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ThumbsUp,
  Trash,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "../../UserContext";

type MainTab = "communication" | "marketplace";
type SubFilter = "all" | "my_posts";

export default function Community() {
  const { user, isDarkMode, theme } = useUser();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("communication");
  const [activeSubFilter, setActiveSubFilter] = useState<SubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState("");
  const [upLoadingNewComment, setUpLoadingNewComment] = useState(false);
  const [likes, setLikes] = useState<Like[]>([]);

  // Multi-estate context integration
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // 1. Establish the baseline default estate context layout on initialization
  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0]);
    }
  }, [user?.estate_ids]);

  // 2. Resolve the currently active workspace object mapping references dynamically
  const activeEstate = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return null;
    return user.estates.find((e) => e.id === selectedEstateId) || null;
  }, [selectedEstateId, user?.estates]);

  // Updated query loader engine to leverage the local property selector context state
  const loadPosts = async () => {
    if (!selectedEstateId) return;
    setLoading(true);
    try {
      const data = await communityApi.getPosts(selectedEstateId);
      setPosts(data);
    } catch (err) {
      console.error("Failed loading community posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger reloading processes cleanly when user context mutations or properties shift
  useEffect(() => {
    setNewComment("");
    Keyboard.dismiss();
    if (selectedEstateId) {
      loadPosts();
    }
  }, [selectedEstateId]);

  const filteredPosts = useMemo(() => {
    let result = posts;

    if (activeSubFilter === "my_posts") {
      result = result.filter((p) => p.author_id === user?.id);
    }

    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.author_name?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [posts, activeSubFilter, searchQuery, user?.id]);

  const handleLike = async (postId: string) => {
    if (user && user.id) {
      setPosts(
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes_count: p.has_liked
                  ? p.likes_count - 1
                  : p.likes_count + 1,
                has_liked: !p.has_liked,
              }
            : p,
        ),
      );

      await communityApi.toggleLike(postId);
    } else return;
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim() || !selectedEstateId) return;

    const payload = {
      estate_id: selectedEstateId,
      author_name: user!.name,
      author_role: "resident",
      title: postTitle,
      content: postContent,
      image_url: postImageUrl,
      category: "General",
    };

    await communityApi.createPost(payload);

    setPostTitle("");
    setPostContent("");
    setIsModalVisible(false);
    loadPosts();
  };

  const handleRefresh = useCallback(
    async (shouldScrollToTop = false) => {
      setIsRefreshing(true);
      await loadPosts();

      if (shouldScrollToTop) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }

      setIsRefreshing(false);
    },
    [selectedEstateId],
  );

  const handleOpenPost = async (post: Post) => {
    setSelectedPost(post);
    setComments([]);
    setLikes([]);
    setIsDetailVisible(true);
    setLoadingComments(true);

    try {
      const [commentsData, likesData] = await Promise.all([
        communityApi.getComments(post.id),
        communityApi.getLikes(post.id),
      ]);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                comments_count: commentsData.length,
                likes_count: likesData.length,
              }
            : p,
        ),
      );

      setComments(commentsData);
      setLikes(likesData);
    } catch (err) {
      console.error("Failed to load post details", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDelete = (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to remove this post permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await communityApi.deletePost(postId.toString());

              if (response.success) {
                setPosts((prevPosts) =>
                  prevPosts.filter((p) => p.id !== postId),
                );
                Alert.alert("Success", "Post deleted successfully.");
              }
            } catch (error: any) {
              console.error("Delete Error:", error);
              Alert.alert("Error", "Could not delete post. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;

    const commentText = newComment;
    setNewComment("");

    const optimisticComment: Comment = {
      id: Date.now(),
      post_id: Number(postId),
      user_id: user?.id || "",
      user_type: "admin",
      author_name: "ADMIN",
      content: commentText,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, optimisticComment]);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p,
      ),
    );

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        comments_count: selectedPost.comments_count + 1,
      });
    }

    try {
      const response = await communityApi.addComment({
        post_id: postId,
        content: commentText,
      });

      setComments((prev) =>
        prev.map((c) => (c.id === optimisticComment.id ? response : c)),
      );
    } catch (error) {
      console.error("GateMan Comment Error:", error);
      Alert.alert("Failed to add comment.");
      loadPosts();
    }
  };

  const handleModalCommentSubmit = async () => {
    if (!newComment.trim() || !selectedPost) return;

    await handleAddComment(selectedPost.id);
    setNewComment("");

    const updatedComments = await communityApi.getComments(selectedPost.id);
    setComments(updatedComments);
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to remove this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await communityApi.deleteComment(
                commentId.toString(),
              );

              if (response.success) {
                setComments((prev) => prev.filter((c) => c.id !== commentId));
                Alert.alert("Success", "Comment removed.");
              }
            } catch (error) {
              console.error("Delete Comment Error:", error);
              Alert.alert("Error", "Could not delete comment.");
            }
          },
        },
      ],
    );
  };

  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;

  if (hasNoEstates) {
    return (
      <View
        className={`${isDarkMode ? "bg-slate-950" : "bg-slate-50"} flex-1 justify-center items-center p-6`}
      >
        <View
          className={`${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-100"} p-8 rounded-[2.5rem] shadow-sm items-center border`}
        >
          <ShieldCheck size={60} color={isDarkMode ? "#D4AF37" : "#0A1F44"} />
          <Text
            className={`text-xl font-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} mt-4 text-center`}
          >
            Access Restricted
          </Text>
          <Text
            className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-2 text-center px-4 max-w-[280px]`}
          >
            You are currently not attached to any active estates on GateMan.
          </Text>
          <TouchableOpacity
            className={`w-full p-4 rounded-2xl shadow-sm mt-6 border items-center ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
            onPress={() => router.push("/JoinRequest" as any)}
          >
            <Text className="text-white font-roboto-regular font-bold text-base">
              Join an Estate
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView
      className={`${isDarkMode ? "bg-slate-950" : "bg-gray-50 "} flex-1`}
      edges={["top", "left", "right"]}
    >
      {/* 📍 CUSTOM DYNAMIC PROPERTY WORKSPACE CONTEXT PICKER BANNER */}
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mx-4 mt-2 flex-row items-center justify-between p-3.5 rounded-2xl border ${
            isDarkMode
              ? "bg-gm-navy border-slate-800"
              : "bg-white border-slate-200"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={16} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-wider ${
                isDarkMode ? "text-gm-gold" : "text-gm-navy"
              } flex-1`}
              numberOfLines={1}
            >
              Viewing Board: {activeEstate?.name || "Select Estate"}
            </Text>
          </View>
          <ChevronDown size={16} color={isDarkMode ? "#D4AF37" : "#94a3b8"} />
        </TouchableOpacity>
      )}

      <View className="flex-row mx-4 mt-3 p-1 bg-gray-200/70 rounded-2xl border border-gray-200">
        <TouchableOpacity
          onPress={() => setActiveMainTab("communication")}
          className={`flex-1 py-3 rounded-xl items-center justify-center ${
            activeMainTab === "communication"
              ? isDarkMode
                ? "bg-gm-navy"
                : "bg-white"
              : ""
          }`}
        >
          <Text
            className={`font-oswald-semibold tracking-wider text-md ${activeMainTab === "communication" ? (isDarkMode ? "text-gm-gold" : "text-gm-navy") : isDarkMode ? "text-gray-800" : "text-gray-500"}`}
          >
            Communication Board
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMainTab("marketplace")}
          className={`flex-1 py-3 rounded-xl items-center justify-center ${
            activeMainTab === "marketplace"
              ? isDarkMode
                ? "bg-gm-navy"
                : "bg-white"
              : ""
          }`}
        >
          <Text
            className={`font-oswald-semibold tracking-wider text-md ${activeMainTab === "marketplace" ? (isDarkMode ? "text-gm-gold" : "text-gm-navy") : isDarkMode ? "text-gray-800" : "text-gray-500"}`}
          >
            Marketplace
          </Text>
        </TouchableOpacity>
      </View>

      {activeMainTab === "marketplace" ? (
        /* MARKETPLACE PLACEHOLDER VIEW */
        <View className="flex-1 justify-center items-center">
          <View className="w-20 h-20 bg-indigo-50 rounded-full items-center justify-center mb-4">
            <ShoppingBag size={36} color="#0A1F44" />
          </View>
          <Text className={`text-xl font-oswald-semibold text-gray-900 mb-1`}>
            Marketplace
          </Text>
          <Text className="text-sm text-gray-500 font-roboto-regular text-center px-8">
            Trade and unlock estate listings with trusted neighbors. Coming
            soon!
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <View className="flex-row px-4 pt-3 gap-2">
            <TouchableOpacity
              onPress={() => setActiveSubFilter("all")}
              className={`px-5 py-2 rounded-full border items-center justify-center ${
                activeSubFilter === "all"
                  ? isDarkMode
                    ? "bg-gm-navy border-gm-gold"
                    : "bg-indigo-600 border-indigo-600"
                  : isDarkMode
                    ? "bg-gm-charcoal border-slate-800"
                    : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-oswald-semibold ${activeSubFilter === "all" ? (isDarkMode ? "text-gm-gold" : "text-white") : "text-gray-600"}`}
              >
                All Posts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveSubFilter("my_posts")}
              className={`px-5 py-2 rounded-full border items-center justify-center ${
                activeSubFilter === "my_posts"
                  ? isDarkMode
                    ? "bg-gm-navy border-gm-gold"
                    : "bg-indigo-600 border-indigo-600"
                  : isDarkMode
                    ? "bg-gm-charcoal border-slate-800"
                    : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-oswald-semibold ${activeSubFilter === "my_posts" ? (isDarkMode ? "text-gm-gold" : "text-white") : isDarkMode ? "text-white" : "text-gray-500"}`}
              >
                My Posts
              </Text>
            </TouchableOpacity>
          </View>

          <View
            className={`${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border border-gray-200"} mx-4 my-3 flex-row items-center rounded-lg px-4 py-1.5`}
          >
            <Search
              size={18}
              color={isDarkMode ? "#D4AF37" : "#9ca3af"}
              className="mr-2"
            />
            <TextInput
              className="flex-1 py-2 text-sm text-gray-900 font-roboto-regular"
              placeholder={
                activeSubFilter === "my_posts"
                  ? "Search by title..."
                  : "Search by title or poster name..."
              }
              placeholderTextColor={isDarkMode ? "#D4AF37" : "#9ca3af"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="p-1"
              >
                <X size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            className="px-4 pb-24"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => handleRefresh(false)}
                colors={["#4f46e5"]}
                tintColor="#4f46e5"
              />
            }
          >
            {filteredPosts.length === 0 && (
              <View className="py-12 items-center">
                <Text className="text-gray-400 text-lg">
                  {loading ? "Retrieving Posts ..." : "No posts yet"}
                </Text>
              </View>
            )}
            {filteredPosts.map((post) => (
              <View
                key={post.id}
                className={`p-4 rounded-2xl mb-4 shadow border ${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border border-gray-200"}`}
              >
                <TouchableOpacity
                  className={`items-start mb-2 w-full rounded-2xl p-2 border ${isDarkMode ? "border-gm-gold" : "border-gray-200"}`}
                  onPress={() => handleOpenPost(post)}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white ${post.author_role === "admin" || post.author_role === "superadmin" ? "bg-gm-charcoal" : "bg-gray-400"}`}
                    >
                      <Text className={"text-white font-montserrat-bold"}>
                        {post.author_name
                          ? post.author_name.charAt(0).toUpperCase()
                          : "?"}
                      </Text>
                    </View>
                    <View>
                      <View className="flex items-start justify-center">
                        <Text
                          className={`font-montserrat-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                        >
                          {post.author_name}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-400 font-roboto-regular">
                        {getRelativeTime(post.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View className="p-3">
                    <Text
                      className={`font-oswald-semibold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} text-lg mb-1`}
                    >
                      {post.title}
                    </Text>
                    <Text
                      className={`mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                    >
                      {post.content}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View className="flex-row items-center justify-between my-3">
                  <TouchableOpacity
                    className="flex-row items-center"
                    onPress={() => handleLike(post.id)}
                  >
                    <ThumbsUp
                      size={18}
                      color={post.has_liked ? "#2563eb" : "#9ca3af"}
                    />
                    <Text
                      className={`ml-1 font-roboto-regular ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} text-sm`}
                    >
                      {post.likes_count}
                    </Text>
                  </TouchableOpacity>
                  <View className="flex-row items-center">
                    <MessageSquare size={18} color="#9ca3af" />
                    <Text
                      className={`ml-1 font-roboto-regular ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} text-sm`}
                    >
                      {post.comments_count}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  {post.image_url ? (
                    <View
                      className={`flex-row items-center mt-3 ${isDarkMode ? "bg-gm-charcoal" : "bg-indigo-50"} self-start px-2 py-1 rounded-md`}
                    >
                      <ImageIcon size={14} color="#4f46e5" />
                      <Text
                        className={`text-xs ml-1 font-roboto-regular ${isDarkMode ? "text-white" : "text-gm-navy"}`}
                      >
                        Image attached
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-3" />
                  )}

                  {user?.id === post.author_id && (
                    <TouchableOpacity
                      onPress={() => handleDelete(post.id)}
                      className="mt-3 p-1"
                    >
                      <Trash size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="absolute bottom-10 right-6 items-center">
            <TouchableOpacity
              onPress={() => {
                handleRefresh(true);
              }}
              disabled={loading || isRefreshing}
              className={`mb-4 w-16 h-16 rounded-full items-center justify-center shadow-lg border border-gray-100 ${
                isRefreshing
                  ? "bg-gray-100"
                  : isDarkMode
                    ? "bg-gray-500"
                    : "bg-white"
              }`}
            >
              <RefreshCw
                size={20}
                color={isDarkMode ? "#ffffff" : "#4f46e5"}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              className={`${isDarkMode ? "bg-gm-charcoal border border-white" : "bg-gm-navy"} w-16 h-16 rounded-full items-center justify-center shadow-xl`}
            >
              <Plus size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CreatePostModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCreatePost}
        category="General"
        title={postTitle}
        setTitle={setPostTitle}
        content={postContent}
        setContent={setPostContent}
        setImageUrl={setPostImageUrl}
      />

      <PostDetailModal
        isVisible={isDetailVisible}
        onClose={() => {
          setIsDetailVisible(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        comments={comments}
        likes={likes}
        newComment={newComment}
        setNewComment={setNewComment}
        onAddComment={handleModalCommentSubmit}
        onLike={handleLike}
        isLoadingComments={loadingComments}
        uploadingComment={upLoadingNewComment}
        handleDelete={handleDeleteComment}
      />

      {/* Slide-Up Property Choice Sheets Workspace */}
      <Modal
        visible={estatePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-center bg-black/50 px-4">
          <View
            className={`${isDarkMode ? "bg-slate-900" : "bg-white"} p-6 max-h-[65%]`}
          >
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Select Active Estate
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
                      : isDarkMode
                        ? "border-slate-800 bg-slate-800/40"
                        : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <MapPin
                    size={20}
                    color={selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"}
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
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
