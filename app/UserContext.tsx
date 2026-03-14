// app/context/UserContext.tsx
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";
import { fetchRequests } from "./services/api";
import { tempNotification, User } from "./services/interfaces";

interface UserContextType {
  user: Partial<User> | null;
  setUser: (user: Partial<User> | null) => void;
  sessionId?: string;
  setSessionId?: (sessionId: string) => void;
  tempnotification: tempNotification | null;
  setTempnotification: (notification: tempNotification | null) => void;
  triggerRefresh: () => void;
  badgeCount: number;
  setBadgeCount: (count: number) => void;
  pushToken?: string | null;
  setPushToken: (token: string | null) => void;
  socket: Socket | null;
  onlineUsers: string[];
  remoteTyping: { [key: string]: boolean };
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  sessionId: "",
  setSessionId: () => {},
  tempnotification: null,
  setTempnotification: () => {},
  triggerRefresh: () => {},
  badgeCount: 0,
  setBadgeCount: () => {},
  pushToken: null,
  setPushToken: () => {},
  socket: null,
  onlineUsers: [],
  remoteTyping: {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [tempnotification, setTempnotification] =
    useState<tempNotification | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
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

  useEffect(() => {
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const newSocket = io("http://192.168.100.17:3003", {
      path: "/api/socket.io",
      transports: ["websocket"],
      autoConnect: true,
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

    socketRef.current = newSocket;

    return () => {
      newSocket.off("user_status_change");
      newSocket.off("is_typing");
      newSocket.off("status_update");
      newSocket.close();
      socketRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    const getStatus = async () => {
      if (user?.isTemp) {
        const result = await fetchRequests();

        if (result && result.notification) {
          setTempnotification(result.notification);

          // 🚀 Only increase badge if notification exists AND isRead is false
          if (result.isRead === false) {
            setBadgeCount(1);
          } else {
            setBadgeCount(0);
          }
        } else {
          setTempnotification(null);
          setBadgeCount(0);
        }
      } else {
        setTempnotification(null);
        setBadgeCount(0);
      }
    };

    getStatus();
  }, [user, refreshTrigger]);

  useEffect(() => {
    const setupNotifications = async () => {
      // 1. Create the Channel (Mandatory for Android Dev Builds)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Channel",
          importance: Notifications.AndroidImportance.MAX,
          showBadge: true,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      // 2. Set the handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    };

    setupNotifications(); //
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        tempnotification,
        setTempnotification,
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
