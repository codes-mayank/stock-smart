import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, getAuthToken } from "@/contexts/AuthContext";
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, writeBatch
} from "../firebase-adapter";

import type {
  Product, ProductInsert, ProductUpdate,
  Profile, ProfileUpdate, EnhancedProfileData,
  SurplusListing, TransferRequest, StockPurchaseRequest,
  CreditEntry, CreditPayment,
  ComboOffer, ComboSale,
  Notification, WasteImpact
} from "@/types/database";

import { API_BASE_URL } from "@/config";

function extractPincodeFromAddress(addr?: string) {
  if (!addr) return null;
  const m = String(addr).match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

// Common query options for faster loads and better error handling
const QUERY_OPTIONS = {
  staleTime: 30_000,       // Cache data for 30 seconds before refetching
  retry: 2,                // Retry failed queries twice
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Handle Firestore errors
function handleFirestoreError(error: any): never {
  console.error('Firestore error:', error);

  // Check for missing index error (status 400)
  if (error.code === 'failed-precondition' || error.message?.includes('index')) {
    throw new Error('Database query requires an index. Please contact the administrator.');
  }

  // Check for permission denied
  if (error.code === 'permission-denied') {
    throw new Error('You do not have permission to access this data.');
  }

  // Check for network errors
  if (error.code === 'unavailable' || error.message?.includes('network')) {
    throw new Error('Network error. Please check your internet connection.');
  }

  throw error;
}

// Re-export types for backward compatibility
export type { Product, ProductInsert, ProductUpdate, Profile, EnhancedProfileData };
export type { SurplusListing, TransferRequest } from "@/types/database";
export type ProfileInsert = Partial<Profile> & { user_id: string };

export function useProducts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["products", user?.uid],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      
      const res = await fetch(`${API_BASE_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch products from custom backend');
      }
      
      return res.json() as Promise<Product[]>;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/all-products`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch all products');
      return res.json() as Promise<Product[]>;
    },
    ...QUERY_OPTIONS,
  });
}

export function useAllShopkeepers() {
  return useQuery({
    queryKey: ["all-shopkeepers"],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/all-profiles`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch all profiles');
      const all = await res.json() as Profile[];
      return all.filter(p => p.role === "shopkeeper" || p.role === null || !p.role);
    },
    ...QUERY_OPTIONS,
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/all-profiles`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch all profiles');
      return res.json() as Promise<Profile[]>;
    },
    ...QUERY_OPTIONS,
  });
}

// Get products for a specific shop by user_id
export function useShopProducts(shopUserId: string) {
  return useQuery({
    queryKey: ["shop-products", shopUserId],
    queryFn: async () => {
      if (!shopUserId) return [];
      const q = query(
        collection(db, "products"),
        where("user_id", "==", shopUserId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    },
    enabled: !!shopUserId,
    ...QUERY_OPTIONS,
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (product: Omit<ProductInsert, "user_id">) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(product)
      });

      if (!res.ok) {
        throw new Error('Failed to add product to custom backend');
      }

      return res.json() as Promise<Product>;
    },
    onMutate: async (newProduct) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ["products", user?.uid] });
      const previousProducts = qc.getQueryData(["products", user?.uid]);
      return { previousProducts };
    },
    onSuccess: (data) => {
      // Optimistically add to cache immediately
      qc.setQueryData(["products", user?.uid], (old: Product[] | undefined) => {
        return old ? [data, ...old] : [data];
      });
      // Background refetch to sync with server
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        qc.setQueryData(["products", user?.uid], context.previousProducts);
      }
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update product');
      return res.json() as Promise<Product>;
    },
    onSuccess: (data) => {
      qc.setQueriesData({ queryKey: ["products"] }, (old: Product[] | undefined) => {
        if (!old) return old;
        return old.map(p => p.id === data.id ? { ...p, ...data } : p);
      });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      qc.setQueriesData({ queryKey: ["products"] }, (old: Product[] | undefined) => {
        if (!old) return old;
        return old.filter(p => p.id !== id);
      });
      await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAdminDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    }
  });
}

export function useSales() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sales", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "sales"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useAddSale() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ productName, quantityToSell, total, source }: { productName: string, quantityToSell: number, total: number, source?: string }) => {
      // 1. Fetch available batches - use simple query without composite index
      const q = query(
        collection(db, "products"),
        where("name", "==", productName),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      // Filter for available stock and sort by expiry date locally for FIFO
      const allBatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const batches = allBatches
        .filter(b => b.quantity > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      let remaining = quantityToSell;
      let wasteSavedQuantity = 0;
      let wasteSavedValue = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Reduce stock FIFO
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        await updateDoc(doc(db, "products", batch.id), {
          quantity: batch.quantity - deduct,
        });

        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate >= today) {
          wasteSavedQuantity += deduct;
          wasteSavedValue += (deduct * (total / quantityToSell)); 
        }

        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Not enough stock. Missing ${remaining} items for ${productName}`);
      }

      const now = new Date().toISOString();

      // 3. Insert sale record
      await addDoc(collection(db, "sales"), {
        user_id: user!.uid,
        product_name: productName,
        quantity: quantityToSell,
        total: total,
        sale_date: now.split("T")[0],
        created_at: now,
        source: source || "manual",
      });

      // 4. Log waste impact if applicable
      if (wasteSavedQuantity > 0 && batches.length > 0) {
        await addDoc(collection(db, "waste_impact"), {
          user_id: user!.uid,
          date: now.split("T")[0],
          product_id: batches[0].id,
          product_name: productName,
          category: batches[0].category || "Uncategorized",
          quantitySaved: wasteSavedQuantity,
          valueSaved: wasteSavedValue,
          unit: batches[0].unit || "unit",
          created_at: now,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    }
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.uid],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 404) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error('Failed to fetch profile from custom backend');
      }
      
      return res.json() as Promise<Profile | null>;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useMarketplaceListings() {
  return useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: async () => {
      // Query without orderBy to avoid potential index issues
      const q = query(collection(db, "products"));
      const snapshot = await getDocs(q);
      // Sort by created_at in descending order locally
      const products = snapshot.docs.map(d => {
        const prod = { id: d.id, ...d.data() } as any;
        return {
          ...prod,
          shop_name: prod.shop_name || "Local Shop",
          contact_phone: prod.contact_phone || null,
          owner_name: prod.owner_name || null,
          shop_address: prod.shop_address || null,
          shop_pincode: prod.shop_pincode || null,
        };
      });
      return products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    ...QUERY_OPTIONS,
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: EnhancedProfileData) => {
      const token = await getAuthToken();
      if (!token || !user) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error('Failed to upsert profile');
      return res.json() as Promise<Profile>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/**
 * Upload a profile picture to Firebase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadProfilePicture(
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Hook for uploading profile picture with loading state
 */
export function useUploadProfilePicture() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated");
      return uploadProfilePicture(user.uid, file);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/**
 * Upload a product image to Firebase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadProductImage(
  userId: string,
  file: File
): Promise<string> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData
  });

  if (!res.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await res.json();
  return data.url;
}

/**
 * Hook for uploading product image
 */
export function useUploadProductImage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated");
      return uploadProductImage(user.uid, file);
    },
  });
}

// ============ Shop-to-Shop Stock Transfer Hooks ============

/**
 * Get all surplus listings from other shops (excluding current user's)
 */
export function useSurplusListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["surplus-listings"],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/surplus-listings`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch surplus listings');
      return res.json() as Promise<SurplusListing[]>;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get my surplus listings
 */
export function useMySurplusListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-surplus-listings", user?.uid],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/my-surplus-listings`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch my surplus listings');
      return res.json() as Promise<SurplusListing[]>;
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get incoming transfer requests (requests sent TO my shop)
 */
export function useIncomingTransferRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["incoming-transfer-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "transfer_requests"),
        where("supplier_shop_user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as TransferRequest))
        .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get my outgoing transfer requests (requests I sent TO other shops)
 */
export function useMyTransferRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-transfer-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "transfer_requests"),
        where("requester_shop_user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as TransferRequest))
        .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a new surplus listing
 */
export function useAddSurplusListing() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (listing: Omit<SurplusListing, "id" | "shop_user_id" | "shop_name" | "created_at" | "updated_at">) => {
      const token = await getAuthToken();
      if (!token || !user || !profile) throw new Error("Not authenticated");
      
      const now = new Date().toISOString();
      const data = {
        ...listing,
        shop_user_id: user.uid,
        shop_name: profile.shop_name || profile.owner_name || "My Shop",
        created_at: now,
        updated_at: now,
      };

      const res = await fetch(`${API_BASE_URL}/surplus-listings`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add surplus listing');
      return res.json() as Promise<SurplusListing>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surplus-listings"] });
      qc.invalidateQueries({ queryKey: ["my-surplus-listings"] });
    },
  });
}

/**
 * Update a surplus listing
 */
export function useUpdateSurplusListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SurplusListing> & { id: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const payload = { ...updates, updated_at: now };
      const res = await fetch(`${API_BASE_URL}/surplus-listings/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update surplus listing');
      return res.json() as Promise<SurplusListing>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surplus-listings"] });
      qc.invalidateQueries({ queryKey: ["my-surplus-listings"] });
    },
  });
}

/**
 * Delete a surplus listing
 */
export function useDeleteSurplusListing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/surplus-listings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete surplus listing');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surplus-listings"] });
      qc.invalidateQueries({ queryKey: ["my-surplus-listings"] });
    },
  });
}

/**
 * Create a transfer request
 */
export function useCreateTransferRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (request: {
      surplus_listing_id: string;
      requested_quantity: number;
      notes?: string;
    }) => {
      if (!user || !profile) throw new Error("User not authenticated");

      const listingDoc = await getDoc(doc(db, "surplus_listings", request.surplus_listing_id));
      const listing = listingDoc.data() as SurplusListing;

      const now = new Date().toISOString();
      const data = {
        requester_shop_user_id: user.uid,
        requester_shop_name: profile.shop_name || profile.owner_name || "My Shop",
        supplier_shop_user_id: listing.shop_user_id,
        supplier_shop_name: listing.shop_name,
        product_id: listing.product_id,
        product_name: listing.product_name,
        product_category: listing.product_category,
        requested_quantity: request.requested_quantity,
        status: "pending" as const,
        request_date: now,
        updated_at: now,
        notes: request.notes || "",
      };

      const docRef = await addDoc(collection(db, "transfer_requests"), data);

      // Generate notification for the receiving shopkeeper
      await addDoc(collection(db, "notifications"), {
        user_id: listing.shop_user_id,
        title: "New Transfer Request",
        message: `${data.requester_shop_name} requested ${request.requested_quantity} units of ${listing.product_name}`,
        type: 'alert',
        is_read: false,
        related_entity_id: docRef.id,
        created_at: now
      });

      return { id: docRef.id, ...data } as TransferRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-transfer-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-transfer-requests"] });
    },
  });
}

/**
 * Update transfer request status (approve/reject)
 */
export function useUpdateTransferRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: TransferRequest["status"]; notes?: string }) => {
      const now = new Date().toISOString();
      const updateData: any = { status, updated_at: now };
      if (notes !== undefined) updateData.notes = notes;

      await updateDoc(doc(db, "transfer_requests", id), updateData);
      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-transfer-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-transfer-requests"] });
    },
  });
}

/**
 * Get my stock purchase requests (sent to other shops)
 */
export function useMyStockRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-stock-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "stock_purchase_requests"), where("from_shop_user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockPurchaseRequest)).sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get incoming stock purchase requests (received from other shops)
 */
export function useIncomingStockRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["incoming-stock-requests", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "stock_purchase_requests"), where("to_shop_user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockPurchaseRequest)).sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Create a stock purchase request
 */
export function useCreateStockPurchaseRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (request: { to_shop: any; product_id: string; product_name: string; product_category: string; quantity: number; proposed_price: number; notes?: string }) => {
      if (!user || !profile) throw new Error("User not authenticated");
      const now = new Date().toISOString();
      const data = {
        from_shop_user_id: user.uid,
        from_shop_name: profile.shop_name || profile.owner_name || "My Shop",
        to_shop_user_id: request.to_shop.user_id,
        to_shop_name: request.to_shop.shop_name || request.to_shop.owner_name || "Shop",
        product_id: request.product_id,
        product_name: request.product_name,
        product_category: request.product_category,
        quantity: request.quantity,
        proposed_price: request.proposed_price,
        status: "pending" as const,
        notes: request.notes || "",
        request_date: now,
        updated_at: now,
      };
      const docRef = await addDoc(collection(db, "stock_purchase_requests"), data);

      // Generate notification for the receiving shopkeeper
      await addDoc(collection(db, "notifications"), {
        user_id: request.to_shop.user_id,
        title: "New Purchase Request",
        message: `${data.from_shop_name} requested to buy ${request.quantity} units of ${request.product_name}`,
        type: 'alert',
        is_read: false,
        related_entity_id: docRef.id,
        created_at: now
      });

      return { id: docRef.id, ...data } as StockPurchaseRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-stock-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-stock-requests"] });
    },
  });
}

/**
 * Update stock purchase request status
 */
export function useUpdateStockRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: StockPurchaseRequest["status"]; notes?: string }) => {
      const now = new Date().toISOString();
      const updateData: any = { status, updated_at: now };
      if (notes !== undefined) updateData.notes = notes;
      await updateDoc(doc(db, "stock_purchase_requests", id), updateData);
      return { id, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-stock-requests"] });
      qc.invalidateQueries({ queryKey: ["incoming-stock-requests"] });
    },
  });
}

// ============ Digital Credit Book (Udhaar System) Hooks ============

/**
 * Get all credit entries for the current user
 */
export function useCreditEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit-entries", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "credit_entries"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditEntry));
      return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a new credit entry
 */
export function useAddCreditEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<CreditEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const data = {
        ...entry,
        user_id: user!.uid,
        created_at: now,
        updated_at: now,
      };
      const docRef = await addDoc(collection(db, "credit_entries"), data);
      return { id: docRef.id, ...data } as CreditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
    },
  });
}

/**
 * Update a credit entry (e.g., mark as paid, update amounts)
 */
export function useUpdateCreditEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditEntry> & { id: string }) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "credit_entries", id), {
        ...updates,
        updated_at: now,
      });
      return { id, ...updates, updated_at: now } as CreditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
    },
  });
}

/**
 * Get all payments for a specific credit entry
 */
export function useCreditPayments(creditId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit-payments", creditId],
    queryFn: async () => {
      const q = query(
        collection(db, "credit_payments"),
        where("credit_id", "==", creditId),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditPayment));
      return payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user && !!creditId,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a payment to a credit entry and auto-update the credit status
 */
export function useAddCreditPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ creditId, amount, notes }: { creditId: string; amount: number; notes?: string }) => {
      const now = new Date().toISOString();

      // 1. Add payment record
      const paymentData = {
        credit_id: creditId,
        user_id: user!.uid,
        amount,
        payment_date: now.split("T")[0],
        notes: notes || "",
        created_at: now,
      };
      await addDoc(collection(db, "credit_payments"), paymentData);

      // 2. Update credit entry
      const creditDoc = await getDoc(doc(db, "credit_entries", creditId));
      if (!creditDoc.exists()) throw new Error("Credit entry not found");

      const credit = creditDoc.data() as CreditEntry;
      const newPaidAmount = credit.paid_amount + amount;
      const newDueAmount = credit.total_amount - newPaidAmount;
      let newStatus: CreditEntry['payment_status'] = 'partially_paid';
      if (newDueAmount <= 0) newStatus = 'paid';
      else if (newPaidAmount === 0) newStatus = 'pending';

      await updateDoc(doc(db, "credit_entries", creditId), {
        paid_amount: newPaidAmount,
        due_amount: Math.max(0, newDueAmount),
        payment_status: newStatus,
        updated_at: now,
      });

      return { creditId, amount, newPaidAmount, newDueAmount: Math.max(0, newDueAmount), newStatus };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
      qc.invalidateQueries({ queryKey: ["credit-payments"] });
    },
  });
}

/**
 * Record a sale as credit (udhaar): creates the sale + FIFO stock deduction + credit entry
 */
export function useAddCreditSale() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      productName,
      quantityToSell,
      total,
      customerName,
      customerPhone,
      amountPaid,
      dueDate,
      notes,
    }: {
      productName: string;
      quantityToSell: number;
      total: number;
      customerName: string;
      customerPhone: string;
      amountPaid: number;
      dueDate: string;
      notes: string;
    }) => {
      // 1. FIFO stock reduction (same logic as useAddSale)
      const q = query(
        collection(db, "products"),
        where("name", "==", productName),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const allBatches = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const batches = allBatches
        .filter(b => b.quantity > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      let remaining = quantityToSell;
      let wasteSavedQuantity = 0;
      let wasteSavedValue = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        await updateDoc(doc(db, "products", batch.id), {
          quantity: batch.quantity - deduct,
        });

        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate >= today) {
          wasteSavedQuantity += deduct;
          wasteSavedValue += (deduct * (total / quantityToSell)); 
        }

        remaining -= deduct;
      }

      if (remaining > 0) {
        throw new Error(`Not enough stock. Missing ${remaining} items for ${productName}`);
      }

      const now = new Date().toISOString();

      // 2. Record sale
      await addDoc(collection(db, "sales"), {
        user_id: user!.uid,
        product_name: productName,
        quantity: quantityToSell,
        total: total,
        sale_date: now.split("T")[0],
        created_at: now,
        payment_type: "credit",
      });

      // 2.5 Log waste impact if applicable
      if (wasteSavedQuantity > 0 && batches.length > 0) {
        await addDoc(collection(db, "waste_impact"), {
          user_id: user!.uid,
          date: now.split("T")[0],
          product_id: batches[0].id,
          product_name: productName,
          category: batches[0].category || "Uncategorized",
          quantitySaved: wasteSavedQuantity,
          valueSaved: wasteSavedValue,
          unit: batches[0].unit || "unit",
          created_at: now,
        });
      }

      // 3. Create credit entry
      const dueAmount = total - amountPaid;
      let paymentStatus: CreditEntry['payment_status'] = 'pending';
      if (dueAmount <= 0) paymentStatus = 'paid';
      else if (amountPaid > 0) paymentStatus = 'partially_paid';

      const creditData = {
        user_id: user!.uid,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: `${productName} x${quantityToSell}`,
        total_amount: total,
        paid_amount: amountPaid,
        due_amount: Math.max(0, dueAmount),
        credit_date: now.split("T")[0],
        due_date: dueDate,
        payment_status: paymentStatus,
        notes: notes || "",
        created_at: now,
        updated_at: now,
      };
      const creditRef = await addDoc(collection(db, "credit_entries"), creditData);

      // 4. If partial payment was made, record it
      if (amountPaid > 0) {
        await addDoc(collection(db, "credit_payments"), {
          credit_id: creditRef.id,
          user_id: user!.uid,
          amount: amountPaid,
          payment_date: now.split("T")[0],
          notes: "Initial payment at time of sale",
          created_at: now,
        });
      }

      return { id: creditRef.id, ...creditData } as CreditEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["credit-entries"] });
      qc.invalidateQueries({ queryKey: ["credit-payments"] });
    },
  });
}

// ============ AI-Based Combo Offer Hooks ============

/**
 * Get all combo offers for the current user
 */
export function useComboOffers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["combo-offers", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "combo_offers"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const offers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ComboOffer));
      return offers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Get all combo sales for the current user
 */
export function useComboSales() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["combo-sales", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "combo_sales"),
        where("user_id", "==", user!.uid)
      );
      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ComboSale));
      return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

/**
 * Add a new combo offer
 */
export function useAddComboOffer() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (offer: Omit<ComboOffer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const data = { ...offer, user_id: user!.uid, created_at: now, updated_at: now };
      const docRef = await addDoc(collection(db, "combo_offers"), data);
      return { id: docRef.id, ...data } as ComboOffer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
    },
  });
}

/**
 * Update a combo offer (activate, deactivate, edit)
 */
export function useUpdateComboOffer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComboOffer> & { id: string }) => {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "combo_offers", id), { ...updates, updated_at: now });
      return { id, ...updates, updated_at: now } as ComboOffer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
    },
  });
}

/**
 * Delete a combo offer
 */
export function useDeleteComboOffer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "combo_offers", id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
    },
  });
}

/**
 * Sell a combo: FIFO stock deduction for each product + record combo sale
 */
export function useSellCombo() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (combo: ComboOffer) => {
      const productNames = [combo.product1_name, combo.product2_name];
      if (combo.product3_name) productNames.push(combo.product3_name);

      // FIFO stock deduction for each product (1 unit each)
      for (const productName of productNames) {
        const q = query(
          collection(db, "products"),
          where("name", "==", productName),
          where("user_id", "==", user!.uid)
        );
        const snapshot = await getDocs(q);
        const batches = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(b => b.quantity > 0)
          .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        if (batches.length === 0 || batches[0].quantity < 1) {
          throw new Error(`Not enough stock for "${productName}". Combo sale cancelled.`);
        }
        await updateDoc(doc(db, "products", batches[0].id), {
          quantity: batches[0].quantity - 1,
        });
      }

      const now = new Date().toISOString();

      // Record combo sale
      const saleData = {
        user_id: user!.uid,
        combo_id: combo.id,
        combo_name: combo.combo_name,
        products_sold: productNames.join(", "),
        combo_price: combo.combo_price,
        original_price: combo.original_total_price,
        discount_amount: combo.original_total_price - combo.combo_price,
        sale_date: now.split("T")[0],
        created_at: now,
      };
      const docRef = await addDoc(collection(db, "combo_sales"), saleData);

      // Also record in main sales collection
      await addDoc(collection(db, "sales"), {
        user_id: user!.uid,
        product_name: `[COMBO] ${combo.combo_name}`,
        quantity: productNames.length,
        total: combo.combo_price,
        sale_date: now.split("T")[0],
        created_at: now,
        payment_type: "paid",
      });

      return { id: docRef.id, ...saleData } as ComboSale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["combo-offers"] });
      qc.invalidateQueries({ queryKey: ["combo-sales"] });
    },
  });
}

// ============ Notifications ============

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, "notifications"),
        where("user_id", "==", user!.uid),
        where("is_read", "==", false)
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      return notifications.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Assuming we hard delete for dismissal, or just set is_read to true
      await deleteDoc(doc(db, "notifications", id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateProfileRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/admin/profiles/${id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error("Failed to update role");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_BASE_URL}/admin/profiles/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete profile");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
    },
  });
}

export function useWasteImpact() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["waste-impact", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "waste_impact"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WasteImpact[];
    },
    enabled: !!user,
    ...QUERY_OPTIONS,
  });
}

export function useSeedWasteData() {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const today = new Date();
      
      const seedData = [
        { product_name: "Milk", category: "Dairy", quantitySaved: 10, valueSaved: 500, unit: "L", daysAgo: 1 },
        { product_name: "Bread", category: "Bakery", quantitySaved: 5, valueSaved: 200, unit: "packs", daysAgo: 2 },
        { product_name: "Apples", category: "Produce", quantitySaved: 20, valueSaved: 1000, unit: "kg", daysAgo: 5 },
        { product_name: "Yogurt", category: "Dairy", quantitySaved: 15, valueSaved: 450, unit: "cups", daysAgo: 10 },
        { product_name: "Bananas", category: "Produce", quantitySaved: 12, valueSaved: 360, unit: "kg", daysAgo: 15 },
        { product_name: "Cheese", category: "Dairy", quantitySaved: 2, valueSaved: 400, unit: "kg", daysAgo: 20 },
        { product_name: "Tomatoes", category: "Produce", quantitySaved: 8, valueSaved: 320, unit: "kg", daysAgo: 25 },
        { product_name: "Eggs", category: "Dairy", quantitySaved: 30, valueSaved: 210, unit: "pcs", daysAgo: 40 },
        { product_name: "Lettuce", category: "Produce", quantitySaved: 4, valueSaved: 120, unit: "kg", daysAgo: 60 }
      ];

      for (const item of seedData) {
        const date = new Date(today);
        date.setDate(date.getDate() - item.daysAgo);
        
        await addDoc(collection(db, "waste_impact"), {
          user_id: user.uid,
          date: date.toISOString().split("T")[0],
          product_id: `seed_${item.daysAgo}`,
          product_name: item.product_name,
          category: item.category,
          quantitySaved: item.quantitySaved,
          valueSaved: item.valueSaved,
          unit: item.unit,
          created_at: date.toISOString(),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste-impact"] });
    },
  });
}
