import { formatDistanceToNow, parseISO } from "date-fns";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { File } from "expo-file-system";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  CreateEventRequest,
  DashboardStats,
  EmergencyContact,
  Estate,
  EstateEvent,
  EstateLocation,
  FetchNotificationsResponse,
  Invitation,
  PaymentSettingsResponse,
  SubmitReportPayload,
  tempNotification,
} from "./interfaces";

const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}/api`;

export const postLogin = async (
  email: string,
  password: string,
  biometric_login: boolean,
) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/login/tenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, biometric_login }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.error || "Login failed",
      };
    }

    return data;
  } catch (err) {
    console.log("Error:", err);
    return { success: false, message: "Network error" };
  }
};

export const updatePushTokenApi = async (token: string, userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/admin/update-push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushToken: token, userId: userId }),
      credentials: "include",
    });
    return await response.json();
  } catch (error) {
    console.error("Push Token Sync Error:", error);
    return { success: false };
  }
};

export const sendOtpApi = async (target: string, type: string) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/app/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, type, role: "TENANT" }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || "Server error" };
    }

    return data;
  } catch (err) {
    console.error("OTP error:", err);
    return { success: false, message: "Network connection failed" };
  }
};

export const sendPofileChangeOtpApi = async (target: string, type: string) => {
  try {
    const res = await fetch(`${BASE_URL}/admin/tenant/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, type }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || "Server error" };
    }

    return data;
  } catch (err) {
    console.error("OTP error:", err);
    return { success: false, message: "Network connection failed" };
  }
};

export const postRegister = async (
  name: string,
  email: string,
  password: string,
  phone: string,
) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/register/tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
      credentials: "include",
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Registration error:", err);
    return { success: false, message: "Network error" };
  }
};

export const forgotPasswordApi = async (
  email: string,
  role: "admin" | "tenant",
) => {
  try {
    const res = await fetch(`${BASE_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        role,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Forgot Password Error:", err);
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
          type: "pending",
          message: `Your join request to ${data.activeRequest.estate_name} is still pending`,
          reason: "",
        };
      } else if (data.feedback) {
        const parsedFeedback =
          typeof data.feedback === "string"
            ? JSON.parse(data.feedback)
            : data.feedback;

        const type = parsedFeedback.type;

        standardized = {
          from: data.feedback.estate,
          type: type,
          message:
            type === "decline"
              ? "Your request was declined"
              : type === "approve"
                ? "You have been approved"
                : "You have been restricted",
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

export const fetchNotifications =
  async (): Promise<FetchNotificationsResponse> => {
    try {
      const res = await fetch(`${BASE_URL}/notifications`, {
        method: "GET",
        credentials: "include",
      });
      return await res.json();
    } catch (err) {
      return { success: false, list: [], lastReadAt: "1970-01-01" };
    }
  };

export const markAllAsReadApi = async () => {
  try {
    const res = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: "PUT",
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
};

export const deleteNotificationApi = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/notifications/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    console.error("Delete API Error:", err);
    return { success: false };
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

export const fetchAllTenants = async (estate_id: string) => {
  const res = await fetch(`${BASE_URL}/admin/tenant/tenants`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ estate_id }),
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

export const createSubUser = async (payload: object) => {
  try {
    const res = await fetch(`${BASE_URL}/resident/create-subuser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.error || "Failed to provision sub-account registration.",
      };
    }

    return { success: true, ...data };
  } catch (err) {
    console.log("Create Sub-User Network Error:", err);
    return {
      success: false,
      message: "Network connection failed. Check server log routes.",
    };
  }
};

export const deleteSubUser = async (subUserId: string) => {
  try {
    const res = await fetch(
      `${BASE_URL}/resident/delete-subuser/${subUserId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Delete Sub-User Network Error:", err);
    return { success: false, message: "Network connectivity error." };
  }
};

export const leaveEstate = async (estateId: string) => {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/resident/leave-estate/${estateId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Leave Estate Network Error:", err);
    return { success: false, message: "Network connectivity error." };
  }
};

export const communityApi = {
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

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  role: string,
) => {
  console.log("Passwords in api:", currentPassword, newPassword, role);
  try {
    const response = await fetch(`${BASE_URL}/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, role }),
    });
    return await response.json();
  } catch (err) {
    return { success: false, message: "Network error" };
  }
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

export const getSecurityColleagues = async (estate_id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/security/tenant/all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estate_id }),
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    console.error("Fetch Colleagues Error:", err);
    return { success: false };
  }
};

export const submitEstateReport = async (payload: SubmitReportPayload) => {
  try {
    const res = await fetch(`${BASE_URL}/security/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: "Network error" };
  }
};

export const getMyReports = async (estate_id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/security/my-reports`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ estate_id }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: "Network error" };
  }
};

export const deleteReport = async (id: string) => {
  const res = await fetch(`${BASE_URL}/security/my-reports/${id}`, {
    method: "DELETE",
  });
  return await res.json();
};

export const getEstatePaymentSettings = async (
  id: string,
): Promise<PaymentSettingsResponse> => {
  // console.log('Payment settings ID:', id)
  try {
    const res = await fetch(`${BASE_URL}/admin/payment-settings`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ id }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        data: null as any, // Match your interface expectation
        error: data.error || "Failed to fetch settings",
      };
    }

    return data;
  } catch (err) {
    console.error("Payment Settings Fetch Error:", err);
    return {
      success: false,
      data: null as any,
      error: "Network error or server unreachable",
    };
  }
};

// POST: Upload Payment Record
export const uploadPaymentLog = async (payload: any) => {
  try {
    const res = await fetch(`${BASE_URL}/payment/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "Network error" };
  }
};

// GET: Fetch History with Date Filters
export const getPaymentHistory = async (
  id: string,
  startDate?: string,
  endDate?: string,
) => {
  try {
    const query =
      startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : "";
    console.log("History dates:", query);
    const res = await fetch(`${BASE_URL}/payment/history${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    return { success: false, history: [] };
  }
};

export const deletePaymentLog = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/payment/delete/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Delete failed",
    };
  }
};

export const getEmergencyContacts = async (
  estate_id: string,
): Promise<{
  success: boolean;
  contacts: EmergencyContact[];
  error?: string;
}> => {
  try {
    const res = await fetch(`${BASE_URL}/admin/emergency-contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estate_id }),
      credentials: "include",
    });
    return res.json();
  } catch (error: any) {
    return {
      success: false,
      contacts: [],
      error: error,
    };
  }
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw data.error || "Something went wrong";
  }
  return data;
};

export const createEvent = async (
  eventData: CreateEventRequest,
): Promise<EstateEvent> => {
  const response = await fetch(`${BASE_URL}/event/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventData),
  });
  const data = await handleResponse(response);
  return data.event;
};

export const toggleChatsReadReceipts = async (val: boolean) => {
  console.log("Read receipts val:", val);
  const response = await fetch(`${BASE_URL}/resident/chat-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read_receipts: val }),
  });
  const data = await handleResponse(response);
  return data;
};

export const getOrganizerEvents = async (
  estate_id: string,
): Promise<EstateEvent[]> => {
  // console.log("Fetching events for:", estate_id)
  const response = await fetch(`${BASE_URL}/event/organizer/all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estate_id }),
  });
  return await handleResponse(response);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/event/delete/${eventId}`, {
    method: "DELETE",
  });
  await handleResponse(response);
};

export const getResidentDashboardStats = async (
  estate_id: string,
): Promise<{
  success: boolean;
  data?: DashboardStats;
  message?: string;
}> => {
  try {
    const res = await fetch(`${BASE_URL}/resident/dashboard-stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ estate_id }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.error || "Failed to fetch dashboard statistics",
      };
    }

    return {
      success: true,
      data: data.stats,
    };
  } catch (error: any) {
    console.error("Dashboard Service Error:", error);
    return {
      success: false,
      message: error.message || "Network error occurred",
    };
  }
};

export const getEventDateLabel = (dateString: string): string => {
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateString === todayStr) {
    return "Today";
  }

  const todayDate = new Date(todayStr);
  const targetDate = new Date(dateString);

  const diffTime = targetDate.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day left";
  if (diffDays > 1) return `${diffDays} days left`;
  return dateString;
};

export const getAllLocations = async (
  estate_id: string,
): Promise<EstateLocation[]> => {
  const response = await fetch(`${BASE_URL}/event/locations/tenant/all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estate_id }),
  });
  return await handleResponse(response);
};
