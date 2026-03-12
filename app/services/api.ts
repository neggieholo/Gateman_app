import { Estate, tempNotification, User } from "./interfaces";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const BASE_URL = "http://10.21.77.113:3003/api"

export const postLogin = async (email: string, password: string) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/login/tenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include" // IMPORTANT for session cookies
    });

    const data = await res.json();
    
    return data;
  } catch (err) {
    console.log('Error:', err)
    return { success: false, message: "Network error" };
  }
};

export const postRegister = async (name: string, email: string, password: string) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/register/tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include", // for session cookies
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
      method: 'GET', // Explicitly set method
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
          reason: "" 
        };
      } 
      else if (data.feedback) {
        standardized = {
          from: data.feedback.estate,
          message: data.feedback.type === "decline" 
            ? "Your request was declined" 
            : "You have been blocked",
          reason: data.feedback.message || "No reason was given"
        };
      }

      return { 
        notification: standardized, 
        isRead: data.isRead
      };
    }
  } catch (error) {
    console.error("Error fetching temp notifications:", error);
  }
};

export const dismissNotification = async () => {
  try {
    const response = await fetch(`${BASE_URL}/admin/notification/dismiss`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
      name: "default",
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
      "4396d409-a5e5-4832-acbe-8b1dc8b26edc"; // Fallback project ID

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
    const res = await fetch('/api/admin/tenants', {
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Could not fetch tenants");
    }
    const data = await res.json();
    return data;
  };