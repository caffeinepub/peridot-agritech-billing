import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface InvoiceItem {
    qty: bigint;
    itemTotal: bigint;
    itemName: string;
    price: bigint;
}
export interface Stats {
    totalRevenue: bigint;
    totalInvoices: bigint;
}
export interface Invoice {
    customerName: string;
    createdAt: bigint;
    invoiceNo: string;
    grandTotal: bigint;
    items: Array<InvoiceItem>;
}
export interface Customer {
    name: string;
    mobile: string;
}
export interface UserProfile {
    name: string;
}
export interface Product {
    name: string;
    price: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCustomer(name: string, mobile: string): Promise<void>;
    createInvoice(customerName: string, items: Array<InvoiceItem>, grandTotal: bigint, invoiceNo: string, createdAt: bigint): Promise<void>;
    createProduct(name: string, price: bigint): Promise<void>;
    deleteCustomer(name: string): Promise<void>;
    deleteProduct(name: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(name: string): Promise<Customer>;
    getProduct(name: string): Promise<Product>;
    getStats(): Promise<Stats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listCustomers(): Promise<Array<Customer>>;
    listInvoices(): Promise<Array<Invoice>>;
    listProducts(): Promise<Array<Product>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCustomer(name: string, mobile: string): Promise<void>;
    updateProduct(name: string, price: bigint): Promise<void>;
}
