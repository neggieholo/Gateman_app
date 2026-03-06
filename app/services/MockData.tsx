import { Apartment } from "./interfaces";

export const MOCK_APARTMENT_LIST: Apartment[] = [
  {
    id: 'U101',
    unitNumber: '101',
    residentName: 'Alice Johnson',
    status: 'Occupied',
    type: 'Owner',
    walletBalance: 15500.50, // Wallet balance for easy reference
  },
  {
    id: 'U102',
    unitNumber: '102',
    residentName: 'Babatunde Adekunle',
    status: 'Occupied',
    type: 'Tenant',
    walletBalance: 5000.00,
  },
  {
    id: 'U201',
    unitNumber: '201',
    residentName: 'Vacant',
    status: 'Vacant',
    type: 'Owner', // Owner's unit, but currently vacant
    walletBalance: 0.00,
  },
  {
    id: 'U205',
    unitNumber: '205',
    residentName: 'Chioma Okoro',
    status: 'Occupied',
    type: 'Tenant',
    walletBalance: 45200.75,
  },
  {
    id: 'U302',
    unitNumber: '302',
    residentName: 'Estate Management',
    status: 'Under Maintenance',
    type: 'Owner',
    walletBalance: 0.00,
  },
  {
    id: 'U401',
    unitNumber: '401',
    residentName: 'David Lee',
    status: 'Occupied',
    type: 'Owner',
    walletBalance: 8750.00,
  },
];