import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { IMessage } from 'react-native-gifted-chat';

export interface Estate {
  id: string;
  name: string;
  estate_code: string;
  created_at: string | null;
}

export interface Apartment {
  id: string;
  unitNumber: string;
  residentName: string;
  status: 'Occupied' | 'Vacant' | 'Under Maintenance';
  type: 'Tenant' | 'Owner';
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
    type: 'decline' | 'block';
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
}

export interface tempNotification {
  from: string;  
  message: string; 
  reason: string; 
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
  isDeleted?: boolean
}