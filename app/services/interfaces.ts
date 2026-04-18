import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { IMessage } from "react-native-gifted-chat";

export interface Estate {
  id: string;
  name: string;
  estate_code: string;
  created_at: string | null;
  city: string | null;
  town: string | null;
}

export interface Apartment {
  id: string;
  unitNumber: string;
  residentName: string;
  status: "Occupied" | "Vacant" | "Under Maintenance";
  type: "Tenant" | "Owner";
  walletBalance: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  isTemp: boolean;
  created_at: string | null;

  // Fields for Temp Tenants
  rejection_message?: {
    type: "decline" | "block";
    estate: string;
    message: string;
  } | null;

  // Fields for Permanent Tenants
  estate_id?: string;
  unit?: string;
  block?: string;
  wallet_balance?: string | number;
  avatar?: string | null;
  id_type?: string;
  id_front_url?: string;
  id_back_url?: string;
  utility_bill_url?: string;
  showWelcome?: boolean;
  estate_name?: string;
  chatToken?: string;
  push_token?: string;
  last_notification_read_at: string;
}

export interface tempNotification {
  from: string;
  type: string;
  message: string;
  reason: string;
}

export interface notification {
  id: string;              
  estate_id: number;  
  user_id: number | null;  
  recipient_role: 'tenant' | 'security' | 'admin';
  title: string;
  message: string;
  type: 'general' | 'emergency' | 'entry' | 'invite' | 'announcement';
  created_at: string; 
  is_deleted: boolean;
}

export interface FetchNotificationsResponse {
  success: boolean;
  list: notification[];
  lastReadAt: string;   
}

export interface GroupMember {
  user_id: string;
  clearedAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface ChatGroup {
  _id: string; // Firestore doc ID
  id?: string;
  name: string;
  members: GroupMember[];
  admins: string[];
  mutedBy: string[];
  isGroup: true;
  avatar?: string | null;
  createdBy?: string;
  createdAt?: any;
}

export interface ChatRoom {
  id: string;
  lastMessageAt?: any;
  lastSenderId?: string;
  [key: string]: any;
}

export interface IFileMessage extends IMessage {
  file?: {
    url: string;
    name: string;
    type: string;
  };
  pending?: boolean;
  isDeleted?: boolean;
}

export interface Post {
  id: string;
  estate_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  title: string;
  content: string;
  category: string;
  image_url?: string;
  thumbnail_url?: string;
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
  created_at: string;
}

export interface Comment {
  id: number; 
  post_id: number;
  user_id: string;
  user_type: string;
  author_name: string;
  content: string; 
  created_at: string; 
}

export interface Like {
  user_id: string; 
  author_name: string;
  created_at: string;  
}

export interface Invitation {
  id: string;
  guest_name: string;
  guest_image_url: string | null;
  access_code: string;
  invite_type: 'one_time' | 'multi_entry';
  start_date: any;
  end_date: any;
  start_time: any;
  end_time: any;
  excluded_dates: string[]; 
  status: string;
  actual_checkin: any;
  actual_checkout: any;
  actual_checkin_date: any;
  actual_checkout_date: any;
  created_at: string;
  is_cancelled: boolean;
}