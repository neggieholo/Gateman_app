import { formatDistanceToNow, parseISO } from "date-fns";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { File } from "expo-file-system";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Estate, Invitation, tempNotification } from "./interfaces";
const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}/api`;

export const postLogin = async (email: string, password: string) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/login/tenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include", // IMPORTANT for session cookies
    });

    const data = await res.json();

    return data;
  } catch (err) {
    console.log("Error:", err);
    return { success: false, message: "Network error" };
  }
};

export const updatePushTokenApi = async (token: string) => {
  try {
    const response = await fetch(`${BASE_URL}/admin/update-push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushToken: token }),
      credentials: "include",
    });
    return await response.json();
  } catch (error) {
    console.error("Push Token Sync Error:", error);
    return { success: false };
  }
};

export const postRegister = async (
  name: string,
  email: string,
  password: string,
) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/register/tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Registration error:", err);
    return { success: false, message: "Network error" };
  }
};

export const getDashboardData = async () => {
  const res = await fetch(`${BASE_URL}/tenant/dashboard`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await res.json();
  return data;
};

export const postLogout = async () => {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await res.json();

  return data;
};

export const createJoinRequest = async (formData: FormData): Promise<any> => {
  const res = await fetch(`${BASE_URL}/admin/join-request`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "KYC submission failed");
  }

  return data;
};

export const fetchAllEstates = async (): Promise<Estate[]> => {
  const res = await fetch(`${BASE_URL}/admin/estates`, {
    method: "GET",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch estates");
  }

  return data.estates;
};

export const fetchRequests = async () => {
  console.log("Fetching temp notifications...");
  try {
    const response = await fetch(`${BASE_URL}/admin/my-request`, {
      method: "GET", // Explicitly set method
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Server returned non-JSON:", text);
      return null;
    }

    const data = await response.json();

    if (data.success) {
      let standardized: tempNotification | null = null;
      console.log("Raw notification data:", data);

      if (data.activeRequest) {
        standardized = {
          from: "Gateman",
          message: `Your join request to ${data.activeRequest.estate_name} is still pending`,
          reason: "",
        };
      } else if (data.feedback) {
        standardized = {
          from: data.feedback.estate,
          message:
            data.feedback.type === "decline"
              ? "Your request was declined"
              : "You have been blocked",
          reason: data.feedback.message || "No reason was given",
        };
      }

      return {
        notification: standardized,
        isRead: data.isRead,
      };
    }
  } catch (error) {
    console.error("Error fetching temp notifications:", error);
  }
};

export const dismissNotification = async () => {
  try {
    const response = await fetch(`${BASE_URL}/admin/notification/dismiss`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    return await response.json();
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return { success: false };
  }
};

export const markNotificationAsRead = async () => {
  try {
    const response = await fetch(`${BASE_URL}/admin/notification/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to sync read status" };
  }
};

export default async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "GateMan Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      throw new Error(
        "Permission not granted to get push token for push notification!",
      );
    }
    // Inside your register function
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      "986508ab-d7ea-483c-b310-bd21cda01f48";

    if (!projectId) {
      throw new Error("Project ID not found");
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      throw new Error(`${e}`);
    }
  } else {
    throw new Error("Must use physical device for push notifications");
  }
}

export const fetchAllTenants = async () => {
  const res = await fetch(`${BASE_URL}/admin/tenants`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Could not fetch tenants");
  }
  const data = await res.json();
  return data;
};

export const getCloudinaryUrl = async (
  localUri: string,
  selectionType: "image" | "audio" | "video" | "document",
) => {
  try {
    // 1. SIZE CHECK: 50MB Limit
    const fileInfo = new File(localUri);
    if (!fileInfo.exists) {
      console.error("File does not exist at path:", localUri);
      return null;
    }

    const fileSize = fileInfo.size;
    const MAX_SIZE = 50 * 1024 * 1024;

    if (fileSize > MAX_SIZE) {
      alert("File too large. Max limit is 50MB.");
      return null;
    }

    const formData = new FormData();

    // 2. Resource Type Logic
    let cloudinaryType = "image";
    let mimeType = "image/jpeg";

    if (selectionType === "audio") {
      cloudinaryType = "video"; // Cloudinary treats audio as video resource
      mimeType = "audio/mpeg";
    } else if (selectionType === "video") {
      cloudinaryType = "video";
      mimeType = "video/mp4"; // CRITICAL: Explicitly tell Cloudinary it's a video
    } else if (selectionType === "document") {
      cloudinaryType = "raw";
      mimeType = "application/pdf";
    }

    // @ts-ignore
    formData.append("file", {
      uri: localUri,
      type: mimeType,
      name: `gateman_${selectionType}_${Date.now()}`,
    } as any);

    formData.append("upload_preset", "gateman uploads");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/diubaoqcr/${cloudinaryType}/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await res.json();

    if (data.error) {
      console.error("Cloudinary Error:", data.error.message);
      return null;
    }

    return data.secure_url;
  } catch (err) {
    console.error("Upload Logic Error:", err);
    return null;
  }
};

export const sendPushNotification = async (
  targetToken: string | null | undefined,
  title: string | undefined,
  body: string,
  data: any,
) => {
  if (!targetToken || !targetToken.startsWith("ExponentPushToken")) {
    console.log("Skipping push: No valid token.");
    return;
  }

  const message = {
    to: targetToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
    channelId: "default",
  };

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

export const notifyGroupPush = async (data: any) => {
  try {
    await fetch(`${BASE_URL}/admin/send-group-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
  } catch (e) {
    console.warn("Group push trigger failed", e);
  }
};

export const communityApi = {
  // getPosts: async (estateId: string, category: string ) => {
  //   try {
  //     const response = await fetch(
  //       `${BASE_URL}/community/posts?estate_id=${estateId}&category=${category}`,
  //     );
  //     if (!response.ok)
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     return await response.json(); // Explicitly return the parsed JSON
  //   } catch (error) {
  //     console.error("getPosts Error:", error);
  //     return []; // Return empty array so the app doesn't crash
  //   }
  // },
  getPosts: async (estateId: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/community/posts?estate_id=${estateId}`,
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json(); // Explicitly return the parsed JSON
    } catch (error) {
      console.error("getPosts Error:", error);
      return []; // Return empty array so the app doesn't crash
    }
  },

  createPost: async (data: any) => {
    try {
      const response = await fetch(`${BASE_URL}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("createPost Error:", error);
    }
  },

  deletePost: async (postId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/community/posts/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("deletePost Error:", error);
      throw error; // Throw so the UI can catch it and show an alert
    }
  },

  toggleLike: async (postId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/community/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      return await response.json();
    } catch (error) {
      console.error("toggleLike Error:", error);
    }
  },
  getLikes: async (postId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/community/likes/${postId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("getLikes Error:", error);
      return []; // Return empty array to keep UI stable
    }
  },

  addComment: async (data: any) => {
    try {
      const response = await fetch(`${BASE_URL}/community/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("addComment Error:", error);
    }
  },

  getComments: async (postId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/community/comments/${postId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("getComments Error:", error);
      return []; // Return empty array to prevent .map() crashes in the modal
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/community/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete comment");
      }

      return await response.json();
    } catch (error) {
      console.error("deleteComment Error:", error);
      throw error;
    }
  },
};

export const invitationApi = {
  // --- 1. GET ALL INVITATIONS (BY ESTATE) ---
  getInvitations: async (estateId: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/invitations/resident?estate_id=${estateId}`,
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      return await response.json();
    } catch (error) {
      console.error("getInvitations Error:", error);
      return [];
    }
  },

  // --- 2. CREATE AN INVITATION ---
  createInvitation: async (data: any) => {
    try {
      const response = await fetch(`${BASE_URL}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("createInvitation Error:", error);
      throw error;
    }
  },

  updateInvitation: async (id: string, data: Partial<Invitation>) => {
    console.log("Updating invitation with ID:", id, "and data:", data);
    const response = await fetch(`${BASE_URL}/invitations/edit/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  },

  // --- 3. DELETE / CANCEL AN INVITATION ---
  deleteInvitation: async (inviteId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/invitations/${inviteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("deleteInvitation Error:", error);
      throw error; // Throw so the UI can catch it and show a Toast/Alert
    }
  },
};

export const getRelativeTime = (timestamp: string) => {
  if (!timestamp) return "";
  try {
    const date = parseISO(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return timestamp; // Fallback to raw string if it fails
  }
};
