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
}

export interface tempNotification {
  from: string;  
  message: string; 
  reason: string; 
}