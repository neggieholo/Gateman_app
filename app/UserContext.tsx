// app/context/UserContext.tsx
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Platform, Vibration } from "react-native";
// import RNCallKeep from "react-native-callkeep";
import { io, Socket } from "socket.io-client";
import { startEmergencyAlarm } from "./services/alarm";
import { fetchNotifications, fetchRequests } from "./services/api";
import { notification, tempNotification, User } from "./services/interfaces";

interface UserContextType {
  user: Partial<User> | null;
  setUser: (user: Partial<User> | null) => void;
  sessionId?: string;
  setSessionId?: (sessionId: string) => void;
  tempnotification: tempNotification | null;
  setTempnotification: (notification: tempNotification | null) => void;
  notifications: notification[];
  setNotifications: (notifications: notification[]) => void;
  triggerRefresh: () => void;
  badgeCount: number;
  setBadgeCount: (count: number) => void;
  pushToken?: string | null;
  setPushToken: (token: string | null) => void;
  socket: Socket | null;
  onlineUsers: string[];
  remoteTyping: { [key: string]: boolean };
  setPrivateUnread: (count: number) => void;
  setGroupUnread: (count: number) => void;
  privateUnread: number;
  groupUnread: number;
  totalUnread: number;
  loadingNotifications: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  sessionId: "",
  setSessionId: () => {},
  tempnotification: null,
  setTempnotification: () => {},
  notifications: [],
  setNotifications: () => {},
  triggerRefresh: () => {},
  badgeCount: 0,
  setBadgeCount: () => {},
  pushToken: null,
  setPushToken: () => {},
  socket: null,
  onlineUsers: [],
  remoteTyping: {},
  setPrivateUnread: () => {},
  setGroupUnread: () => {},
  privateUnread: 0,
  groupUnread: 0,
  totalUnread: 0,
  loadingNotifications: false,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [tempnotification, setTempnotification] =
    useState<tempNotification | null>(null);
  const [notifications, setNotifications] = useState<notification[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [remoteTyping, setRemoteTyping] = useState<{ [key: string]: boolean }>(
    {},
  );
  const socketRef = useRef<Socket | null>(null);
  const triggerRefresh = () => setRefreshTrigger((prev) => !prev);
  // Inside your UserProvider
  const [privateUnread, setPrivateUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const totalUnread = privateUnread + groupUnread;
  const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}`;
  const navigation = useNavigation<any>();

  // useEffect(()=>{
  //   if(!user) {
  //     router.replace("/")
  //   }
  // },[user])

  useEffect(() => {
    if (!user?.id || !user?.estate_id) return;

    const myId = user.id.toString();
    const estateRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id);

    // 1. Listen to Private Chats Total
    const unsubPrivate = estateRef
      .collection("private_chats")
      .where(`unreadCount_${myId}`, ">", 0)
      .onSnapshot((snap) => {
        const count = snap.docs.reduce((sum, doc) => {
          return sum + (doc.data()[`unreadCount_${myId}`] || 0);
        }, 0);
        setPrivateUnread(count);
      });

    // 2. Listen to Group Chats Total
    const unsubGroups = estateRef
      .collection("groups")
      .where("memberIds", "array-contains", myId)
      .onSnapshot((snap) => {
        const count = snap.docs.reduce((sum, doc) => {
          const members = doc.data().members || [];
          const myData = members.find((m: any) => (m.user_id || m) === myId);
          return sum + (myData?.unreadCount || 0);
        }, 0);
        setGroupUnread(count);
      });

    return () => {
      unsubPrivate();
      unsubGroups();
    };
  }, [user?.id, user?.estate_id]);

  useEffect(() => {
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const newSocket = io(BASE_URL, {
      path: "/api/socket.io",
      transports: ["websocket"],
      autoConnect: true,
      withCredentials: true,
      extraHeaders: {
        cookie: `gateman.sid=${sessionId}`,
      },
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Socket Connected via Session ID");
    });

    newSocket.on("initial_online_list", (ids: string[]) => {
      // console.log("Setting initial online users:", ids);
      setOnlineUsers(ids);
    });

    // 1. Online/Offline Status
    newSocket.on(
      "user_status_change",
      (data: { userId: string; status: "online" | "offline" }) => {
        setOnlineUsers((prev) => {
          if (data.status === "online") {
            return prev.includes(data.userId) ? prev : [...prev, data.userId];
          } else {
            return prev.filter((id) => id !== data.userId);
          }
        });
      },
    );

    // 2. Typing Status
    newSocket.on("is_typing", (data: { from: string; typing: boolean }) => {
      setRemoteTyping((prev) => ({
        ...prev,
        [data.from]: data.typing,
      }));
    });

    // 3. Existing status_update listener
    newSocket.on("status_update", (data) => {
      setTempnotification(data);
      setBadgeCount(1);
    });

    newSocket.on("new_notification", (newNotif: notification) => {
      console.log("🚀 Real-time notification received:", newNotif);
      setNotifications((prev) => {
        const exists = prev.find((n) => n.id === newNotif.id);
        if (exists) return prev;
        return [newNotif, ...prev];
      });

      setBadgeCount((prev) => prev + 1);

      if (newNotif.type?.toLowerCase() === "emergency") {
        router.replace({
          pathname: "/EmergencyAlertPage",
          params: {
            title: newNotif.title,
            message: newNotif.message,
            residentId: newNotif.user_id,
          },
        });

        Vibration.vibrate([0, 500, 200, 500], true);
      }
    });

    newSocket.on("incoming_call", async (data) => {
      console.log("🚨 EMERGENCY SOCKET RECEIVED");
      await startEmergencyAlarm();

      router.push({
        pathname: "/EmergencyAlertPage",
        params: {
          title: "EMERGENCY ALERT",
          message: `${data.senderName} is calling for help!`,
          residentId: data.senderId,
        },
      });
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.off("user_status_change");
      newSocket.off("is_typing");
      newSocket.off("status_update");
      newSocket.off("new_notification");
      newSocket.off("incoming_call");
      newSocket.close();
      socketRef.current = null;
    };
  }, [sessionId, BASE_URL]);

  // useEffect(() => {
  //   // Listen for the "Answer" button press on the native CallKeep screen
  //   const onAnswer = ({ callUUID }: any) => {
  //     Vibration.cancel();
  //     RNCallKeep.backToForeground();

  //     // ROUTE TO YOUR EMERGENCY PAGE
  //     router.push({
  //       pathname: "/EmergencyCallPage",
  //       params: {
  //         channelName: `gate_man_${callUUID}`, // Matches the UUID you sent in push
  //         residentName: "Emergency Call",
  //       },
  //     });
  //   };

  //   RNCallKeep.addEventListener("answerCall", onAnswer);
  //   return () => RNCallKeep.removeEventListener("answerCall");
  // }, []);

  useEffect(() => {
    const getStatus = async () => {
      try {
        if (user?.isTemp) {
          const result = await fetchRequests();

          if (result && result.notification) {
            setTempnotification(result.notification);
            setBadgeCount(result.isRead === false ? 1 : 0);
          } else {
            setTempnotification(null);
            setBadgeCount(0);
          }
        }

        if (user?.estate_id && !user?.isTemp) {
          setLoadingNotifications(true);
          const result = await fetchNotifications();
          if (result.success) {
            setNotifications(result.list);

            const lastRead = new Date(result.lastReadAt || "1970-01-01");
            const unreadCount = result.list.filter(
              (n: any) => new Date(n.created_at) > lastRead,
            ).length;

            setBadgeCount(unreadCount);
          }
        }
      } catch (error) {
        Alert.alert("Failed to fetch notifications");
      } finally {
        setLoadingNotifications(false);
      }
    };

    getStatus();
  }, [user, refreshTrigger]);

  // useEffect(() => {
  //   RNCallKeep.setup({
  //     ios: { appName: "GateMan" },
  //     android: {
  //       alertTitle: "Permissions required",
  //       alertDescription:
  //         "This app needs to access your phone accounts to display calls",
  //       cancelButton: "Cancel",
  //       okButton: "ok",
  //       selfManaged: true,
  //       additionalPermissions: [],
  //     },
  //   });
  // }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      // 1. Create the Channel (Mandatory for Android Dev Builds)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "GateMan Alerts",
          importance: Notifications.AndroidImportance.MAX,
          showBadge: true,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });

        await Notifications.setNotificationChannelAsync("emergency-silent", {
          name: "GateMan Emergency",
          importance: Notifications.AndroidImportance.LOW,
          showBadge: false,
        });
      }

      // 2. Set the handler
      Notifications.setNotificationHandler({
        handleNotification: (notification) => {
          const data = notification.request.content.data as any;

          // Fix: Match exactly what your listener and server use
          const isEmergency =
            data?.subtype === "emergency" ||
            data?.type === "emergency" ||
            data?.type === "alarm";

          return Promise.resolve({
            shouldShowAlert: !isEmergency,
            shouldPlaySound: !isEmergency,
            shouldSetBadge: true,
            shouldShowBanner: !isEmergency,
            shouldShowList: !isEmergency,
          });
        },
      });
    };

    setupNotifications(); //
  }, [user]);

  useEffect(() => {
    const foregroundSubscription =
      Notifications.addNotificationReceivedListener(async (notification) => {
        const data = notification.request.content.data as any;

        if (data.type === "notification" && data.subtype === "emergency") {
          await startEmergencyAlarm(); //

          router.replace({
            pathname: "/EmergencyAlertPage",
            params: {
              title: notification.request.content.title || "Emergency",
              message: notification.request.content.body || "",
              residentId: data.user_id,
            },
          });
        }
      });

    // 2. Handle tapping the notification (Background/Quit/Foreground)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;

        console.log("Notification Tapped with data:", data);

        if (data.type === "chat" && data.roomId) {
          router.push({
            pathname: user?.id && isConnected ? "/ChatScreen" : "/",
            params: {
              autoId: String(data.senderId || ""),
              autoRoomId: String(data.roomId),
              isGroup: data.isGroup ? "true" : "false",
            },
          });
        }

        // if (data.type === "incoming_call") {
        //   router.push({
        //     pathname: "/CallScreen",
        //     params: {
        //       callId: data.callId,
        //       callerName: data.callerName,
        //       callerAvatar: data.callerAvatar || "",
        //       callType: data.callType,
        //       isIncoming: "true",
        //       roomName: data.callerName,
        //     },
        //   });
        // }

        if (data.type === "notification" && data.subtype === "emergency") {
          router.replace({
            pathname: "/EmergencyAlertPage",
            params: {
              title: response.notification.request.content.title || "Emergency",
              message: response.notification.request.content.body || "",
              residentId: data.user_id,
            },
          });
          Vibration.vibrate([0, 500, 200, 500], true);
          return;
        }

        if (data.type === "notification") {
          router.push({
            pathname: user?.id && isConnected ? "/NotificationsPage" : "/",
          });
        }
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [isConnected, user]);

  useEffect(() => {
    const checkInitialNotification = async () => {
      // This is the current, non-deprecated way to fetch the last response manually
      const response = Notifications.getLastNotificationResponse();

      if (response) {
        const data = response.notification.request.content.data as any;
        if (data?.subtype === "emergency") {
          router.replace({
            pathname: "/EmergencyAlertPage",
            params: {
              title: response.notification.request.content.title || "EMERGENCY",
              message: response.notification.request.content.body || "",
              residentId: data.user_id,
            },
          });
          Vibration.vibrate([0, 500, 200, 500], true);
        }
      }
    };

    checkInitialNotification();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        tempnotification,
        setTempnotification,
        notifications,
        setNotifications,
        triggerRefresh,
        badgeCount,
        setBadgeCount,
        sessionId,
        setSessionId,
        pushToken,
        setPushToken,
        onlineUsers,
        socket: socketRef.current,
        remoteTyping,
        privateUnread,
        setPrivateUnread,
        groupUnread,
        setGroupUnread,
        totalUnread,
        loadingNotifications,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
