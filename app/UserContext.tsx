// app/context/UserContext.tsx
import React, { createContext, useState, ReactNode, useEffect, useRef } from "react";
import { tempNotification, User } from "./services/interfaces";
import { fetchRequests } from "./services/api";
import { io, Socket } from "socket.io-client";

interface UserContextType {
  user: Partial<User> | null;
  setUser: (user: Partial<User> | null) => void;
  sessionId?: string;
  setSessionId?: (sessionId: string) => void;
  tempnotification: tempNotification | null;
  triggerRefresh: () => void;
  badgeCount: number;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  sessionId: "",
  setSessionId: () => {},
  tempnotification: null,
  triggerRefresh: () => {},
  badgeCount: 0,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [tempnotification, setTempNotification] =
    useState<tempNotification | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string >("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
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
      }
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Socket Connected via Session ID");
    });

    // Listen for real-time status updates from GateMan Admin
    newSocket.on("status_update", (data) => {
      console.log("Real-time update received:", data);
      // You can update tempnotification state directly here!
      setTempNotification(data); 
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

  
  useEffect(() => {
    const getStatus = async () => {
      if (user?.isTemp) {
        const tempStatus = await fetchRequests(sessionId);
        setTempNotification(tempStatus || null);
        if (tempStatus) {
          setBadgeCount(1);
        } else {
          setBadgeCount(0);
        }
      } else {
        setTempNotification(null);
      }
    };

    getStatus();
  }, [user, refreshTrigger]);

  return (
    <UserContext.Provider
      value={{ user, setUser, tempnotification, triggerRefresh, badgeCount, sessionId, setSessionId }}
    >
      {children}
    </UserContext.Provider>
  );
};
