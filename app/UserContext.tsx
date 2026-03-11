// app/context/UserContext.tsx
import React, {
  createContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { fetchRequests } from "./services/api";
import { tempNotification, User } from "./services/interfaces";
import * as Notifications from "expo-notifications"
import { Platform } from "react-native";

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
}

// export const UserContext = createContext<UserContextType | undefined>(undefined);

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
  const socketRef = useRef<Socket | null>(null);

  const triggerRefresh = () => setRefreshTrigger((prev) => !prev);


  // --- SOCKET LOGIC ---
  useEffect(() => {
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Connect using your local IP and Port
    const newSocket = io("http:localhost:3003", {
      path: "/api/socket.io",
      transports: ["websocket"],
      autoConnect: true,
      extraHeaders: {
        cookie: `connect.sid=${sessionId}`,
      },
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Socket Connected via Session ID");
    });

    // Listen for real-time status updates from GateMan Admin
    newSocket.on("status_update", (data) => {
      console.log("Real-time update received:", data);
      // You can update tempnotification state directly here!
      setTempnotification(data);
      setBadgeCount(1);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ Socket Disconnected");
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [sessionId]);

  // app/context/UserContext.tsx

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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
