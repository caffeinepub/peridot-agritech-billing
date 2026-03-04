import { Toaster } from "@/components/ui/sonner";
import html2canvas from "html2canvas";
import { Leaf, Loader2, Package, TrendingUp, Users } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { InvoiceItem } from "./backend.d";
import {
  useCreateCustomer,
  useCreateInvoice,
  useCreateProduct,
  useCustomers,
  useDeleteProduct,
  useProducts,
  useStats,
  useUpdateProduct,
} from "./hooks/useQueries";

interface CartItem {
  itemName: string;
  qty: number;
  price: number;
  itemTotal: number;
}

function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

function todayDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function App() {
  // ---- State ----
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [customItem, setCustomItem] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{
    invoiceNo: string;
    date: string;
    customerName: string;
    items: CartItem[];
    grandTotal: number;
  } | null>(null);
  const [whatsappMobile, setWhatsappMobile] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  // ---- Backend Hooks ----
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: stats } = useStats();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCustomer = useCreateCustomer();
  const createInvoice = useCreateInvoice();

  // ---- Handlers ----

  const handleCustomerSelect = useCallback(
    (name: string) => {
      if (!name) return;
      const found = customers.find((c) => c.name === name);
      if (found) {
        setCustomerName(found.name);
        setCustomerMobile(found.mobile);
        setWhatsappMobile(found.mobile);
      }
    },
    [customers],
  );

  const handleProductSelect = useCallback(
    (name: string) => {
      setSelectedProduct(name);
      const found = products.find((p) => p.name === name);
      if (found) {
        setPrice(String(Number(found.price)));
      }
    },
    [products],
  );

  const handleAddItem = () => {
    const itemName = customItem.trim() || selectedProduct;
    if (!itemName) {
      toast.error("Please select a product or enter a custom item name.");
      return;
    }
    const priceNum = Number.parseFloat(price);
    const qtyNum = Number.parseInt(qty, 10);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }
    const item: CartItem = {
      itemName,
      qty: qtyNum,
      price: priceNum,
      itemTotal: priceNum * qtyNum,
    };
    setCart((prev) => [...prev, item]);
    setCustomItem("");
    setQty("1");
    setSelectedProduct("");
    setPrice("");
    toast.success(`Added: ${itemName} × ${qtyNum}`);
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateInvoice = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter a customer name.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Add at least one item to the cart.");
      return;
    }

    setIsGenerating(true);
    try {
      const timestamp = Date.now();
      const invoiceNo = `INV-${timestamp}`;
      const grandTotal = cart.reduce((s, i) => s + i.itemTotal, 0);

      // Save to backend
      const items: InvoiceItem[] = cart.map((i) => ({
        itemName: i.itemName,
        qty: BigInt(i.qty),
        price: BigInt(Math.round(i.price * 100)),
        itemTotal: BigInt(Math.round(i.itemTotal * 100)),
      }));

      await createInvoice.mutateAsync({
        customerName: customerName.trim(),
        items,
        grandTotal: BigInt(Math.round(grandTotal * 100)),
        invoiceNo,
        createdAt: BigInt(timestamp),
      });

      // Save new customer if not existing
      const isExisting = customers.some(
        (c) => c.name.toLowerCase() === customerName.trim().toLowerCase(),
      );
      if (!isExisting && customerName.trim()) {
        try {
          await createCustomer.mutateAsync({
            name: customerName.trim(),
            mobile: customerMobile.trim(),
          });
        } catch {
          // Non-fatal: customer might already exist
        }
      }

      const invData = {
        invoiceNo,
        date: todayDate(),
        customerName: customerName.trim(),
        items: [...cart],
        grandTotal,
      };
      setInvoiceData(invData);
      setShowInvoice(true);

      // Generate QR code
      const upiString = `upi://pay?pa=donovanksingh-1@okaxis&pn=Peridot%20Agritech&am=${grandTotal.toFixed(2)}&cu=INR`;
      const qrUrl = await QRCode.toDataURL(upiString, {
        width: 120,
        margin: 1,
        color: { dark: "#1f7a1f", light: "#ffffff" },
      });
      setQrDataUrl(qrUrl);

      // Scroll to invoice after render
      setTimeout(() => {
        invoiceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      toast.success("Invoice generated and saved!");
    } catch (err) {
      toast.error("Failed to generate invoice. Please try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddProduct = async () => {
    const name = window.prompt("Enter product name:");
    if (!name?.trim()) return;
    const priceStr = window.prompt("Enter price (₹):");
    const priceVal = Number.parseFloat(priceStr || "");
    if (Number.isNaN(priceVal) || priceVal <= 0) {
      toast.error("Invalid price.");
      return;
    }
    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        price: BigInt(Math.round(priceVal * 100)),
      });
      toast.success(`Product "${name.trim()}" added.`);
    } catch (err) {
      toast.error("Failed to add product.");
      console.error(err);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product to edit.");
      return;
    }
    const newPriceStr = window.prompt(
      `Enter new price for "${selectedProduct}" (₹):`,
    );
    const newPrice = Number.parseFloat(newPriceStr || "");
    if (Number.isNaN(newPrice) || newPrice <= 0) {
      toast.error("Invalid price.");
      return;
    }
    try {
      await updateProduct.mutateAsync({
        name: selectedProduct,
        price: BigInt(Math.round(newPrice * 100)),
      });
      setPrice(String(newPrice));
      toast.success(`Product "${selectedProduct}" updated.`);
    } catch (err) {
      toast.error("Failed to update product.");
      console.error(err);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product to delete.");
      return;
    }
    const confirmed = window.confirm(
      `Delete product "${selectedProduct}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteProduct.mutateAsync(selectedProduct);
      setSelectedProduct("");
      setPrice("");
      toast.success(`Product "${selectedProduct}" deleted.`);
    } catch (err) {
      toast.error("Failed to delete product.");
      console.error(err);
    }
  };

  const handleBackup = () => {
    const data = JSON.stringify(products, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peridot-products-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Products backed up successfully.");
  };

  const captureInvoiceImage = async (): Promise<string | null> => {
    if (!invoiceRef.current) {
      toast.error("No invoice to capture. Generate one first.");
      return null;
    }
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      toast.error("Failed to capture invoice image.");
      console.error(err);
      return null;
    }
  };

  const handleDownloadInvoice = async () => {
    if (!showInvoice || !invoiceData) {
      toast.error("Generate an invoice first.");
      return;
    }
    setIsDownloading(true);
    try {
      const dataUrl = await captureInvoiceImage();
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${invoiceData.invoiceNo}.png`;
      a.click();
      toast.success("Invoice downloaded!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleScreenshot = () => {
    if (!showInvoice) {
      toast.error("Generate an invoice first.");
      return;
    }
    invoiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      alert("Take screenshot now!");
    }, 500);
  };

  const handleSendWhatsApp = async () => {
    const mobile = whatsappMobile.trim().replace(/\D/g, "");
    if (!mobile) {
      toast.error("Enter a WhatsApp number first.");
      return;
    }
    if (!showInvoice || !invoiceData) {
      toast.error("Generate an invoice first.");
      return;
    }
    setIsDownloading(true);
    try {
      const dataUrl = await captureInvoiceImage();
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${invoiceData.invoiceNo}.png`;
        a.click();
      }
      const whatsappUrl = `https://wa.me/${mobile}`;
      window.open(whatsappUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setCart([]);
    setShowInvoice(false);
    setInvoiceData(null);
    setQrDataUrl("");
    setCustomItem("");
    setSelectedProduct("");
    setPrice("");
    setQty("1");
    toast.success("Billing form reset.");
  };

  const grandTotal = cart.reduce((s, i) => s + i.itemTotal, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.02_140)] via-[oklch(0.99_0.01_130)] to-[oklch(0.95_0.03_145)]">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[oklch(0.85_0.05_145)] bg-[oklch(0.42_0.13_145)] shadow-md">
        <div className="mx-auto flex max-w-[480px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight text-white">
                PERIDOT AGRITECH
              </h1>
              <p className="text-xs text-white/70">Billing System</p>
            </div>
          </div>
          {stats && (
            <div className="flex gap-3 text-right">
              <div className="text-xs text-white/80">
                <div className="font-semibold text-white">
                  {String(stats.totalInvoices)}
                </div>
                <div>Invoices</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-4 py-5 pb-16">
        {/* Stats bar */}
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3 animate-slide-up">
            <div className="rounded-lg bg-white px-3 py-2 shadow-xs border border-[oklch(0.9_0.04_140)]">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[oklch(0.42_0.13_145)]" />
                <div>
                  <div className="text-xs text-[oklch(0.5_0.03_140)]">
                    Total Revenue
                  </div>
                  <div className="font-bold text-[oklch(0.3_0.1_145)]">
                    ₹{formatINR(Number(stats.totalRevenue) / 100)}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 shadow-xs border border-[oklch(0.9_0.04_140)]">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[oklch(0.42_0.13_145)]" />
                <div>
                  <div className="text-xs text-[oklch(0.5_0.03_140)]">
                    Total Invoices
                  </div>
                  <div className="font-bold text-[oklch(0.3_0.1_145)]">
                    {String(stats.totalInvoices)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Billing Card */}
        <div className="rounded-xl bg-white shadow-card border border-[oklch(0.9_0.04_140)] overflow-hidden animate-slide-up">
          {/* Card Header */}
          <div className="bg-[oklch(0.42_0.13_145)] px-5 py-3">
            <h2 className="font-display font-bold text-white text-base">
              New Bill
            </h2>
          </div>

          <div className="p-5 space-y-5">
            {/* Customer Section */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.42_0.13_145)] flex items-center gap-1.5 mb-3">
                <Users className="h-3.5 w-3.5" />
                Customer
              </h3>

              <div className="space-y-2.5">
                {/* Customer dropdown */}
                <div>
                  <label
                    htmlFor="customer-select"
                    className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                  >
                    Select Existing Customer
                  </label>
                  <select
                    id="customer-select"
                    data-ocid="billing.customer_select"
                    className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-[oklch(0.97_0.01_130)] px-3 py-2.5 text-sm text-[oklch(0.2_0.04_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                    value={customerName}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    disabled={customersLoading}
                  >
                    <option value="">
                      {customersLoading ? "Loading..." : "— Pick a customer —"}
                    </option>
                    {customers.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} {c.mobile ? `(${c.mobile})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name + Mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="customer-name"
                      className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                    >
                      Customer Name *
                    </label>
                    <input
                      id="customer-name"
                      data-ocid="billing.customer_name_input"
                      type="text"
                      placeholder="Full name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-white px-3 py-2.5 text-sm placeholder:text-[oklch(0.7_0.02_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customer-mobile"
                      className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                    >
                      Mobile
                    </label>
                    <input
                      id="customer-mobile"
                      type="tel"
                      placeholder="Phone no."
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-white px-3 py-2.5 text-sm placeholder:text-[oklch(0.7_0.02_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-[oklch(0.93_0.02_135)]" />

            {/* Product Section */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.42_0.13_145)] flex items-center gap-1.5 mb-3">
                <Package className="h-3.5 w-3.5" />
                Add Item
              </h3>

              <div className="space-y-2.5">
                {/* Product dropdown */}
                <div>
                  <label
                    htmlFor="product-select"
                    className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                  >
                    Select Product
                  </label>
                  <select
                    id="product-select"
                    data-ocid="billing.product_select"
                    className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-[oklch(0.97_0.01_130)] px-3 py-2.5 text-sm text-[oklch(0.2_0.04_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                    value={selectedProduct}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    disabled={productsLoading}
                  >
                    <option value="">
                      {productsLoading ? "Loading..." : "— Select product —"}
                    </option>
                    {products.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — ₹{formatINR(Number(p.price) / 100)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price + Qty */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="item-price"
                      className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                    >
                      Price (₹)
                    </label>
                    <input
                      id="item-price"
                      data-ocid="billing.price_input"
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-white px-3 py-2.5 text-sm placeholder:text-[oklch(0.7_0.02_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="item-qty"
                      className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                    >
                      Qty
                    </label>
                    <input
                      id="item-qty"
                      data-ocid="billing.qty_input"
                      type="number"
                      placeholder="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      min="1"
                      className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-white px-3 py-2.5 text-sm placeholder:text-[oklch(0.7_0.02_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                    />
                  </div>
                </div>

                {/* Custom Item */}
                <div>
                  <label
                    htmlFor="custom-item"
                    className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                  >
                    Custom Item Name (optional – overrides product)
                  </label>
                  <input
                    id="custom-item"
                    data-ocid="billing.custom_item_input"
                    type="text"
                    placeholder="e.g. Sunflower Microgreens 100g"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-white px-3 py-2.5 text-sm placeholder:text-[oklch(0.7_0.02_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* Cart preview */}
            {cart.length > 0 && (
              <section>
                <div className="rounded-lg border border-[oklch(0.88_0.05_145)] bg-[oklch(0.97_0.02_145)] overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1 px-2 py-1.5 bg-[oklch(0.42_0.13_145)] text-white text-[10px] font-semibold uppercase tracking-wide">
                    <span>Item</span>
                    <span className="text-right">₹</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.itemName}-${idx}`}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1 items-center px-2 py-1.5 border-t border-[oklch(0.9_0.04_140)] text-xs"
                    >
                      <span className="text-[oklch(0.25_0.08_145)] font-medium truncate">
                        {item.itemName}
                      </span>
                      <span className="text-right text-[oklch(0.4_0.1_145)]">
                        {formatINR(item.price)}
                      </span>
                      <span className="text-right text-[oklch(0.5_0.03_140)]">
                        {item.qty}
                      </span>
                      <span className="text-right font-semibold text-[oklch(0.3_0.1_145)]">
                        ₹{formatINR(item.itemTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="ml-1 text-[oklch(0.577_0.245_27.325)] hover:text-[oklch(0.45_0.2_27)] text-[10px] font-bold px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-[oklch(0.85_0.06_145)] bg-[oklch(0.93_0.05_145)] px-3 py-2 flex justify-between">
                    <span className="text-xs font-bold text-[oklch(0.3_0.1_145)]">
                      Grand Total
                    </span>
                    <span className="text-sm font-bold text-[oklch(0.3_0.1_145)]">
                      ₹{formatINR(grandTotal)}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Action Buttons Row 1 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-ocid="billing.add_item_button"
                onClick={handleAddItem}
                className="rounded-md bg-[oklch(0.42_0.13_145)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.36_0.14_145)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.42_0.13_145)] focus-visible:ring-offset-2"
              >
                + Add Item
              </button>
              <button
                type="button"
                data-ocid="billing.generate_invoice_button"
                onClick={handleGenerateInvoice}
                disabled={isGenerating}
                className="rounded-md bg-[oklch(0.5_0.15_250)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.44_0.16_250)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.5_0.15_250)] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Generate Invoice"
                )}
              </button>
            </div>

            {/* Action Buttons Row 2 – Product Management */}
            <div>
              <p className="text-xs text-[oklch(0.5_0.03_140)] mb-2 font-medium">
                Product Management
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  data-ocid="billing.add_product_button"
                  onClick={handleAddProduct}
                  disabled={createProduct.isPending}
                  className="rounded-md bg-[oklch(0.68_0.17_50)] px-2 py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.62_0.18_50)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.68_0.17_50)] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {createProduct.isPending ? "Adding…" : "+ Product"}
                </button>
                <button
                  type="button"
                  data-ocid="billing.edit_product_button"
                  onClick={handleEditProduct}
                  disabled={updateProduct.isPending}
                  className="rounded-md bg-[oklch(0.5_0.15_250)] px-2 py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.44_0.16_250)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.5_0.15_250)] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {updateProduct.isPending ? "Editing…" : "Edit"}
                </button>
                <button
                  type="button"
                  data-ocid="billing.delete_product_button"
                  onClick={handleDeleteProduct}
                  disabled={deleteProduct.isPending}
                  className="rounded-md bg-[oklch(0.577_0.245_27.325)] px-2 py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.5_0.22_27)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.577_0.245_27.325)] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {deleteProduct.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>

            {/* Action Buttons Row 3 */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-ocid="billing.backup_button"
                onClick={handleBackup}
                className="rounded-md bg-[oklch(0.55_0.02_240)] px-2 py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.48_0.02_240)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.02_240)] focus-visible:ring-offset-2"
              >
                Backup
              </button>
              <button
                type="button"
                data-ocid="billing.download_button"
                onClick={handleDownloadInvoice}
                disabled={isDownloading || !showInvoice}
                className="rounded-md bg-[oklch(0.55_0.02_240)] px-2 py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.48_0.02_240)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.02_240)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isDownloading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {isDownloading ? "…" : "Download"}
              </button>
              <button
                type="button"
                data-ocid="billing.screenshot_button"
                onClick={handleScreenshot}
                disabled={!showInvoice}
                className="rounded-md bg-[oklch(0.68_0.17_50)] px-2 py-2.5 text-xs font-semibold text-white hover:bg-[oklch(0.62_0.18_50)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.68_0.17_50)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Screenshot
              </button>
            </div>

            {/* WhatsApp Row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label
                  htmlFor="whatsapp-mobile"
                  className="text-xs text-[oklch(0.5_0.03_140)] mb-1 block"
                >
                  WhatsApp Number
                </label>
                <input
                  id="whatsapp-mobile"
                  data-ocid="billing.mobile_input"
                  type="tel"
                  placeholder="e.g. 919876543210"
                  value={whatsappMobile}
                  onChange={(e) => setWhatsappMobile(e.target.value)}
                  className="w-full rounded-md border border-[oklch(0.88_0.03_135)] bg-white px-3 py-2.5 text-sm placeholder:text-[oklch(0.7_0.02_140)] focus:border-[oklch(0.42_0.13_145)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.42_0.13_145)] transition-colors"
                />
              </div>
              <button
                type="button"
                data-ocid="billing.whatsapp_button"
                onClick={handleSendWhatsApp}
                disabled={isDownloading || !showInvoice}
                className="rounded-md bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1eb355] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Send WA
              </button>
              <button
                type="button"
                data-ocid="billing.reset_button"
                onClick={handleReset}
                className="rounded-md bg-[oklch(0.577_0.245_27.325)] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.5_0.22_27)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.577_0.245_27.325)] focus-visible:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        {showInvoice && invoiceData && (
          <div className="mt-6 animate-slide-up">
            <h2 className="text-sm font-semibold text-[oklch(0.42_0.13_145)] mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-[oklch(0.85_0.05_145)]" />
              Invoice Preview
              <span className="h-px flex-1 bg-[oklch(0.85_0.05_145)]" />
            </h2>

            <div
              id="invoicePreview"
              ref={invoiceRef}
              data-ocid="billing.invoice_preview"
              className="rounded-xl overflow-hidden shadow-invoice border border-[oklch(0.82_0.08_145)]"
              style={{
                background:
                  "linear-gradient(145deg, #e8f5e8 0%, #f0faf0 40%, #e0f2e0 100%)",
              }}
            >
              {/* Invoice Header */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #1f7a1f 0%, #2d9c2d 60%, #1a6b1a 100%)",
                }}
                className="px-5 py-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2
                      className="font-display font-black text-xl text-white tracking-wider"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      PERIDOT AGRITECH
                    </h2>
                    <p className="text-[#a8e6a8] text-xs mt-0.5">
                      Fresh Microgreens & Agricultural Products
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[#a8e6a8] text-[10px] uppercase tracking-wider">
                      Invoice
                    </div>
                    <div className="text-white font-bold text-sm">
                      {invoiceData.invoiceNo}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Date Info */}
              <div className="px-5 py-3 border-b border-[#c8e6c8] grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#2d7a2d] font-semibold mb-0.5">
                    Customer
                  </div>
                  <div className="text-sm font-bold text-[#1a4a1a]">
                    {invoiceData.customerName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[#2d7a2d] font-semibold mb-0.5">
                    Date
                  </div>
                  <div className="text-sm text-[#1a4a1a]">
                    {invoiceData.date}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="px-5 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2d7a2d]">
                      <th className="text-left py-1.5 text-[#1f7a1f] font-semibold text-[10px] uppercase tracking-wide w-5">
                        #
                      </th>
                      <th className="text-left py-1.5 text-[#1f7a1f] font-semibold text-[10px] uppercase tracking-wide">
                        Item
                      </th>
                      <th className="text-right py-1.5 text-[#1f7a1f] font-semibold text-[10px] uppercase tracking-wide">
                        ₹
                      </th>
                      <th className="text-right py-1.5 text-[#1f7a1f] font-semibold text-[10px] uppercase tracking-wide w-8">
                        Qty
                      </th>
                      <th className="text-right py-1.5 text-[#1f7a1f] font-semibold text-[10px] uppercase tracking-wide">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, idx) => (
                      <tr
                        key={`${item.itemName}-${idx}`}
                        data-ocid={`invoice.item.${idx + 1}`}
                        className="border-b border-[#c8e6c8] last:border-b-0"
                      >
                        <td className="py-2 text-[#4a8a4a]">{idx + 1}</td>
                        <td className="py-2 text-[#1a4a1a] font-medium">
                          {item.itemName}
                        </td>
                        <td className="py-2 text-right text-[#4a8a4a]">
                          {formatINR(item.price)}
                        </td>
                        <td className="py-2 text-right text-[#4a8a4a]">
                          {item.qty}
                        </td>
                        <td className="py-2 text-right font-semibold text-[#1a4a1a]">
                          ₹{formatINR(item.itemTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Grand Total */}
                <div
                  className="mt-3 rounded-lg px-4 py-3 flex justify-between items-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #1f7a1f 0%, #2d9c2d 100%)",
                  }}
                >
                  <span className="text-white font-bold text-sm">Total</span>
                  <span className="text-white font-black text-lg">
                    ₹ {formatINR(invoiceData.grandTotal)}
                  </span>
                </div>
              </div>

              {/* QR + Logo Footer */}
              <div className="px-5 py-4 border-t border-[#c8e6c8] flex items-center justify-between">
                <div className="text-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="UPI QR Code"
                      width={120}
                      height={120}
                      className="rounded-md border border-[#a8d8a8]"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-md border border-[#a8d8a8] bg-white flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1f7a1f]" />
                    </div>
                  )}
                  <div className="text-[10px] text-[#2d7a2d] mt-1 font-medium">
                    Scan to Pay
                  </div>
                </div>

                <div className="text-center flex-1 px-4">
                  <div className="text-[10px] text-[#4a8a4a] leading-relaxed">
                    Thank you for your purchase!
                  </div>
                  <div className="text-[9px] text-[#2d7a2d] mt-1">
                    UPI: donovanksingh-1@okaxis
                  </div>
                </div>

                <div className="text-center">
                  <img
                    src="/assets/generated/peridot-logo-transparent.dim_200x200.png"
                    alt="Peridot Agritech"
                    width={120}
                    height={120}
                    className="rounded-md object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state for invoice */}
        {!showInvoice && (
          <div
            data-ocid="billing.invoice_preview"
            className="mt-6 rounded-xl border-2 border-dashed border-[oklch(0.85_0.05_145)] bg-white/50 p-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[oklch(0.93_0.05_145)]">
              <Leaf className="h-6 w-6 text-[oklch(0.42_0.13_145)]" />
            </div>
            <p className="text-sm font-medium text-[oklch(0.4_0.08_145)]">
              Invoice will appear here
            </p>
            <p className="text-xs text-[oklch(0.6_0.03_140)] mt-1">
              Add items and click "Generate Invoice"
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[oklch(0.88_0.03_135)] py-5 text-center text-xs text-[oklch(0.55_0.03_140)]">
        <p>
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[oklch(0.42_0.13_145)] transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
