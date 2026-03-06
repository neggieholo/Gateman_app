import { Estate } from "./interfaces";

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