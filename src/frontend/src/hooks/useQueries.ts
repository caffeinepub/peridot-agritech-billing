import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer, InvoiceItem, Product } from "../backend.d";
import { useActor } from "./useActor";

// ---- Products ----

export function useProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, price }: { name: string; price: bigint }) => {
      if (!actor) throw new Error("No actor");
      return actor.createProduct(name, price);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, price }: { name: string; price: bigint }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProduct(name, price);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteProduct(name);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ---- Customers ----

export function useCustomers() {
  const { actor, isFetching } = useActor();
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, mobile }: { name: string; mobile: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.createCustomer(name, mobile);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

// ---- Invoices ----

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerName,
      items,
      grandTotal,
      invoiceNo,
      createdAt,
    }: {
      customerName: string;
      items: InvoiceItem[];
      grandTotal: bigint;
      invoiceNo: string;
      createdAt: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createInvoice(
        customerName,
        items,
        grandTotal,
        invoiceNo,
        createdAt,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      if (!actor) return { totalRevenue: 0n, totalInvoices: 0n };
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
  });
}
