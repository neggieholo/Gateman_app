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