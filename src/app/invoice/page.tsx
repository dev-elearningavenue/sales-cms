// src/app/login/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Plus,
  Sparkles,
  X,
  Check,
  ChevronDown,
  Calendar,
  Search,
} from "lucide-react";

// Import types
import type {
  ProductOption,
  PriceOption,
  CouponOption,
  InvoiceProduct,
  InvoiceData,
  FormData,
  SiteOption,
  CreateInvoiceApiRequest,
  CreateInvoiceApiResponse,
} from "@/types/invoice";
import { useApp } from "@/contexts/AppContext";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const getInitialFormData = (): FormData => ({
  siteName: "",
  email: "",
  fullName: "",
  contactNo: "",
  sendInvoice: false,
  // Extended form fields for new customer
  firstName: "",
  lastName: "",
  password: "Apple@123!",
  userType: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zipCode: "",
  company: "",
});

const Invoice = () => {
  const { session } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1 = initial form, 2 = customer details, 3 = invoice creation
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false); // New state for invoice creation
  const [customerExists, setCustomerExists] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    invoiceNumber?: string;
    hostedUrl?: string;
  }>({});

  // Product search states - separate for each product
  const [productSearchStates, setProductSearchStates] = useState<{
    [key: number]: {
      query: string;
      options: ProductOption[];
      isSearching: boolean;
      showDropdown: boolean;
    };
  }>({});
  const [priceOptions, setPriceOptions] = useState<{
    [key: number]: PriceOption[];
  }>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState<{
    [key: number]: boolean;
  }>({});

  // Coupon states
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customerId: "",
    products: [
      {
        product_id: "",
        name: "",
        price_id: "",
        price: "",
        quantity: 1,
        total: 0,
      },
    ],
    dueDate: "",
    coupon: "",
    agentName: "",
    totalPrice: 0,
  });

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  // Add state for country code
  const [countryCode, setCountryCode] = useState("+1");
  const siteOptions: SiteOption[] = [
    { name: "OSHA OUTREACH COURSES", code: "001" },
    { name: "OSHA ONLINE CENTER", code: "002" },
    { name: "OSHA EDUCATION SCHOOL", code: "003" },
    { name: "OSHA PRO", code: "004" },
  ];

  // Get site code from site name
  const getSiteCode = (siteName: string) => {
    const site = siteOptions.find((s) => s.name === siteName);
    return site ? site.code : "";
  };

  // Initialize product search state for a specific product
  const initializeProductSearchState = (productIndex: number) => {
    setProductSearchStates((prev) => ({
      ...prev,
      [productIndex]: {
        query: "",
        options: [],
        isSearching: false,
        showDropdown: false,
      },
    }));
  };

  // Debounced product search for specific product
  const debounceProductSearch = useCallback(
    debounce(async (query: string, siteCode: string, productIndex: number) => {
      if (!query.trim() || query.length < 2) {
        setProductSearchStates((prev) => ({
          ...prev,
          [productIndex]: {
            ...prev[productIndex],
            options: [],
            showDropdown: false,
          },
        }));
        return;
      }

      setProductSearchStates((prev) => ({
        ...prev,
        [productIndex]: {
          ...prev[productIndex],
          isSearching: true,
        },
      }));

      try {
        const response = await fetch(
          "https://freeoshacourses.com/api/api_search_products.php",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              site_name: siteCode,
              q: query,
            }),
          }
        );

        const result = await response.json();
        if (result.status && result.data) {
          setProductSearchStates((prev) => ({
            ...prev,
            [productIndex]: {
              ...prev[productIndex],
              options: result.data,
              showDropdown: true,
              isSearching: false,
            },
          }));
        } else {
          setProductSearchStates((prev) => ({
            ...prev,
            [productIndex]: {
              ...prev[productIndex],
              options: [],
              showDropdown: false,
              isSearching: false,
            },
          }));
        }
      } catch (error) {
        console.error("Error searching products:", error);
        setProductSearchStates((prev) => ({
          ...prev,
          [productIndex]: {
            ...prev[productIndex],
            options: [],
            showDropdown: false,
            isSearching: false,
          },
        }));
      }
    }, 300),
    []
  );

  // Load prices for selected product
  const loadProductPrices = async (productId: string, productIndex: number) => {
    if (!productId) return;

    setIsLoadingPrices((prev) => ({ ...prev, [productIndex]: true }));
    try {
      const response = await fetch(
        "https://freeoshacourses.com/api/api_search_products_price.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: productId,
          }),
        }
      );

      const result = await response.json();
      if (result.status && result.data) {
        setPriceOptions((prev) => ({ ...prev, [productIndex]: result.data }));
      } else {
        setPriceOptions((prev) => ({ ...prev, [productIndex]: [] }));
        console.error("Error loading prices:", result.error);
      }
    } catch (error) {
      console.error("Error loading prices:", error);
      setPriceOptions((prev) => ({ ...prev, [productIndex]: [] }));
    } finally {
      setIsLoadingPrices((prev) => ({ ...prev, [productIndex]: false }));
    }
  };

  // Load coupons for site
  const loadCoupons = async (siteCode: string) => {
    if (!siteCode) return;

    setIsLoadingCoupons(true);
    try {
      const response = await fetch(
        "https://freeoshacourses.com/api/api_get_coupon.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_name: siteCode,
          }),
        }
      );

      const result = await response.json();
      if (result.status && result.data) {
        setCouponOptions(result.data);
      } else {
        setCouponOptions([]);
        console.error("Error in coupons result:", result.error);
      }
    } catch (error) {
      console.error("Error loading coupons:", error);
      setCouponOptions([]);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  // Load agent name from session using useApp hook
  const loadAgentName = () => {
    if (session?.full_name) {
      // console.log("Agent Name: ", session.full_name);
      setInvoiceData((prev) => ({ ...prev, agentName: session.full_name }));
    }
  };

  // Effect to load coupons and agent when reaching step 3
  useEffect(() => {
    if (step === 3) {
      const siteCode = getSiteCode(formData.siteName);
      loadCoupons(siteCode);
      loadAgentName();
      // Initialize search state for first product
      initializeProductSearchState(0);
    }
  }, [step, formData.siteName]);

  const handleCreateInvoice = () => {
    setShowModal(true);
    setStep(1);
    setFormData(getInitialFormData());
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle contact number change with country code
  const handleContactNoChange = (value: string) => {
    const cleanValue = value.replace(/^\+\d{1,3}\s?/, "");
    const fullContactNo = `${countryCode} ${cleanValue}`;
    setFormData((prev) => ({
      ...prev,
      contactNo: fullContactNo,
    }));
  };

  // Handle country code change
  const handleCountryCodeChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    if (formData.contactNo) {
      const cleanValue = formData.contactNo.replace(/^\+\d{1,3}\s?/, "");
      const fullContactNo = `${newCountryCode} ${cleanValue}`;
      setFormData((prev) => ({
        ...prev,
        contactNo: fullContactNo,
      }));
    }
  };

  const handleCheckCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.siteName || !formData.email) {
      alert("Please select a site name and enter an email address");
      return;
    }
    setIsChecking(true);
    try {
      // Use GET request with query parameters for checking customer
      const params = new URLSearchParams({
        email: formData.email,
        siteName: formData.siteName,
      });

      const response = await fetch(`/api/customers?${params.toString()}`, {
        method: "GET",
      });

      const result = await response.json();

      if (response.ok) {
        if (result.exists) {
          setCustomerExists(true);
          // console.log("User Found:", result);
          setFormData((prev) => ({
            ...prev,
            fullName: result.customer?.fullName || "",
            contactNo: result.customer?.contactNo || "",
          }));
        } else {
          setCustomerExists(false);
          // Clear previous customer data when customer doesn't exist
          setFormData((prev) => ({
            ...prev,
            fullName: "",
            contactNo: "",
          }));
        }

        setStep(2);
      } else {
        console.error("API checking customer Error:", result.error);
      }
    } catch (error) {
      console.error("Failed to check customer. Please try again.", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      let customerData;

      if (!customerExists) {
        customerData = {
          site_name: getSiteCode(formData.siteName), // isko dekhna hai
          email: formData.email,
          contactNo: formData.contactNo,
          send_invoice: formData.sendInvoice ? 1 : 0,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          userType: formData.userType,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          zipCode: formData.zipCode,
          company: formData.company,
        };

        // console.log("Creating new customer in db:", customerData);
      } else {
        // Existing customer data
        customerData = {
          site_name: getSiteCode(formData.siteName),
          email: formData.email,
          fullName: formData.fullName,
          contactNo: formData.contactNo,
          send_invoice: formData.sendInvoice ? 1 : 0,
        };
      }

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (!result.customerId) {
          throw new Error("Customer ID not received from API");
        }
        setInvoiceData((prev) => ({
          ...prev,
          customerId: result.customerId,
        }));
        // console.log("Customer processed successfully:", result);
      } else {
        throw new Error(
          result.error || result.message || "Failed to process customer"
        );
      }
    } catch (error) {
      console.error("Error processing customer:", error);
      alert(
        `Failed to process customer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsCreating(false);
      return;
    }
    setIsCreating(false);

    setStep(3);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep(1);
    setCustomerExists(false);
    setFormData(getInitialFormData());
    setInvoiceData({
      customerId: "",
      products: [
        {
          product_id: "",
          name: "",
          price_id: "",
          price: "",
          quantity: 1,
          total: 0,
        },
      ],
      dueDate: "",
      coupon: "",
      agentName: "",
      totalPrice: 0,
    });
    setProductSearchStates({});
    setPriceOptions({});
    setIsLoadingPrices({});
    setCouponOptions([]);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setCustomerExists(false);
      // Clear only customer data when going back to step 1
      setFormData((prev) => ({
        ...prev,
        fullName: "",
        contactNo: "",
      }));
    }
    // Note: No back option from step 3 to step 2 as requested
  };

  // Calculate total price with coupon discount
  const calculateTotalPrice = useCallback(
    (products: InvoiceProduct[], coupon?: string) => {
      const subtotal = products.reduce(
        (sum, product) => sum + product.total,
        0
      );
      let totalPrice = subtotal;

      // Apply coupon discount
      const selectedCoupon = couponOptions.find(
        (c) => c.id === (coupon || invoiceData.coupon)
      );
      if (selectedCoupon) {
        if (selectedCoupon.percent_off) {
          const discount =
            Math.floor(((subtotal * selectedCoupon.percent_off) / 100) * 100) /
            100;
          totalPrice = subtotal - discount;
        } else if (selectedCoupon.amount_off) {
          totalPrice = Math.max(0, subtotal - selectedCoupon.amount_off);
        }
      }

      setInvoiceData((prev) => ({
        ...prev,
        totalPrice: totalPrice,
      }));
    },
    [couponOptions, invoiceData.coupon]
  );

  const handleInvoiceInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => {
      const updated = { ...prev, [name]: value };

      // Immediately recalculate total when coupon changes
      if (name === "coupon") {
        setTimeout(() => calculateTotalPrice(updated.products, value), 0);
      }

      return updated;
    });
  };

  // Handle product search input for specific product
  const handleProductSearchChange = (value: string, productIndex: number) => {
    // Initialize search state if not exists
    if (!productSearchStates[productIndex]) {
      initializeProductSearchState(productIndex);
    }

    // Update search state for this specific product
    setProductSearchStates((prev) => ({
      ...prev,
      [productIndex]: {
        ...prev[productIndex],
        query: value,
      },
    }));

    // Update the product name in the specified product
    const updatedProducts = [...invoiceData.products];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      name: value,
      product_id: "", // Clear product_id when typing
      price_id: "", // Clear price_id when typing
      price: "", // Clear price when typing
      total: 0,
    };

    setInvoiceData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));

    // Clear prices for this specific product when search changes
    setPriceOptions((prev) => ({ ...prev, [productIndex]: [] }));

    // Trigger search for this specific product
    if (value.trim() && value.length >= 2) {
      const siteCode = getSiteCode(formData.siteName);
      debounceProductSearch(value, siteCode, productIndex);
    } else {
      setProductSearchStates((prev) => ({
        ...prev,
        [productIndex]: {
          ...prev[productIndex],
          options: [],
          showDropdown: false,
        },
      }));
    }
    calculateTotalPrice(updatedProducts);
  };

  // Handle product selection from dropdown for specific product
  const handleProductSelect = (
    product: ProductOption,
    productIndex: number
  ) => {
    const updatedProducts = [...invoiceData.products];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      product_id: product.product_id,
      name: product.product_name,
      price_id: "", // Reset price selection
      price: "", // Reset price
      total: 0,
    };

    setInvoiceData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));

    // Update search state for this specific product
    setProductSearchStates((prev) => ({
      ...prev,
      [productIndex]: {
        ...prev[productIndex],
        query: product.product_name,
        showDropdown: false,
        options: [],
      },
    }));

    // Load prices for this specific product
    loadProductPrices(product.product_id, productIndex);

    // Recalculate total
    calculateTotalPrice(updatedProducts);
  };

  // Handle price selection
  const handlePriceSelect = (
    priceId: string,
    displayName: string,
    unitPrice: number,
    productIndex: number = 0
  ) => {
    const updatedProducts = [...invoiceData.products];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      price_id: priceId,
      price: displayName,
      total: unitPrice * updatedProducts[productIndex].quantity,
    };

    setInvoiceData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));

    // Recalculate total immediately
    calculateTotalPrice(updatedProducts);
  };

  const handleProductChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updatedProducts = [...invoiceData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
    };

    // Calculate total for this product
    if (field === "quantity") {
      const currentPriceOptions = priceOptions[index] || [];
      const priceOption = currentPriceOptions.find(
        (p) => p.price_id === updatedProducts[index].price_id
      );
      const unitPrice = priceOption ? priceOption.unit_price : 0;
      const quantity = parseInt(value as string) || 0;
      updatedProducts[index].total = unitPrice * quantity;
    }

    setInvoiceData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));

    // Recalculate total with coupon immediately
    calculateTotalPrice(updatedProducts);
  };

  const addProduct = () => {
    const newIndex = invoiceData.products.length;
    setInvoiceData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          product_id: "",
          name: "",
          price_id: "",
          price: "",
          quantity: 1,
          total: 0,
        },
      ],
    }));

    // Initialize search state for new product
    initializeProductSearchState(newIndex);
  };

  // Remove product (for products after the first one)
  const removeProduct = (index: number) => {
    if (index === 0) return; // Cannot remove first product

    const updatedProducts = invoiceData.products.filter((_, i) => i !== index);
    setInvoiceData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));

    // Remove search state and price options for this product
    setProductSearchStates((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });

    setPriceOptions((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });

    setIsLoadingPrices((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });

    // Recalculate total
    calculateTotalPrice(updatedProducts);
  };

  const createInvoice = async () => {
    if (!session) {
      alert("Please log in to create invoices");
      return;
    }
    if (!invoiceData.dueDate || invoiceData.dueDate.trim() === "") {
      alert("Please select a due date before creating the invoice");
      return;
    }

    // Prevent past due date
    const today = new Date();
    const selected = new Date(invoiceData.dueDate);
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    if (selected < today) {
      alert("Due date cannot be in the past.");
      return;
    }

    if (
      !invoiceData.products[0].product_id ||
      !invoiceData.products[0].price_id
    ) {
      alert("Please select a product and price before creating the invoice");
      return;
    }

    setIsCreatingInvoice(true);
    try {
      // Calculate subtotal and discount
      const subtotal = invoiceData.products.reduce(
        (sum, product) => sum + product.total,
        0
      );
      let discount = 0;

      // Calculate discount based on coupon
      const selectedCoupon = couponOptions.find(
        (c) => c.id === invoiceData.coupon
      );
      let percentOffString = "";
      if (selectedCoupon) {
        if (selectedCoupon.percent_off) {
          discount =
            Math.floor(subtotal * (selectedCoupon.percent_off / 100) * 100) /
            100;
          percentOffString = `${selectedCoupon.percent_off}%`;
        } else if (selectedCoupon.amount_off) {
          discount = selectedCoupon.amount_off;
        }
      }

      const finalTotal = subtotal - discount;

      // Prepare invoice data for API
      const invoiceApiData: CreateInvoiceApiRequest = {
        customerId: invoiceData.customerId,
        customerEmail: formData.email,
        siteName: formData.siteName,
        products: invoiceData.products,
        dueDate: invoiceData.dueDate,
        coupon: invoiceData.coupon,
        agentName: session.full_name,
        agentId: session._id.toString(),
        subtotal: subtotal,
        discount: discount,
        totalPrice: finalTotal,
        percent_off: percentOffString,
        hostedUrl: "",
      };

      const response = await fetch("/api/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceApiData),
      });

      const result: CreateInvoiceApiResponse = await response.json();

      console.log("Response of Invoice Api", result);
      if (response.ok && result.success) {
        // Show static success overlay instead of alert
        setShowModal(false);
        setShowSuccess(true);
        setSuccessData({
          invoiceNumber: result.invoiceNumber,
          hostedUrl: result.hostedUrl ?? undefined,
        });
        setStep(1);
        setCustomerExists(false);
        setFormData(getInitialFormData());
        setInvoiceData({
          customerId: "",
          products: [
            {
              product_id: "",
              name: "",
              price_id: "",
              price: "",
              quantity: 1,
              total: 0,
            },
          ],
          dueDate: "",
          coupon: "",
          agentName: "",
          totalPrice: 0,
        });
        setProductSearchStates({});
        setPriceOptions({});
        setIsLoadingPrices({});
        setCouponOptions([]);
      } else {
        throw new Error(
          result.error || result.message || "Failed to create invoice"
        );
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert(
        `Failed to create invoice: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // 2. Auto-select price if only one price option
  useEffect(() => {
    invoiceData.products.forEach((product, index) => {
      const options = priceOptions[index];
      if (
        product.product_id &&
        options &&
        options.length === 1 &&
        product.price_id !== options[0].price_id
      ) {
        handlePriceSelect(
          options[0].price_id,
          options[0].display_name,
          options[0].unit_price,
          index
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceOptions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-10 max-w-md w-full flex flex-col items-center">
            <Check size={48} className="text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Invoice Created Successfully!
            </h2>
            {successData.invoiceNumber && (
              <p className="text-lg text-gray-700 mb-4">
                Invoice Number:{" "}
                <span className="font-mono text-blue-700">
                  {successData.invoiceNumber}
                </span>
              </p>
            )}
            <button
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-md shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              onClick={() => setShowSuccess(false)}
            >
              Back to Invoices
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            Invoice Management
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Create, manage, and track your invoices with ease
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Big Creative Button */}
          <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Animated Background Blur */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

            {/* Main Button */}
            <button
              onClick={handleCreateInvoice}
              className="relative px-12 py-8 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-bold text-xl md:text-2xl rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25 active:scale-95 group"
            >
              {/* Button Content */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Plus
                    size={32}
                    className={`transition-all duration-300 ${
                      isHovered ? "rotate-90 scale-110" : "rotate-0"
                    }`}
                  />
                  <Sparkles
                    size={16}
                    className="absolute -top-2 -right-2 text-yellow-300 animate-pulse"
                  />
                </div>
                <span className="relative">
                  Create New Invoice
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-300 transition-all duration-300 group-hover:w-full"></span>
                </span>
                <FileText
                  size={32}
                  className={`transition-all duration-300 ${
                    isHovered ? "translate-x-2" : "translate-x-0"
                  }`}
                />
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </button>
          </div>

          {/* Secondary Actions */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            <button className="group relative overflow-hidden px-8 py-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500">
              <div className="flex items-center justify-center space-x-3">
                <FileText
                  size={24}
                  className="text-blue-600 group-hover:text-blue-700 transition-colors"
                />
                <span className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  View All Invoices
                </span>
              </div>
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-full"></div>
            </button>

            <button className="group relative overflow-hidden px-8 py-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-green-400 dark:hover:border-green-500">
              <div className="flex items-center justify-center space-x-3">
                <Download
                  size={24}
                  className="text-green-600 group-hover:text-green-700 transition-colors"
                />
                <span className="font-semibold text-gray-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  Download Reports
                </span>
              </div>
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 group-hover:w-full"></div>
            </button>
          </div> */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <FileText size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Professional Templates
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Choose from beautifully designed invoice templates
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <Download size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Easy Export
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Export invoices as PDF or send via email instantly
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Smart Automation
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Automate recurring invoices and payment reminders
              </p>
            </div>
          </div> */}
        </div>
      </div>

      {/* Create Stripe Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`bg-white rounded-lg shadow-2xl ${
              step === 3
                ? "max-w-4xl w-full"
                : step === 2
                ? "w-[850px] max-w-[90vw]"
                : "max-w-md w-full"
            } mx-4 overflow-hidden ${step === 2 ? "max-h-[80vh]" : ""}`}
            style={step === 2 ? { minHeight: "250px", maxHeight: "80vh" } : {}}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white text-xl font-bold">
                {step === 1
                  ? "Create Stripe Customer"
                  : step === 2
                  ? "Customer Details"
                  : "Create Invoice"}
                {/* {step === 3 && (
                  <span className="text-sm font-normal ml-2">
                    Customer ID: {invoiceData.customerId}
                  </span>
                )} */}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              className={`p-6 ${
                step === 2 ? "overflow-y-auto max-h-[calc(80vh-80px)]" : ""
              }`}
            >
              {step === 1 ? (
                // Step 1: Site Name and Email
                <form onSubmit={handleCheckCustomer} className="space-y-6">
                  {/* Site Name Field */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Site Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="siteName"
                        value={formData.siteName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-blue-300 rounded-md focus:outline-none focus:border-blue-500 pr-10 appearance-none bg-white"
                        required
                      >
                        <option value="">— Select a site —</option>
                        {siteOptions.map((site) => (
                          <option key={site.code} value={site.name}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <ChevronDown size={20} className="text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  {/* Check Customer Button */}
                  <button
                    type="submit"
                    disabled={isChecking}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  >
                    {isChecking ? "Checking Customer..." : "Check Customer"}
                  </button>
                </form>
              ) : step === 2 ? (
                // Step 2: Customer Details
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Status */}
                  {customerExists ? (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <p className="text-green-800 font-medium">
                        ✓ Existing customer found
                      </p>
                      {/* <p className="text-green-600 text-sm">
                        Details loaded automatically
                      </p> */}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-blue-800 font-medium">New customer</p>
                      <p className="text-blue-600 text-sm">
                        Please fill in the details below
                      </p>
                    </div>
                  )}

                  {customerExists ? (
                    // Existing customer - simple form
                    <>
                      {/* Full Name Field */}
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          disabled={customerExists}
                          className="w-full px-4 py-3 border-2 border-green-500 bg-green-50 text-green-800 cursor-not-allowed rounded-md focus:outline-none"
                          placeholder="John Doe"
                          required
                        />
                        <p className="text-green-600 text-sm mt-1">
                          ✓ Auto-filled from existing customer
                        </p>
                      </div>

                      {/* Phone Number Field */}
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          Contact No
                        </label>
                        <input
                          type="tel"
                          name="contactNo"
                          value={formData.contactNo}
                          onChange={handleInputChange}
                          disabled={customerExists}
                          className="w-full px-4 py-3 border-2 border-green-500 bg-green-50 text-green-800 cursor-not-allowed rounded-md focus:outline-none"
                          placeholder="+1 (555) 123-4567"
                        />
                        {formData.contactNo && (
                          <p className="text-green-600 text-sm mt-1">
                            ✓ Auto-filled from existing customer
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    // New customer
                    <>
                      {/* Account Details Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Account Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <input
                              type="text"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="First Name*"
                              autoComplete="given-name"
                              required
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="Last Name*"
                              autoComplete="family-name"
                              required
                            />
                          </div>
                          <div>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-sm"
                              placeholder="Email*"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div>
                            <input
                              type="password"
                              name="password"
                              value="Apple@123!"
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-sm"
                              placeholder="Password*"
                            />
                          </div>
                          <div>
                            <select
                              name="userType"
                              value={formData.userType}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              required
                            >
                              <option value="">Select User Role*</option>
                              <option value="manager">Manager</option>
                              <option value="individual">Individual</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details Section */}
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Contact Details
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex gap-2">
                            <select
                              className="px-3 py-2 border rounded-md w-28"
                              value={countryCode}
                              onChange={(e) =>
                                handleCountryCodeChange(e.target.value)
                              }
                            >
                              <option value="+1">🇺🇸 +1</option>
                              <option value="+44">🇬🇧 +44</option>
                              <option value="+91">🇮🇳 +91</option>
                              <option value="+92">🇵🇰 +92</option>
                              <option value="+61">🇦🇺 +61</option>
                              <option value="+33">🇫🇷 +33</option>
                              <option value="+49">🇩🇪 +49</option>
                              <option value="+86">🇨🇳 +86</option>
                              <option value="+81">🇯🇵 +81</option>
                              <option value="+82">🇰🇷 +82</option>
                            </select>
                            <input
                              type="tel"
                              name="contactNo"
                              className="px-3 py-2 border rounded-md flex-1"
                              placeholder="Contact Number"
                              value={
                                formData.contactNo
                                  ? formData.contactNo.replace(
                                      /^\+\d{1,3}\s?/,
                                      ""
                                    )
                                  : ""
                              }
                              onChange={(e) =>
                                handleContactNoChange(e.target.value)
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div>
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="Address"
                              autoComplete="street-address"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="City"
                              autoComplete="address-level2"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="State"
                              autoComplete="address-level1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div>
                            <input
                              type="text"
                              name="country"
                              value={formData.country}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="Country"
                              autoComplete="country"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              name="zipCode"
                              value={formData.zipCode}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="ZipCode"
                              autoComplete="postal-code"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              name="company"
                              value={formData.company}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                              placeholder="Company"
                              autoComplete="organization"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Send Invoice Checkbox */}
                  <div className="flex items-center space-x-3 mt-4">
                    <input
                      type="checkbox"
                      id="sendInvoice"
                      name="sendInvoice"
                      checked={formData.sendInvoice}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sendInvoice: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="sendInvoice"
                      className="text-gray-700 font-medium text-sm"
                    >
                      Send (email) invoice to customer
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 rounded-md transition-all duration-300 text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-2 rounded-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-sm"
                    >
                      {isCreating
                        ? "Creating Customer..."
                        : "Continue to Invoice"}
                    </button>
                  </div>
                </form>
              ) : (
                // Step 3: Invoice Creation Screen
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4 pr-2">
                    {/* Product Selection */}
                    {invoiceData.products.map((product, index) => (
                      <div
                        key={index}
                        className="space-y-3 p-3 border rounded-lg bg-gray-50"
                      >
                        {/* Product Header with Remove Button */}
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800 text-sm">
                            Product {index + 1}
                          </h4>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="flex items-center justify-center w-6 h-6 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                              title="Remove Product"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-3 items-end">
                          {/* Product Search */}
                          <div className="col-span-5 relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Search Product{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Type to search products..."
                                value={
                                  productSearchStates[index]?.query ||
                                  product.name
                                }
                                onChange={(e) => {
                                  handleProductSearchChange(
                                    e.target.value,
                                    index
                                  );
                                }}
                                className="w-full px-2 py-1.5 pr-6 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-xs"
                              />
                              <Search
                                size={14}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                              />

                              {/* Loading indicator */}
                              {productSearchStates[index]?.isSearching && (
                                <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                            </div>

                            {/* Product Dropdown */}
                            {productSearchStates[index]?.showDropdown &&
                              productSearchStates[index]?.options.length >
                                0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                  {productSearchStates[index]?.options.map(
                                    (option) => (
                                      <button
                                        key={option.product_id}
                                        type="button"
                                        onClick={() =>
                                          handleProductSelect(option, index)
                                        }
                                        className="w-full px-2 py-1.5 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-xs"
                                      >
                                        {option.product_name}
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                          </div>

                          {/* Price Selection */}
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Price <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={product.price_id}
                              onChange={(e) => {
                                const currentPriceOptions =
                                  priceOptions[index] || [];
                                const selectedPrice = currentPriceOptions.find(
                                  (p) => p.price_id === e.target.value
                                );
                                if (selectedPrice) {
                                  handlePriceSelect(
                                    selectedPrice.price_id,
                                    selectedPrice.display_name,
                                    selectedPrice.unit_price,
                                    index
                                  );
                                }
                              }}
                              disabled={
                                !product.product_id || isLoadingPrices[index]
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {isLoadingPrices[index]
                                  ? "Loading..."
                                  : !product.product_id
                                  ? "Select product first"
                                  : "— Select price —"}
                              </option>
                              {(priceOptions[index] || []).map(
                                (priceOption) => (
                                  <option
                                    key={priceOption.price_id}
                                    value={priceOption.price_id}
                                  >
                                    {priceOption.display_name}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={product.quantity}
                              onChange={(e) =>
                                handleProductChange(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-xs"
                              min="0"
                              disabled={!product.price_id}
                            />
                          </div>

                          {/* Total */}
                          <div className="col-span-2 text-right">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <span className="text-sm font-semibold text-green-600">
                              ${product.total.toFixed(2)}
                            </span>
                            {/* Show discounted price if coupon is applied */}
                            {invoiceData.coupon &&
                              (() => {
                                const selectedCoupon = couponOptions.find(
                                  (c) => c.id === invoiceData.coupon
                                );
                                let discounted = product.total;
                                if (selectedCoupon?.percent_off) {
                                  discounted =
                                    Math.floor(
                                      product.total *
                                        (1 - selectedCoupon.percent_off / 100) *
                                        100
                                    ) / 100;
                                } else if (selectedCoupon?.amount_off) {
                                  // Distribute amount_off proportionally (optional: here, just show full amount_off on first product)
                                  if (index === 0) {
                                    discounted = Math.max(
                                      0,
                                      product.total - selectedCoupon.amount_off
                                    );
                                  }
                                }
                                if (discounted !== product.total) {
                                  return (
                                    <div className="text-xs text-blue-600 font-medium mt-1">
                                      After Discount: ${discounted.toFixed(2)}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Another Product */}
                    <button
                      type="button"
                      onClick={addProduct}
                      className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xs"
                    >
                      <Plus size={14} />
                      <span>Add Another Product</span>
                    </button>

                    {/* Subtotal and Discount */}
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Subtotal:</span>
                        <span>
                          $
                          {invoiceData.products
                            .reduce((sum, product) => sum + product.total, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      {invoiceData.coupon && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span className="font-medium">Discount:</span>
                          <span>
                            {(() => {
                              const selectedCoupon = couponOptions.find(
                                (c) => c.id === invoiceData.coupon
                              );
                              const subtotal = invoiceData.products.reduce(
                                (sum, product) => sum + product.total,
                                0
                              );
                              if (selectedCoupon?.percent_off) {
                                const discount =
                                  Math.floor(
                                    ((subtotal * selectedCoupon.percent_off) /
                                      100) *
                                      100
                                  ) / 100;
                                return `-$${discount.toFixed(2)} (${
                                  selectedCoupon.percent_off
                                }%)`;
                              } else if (selectedCoupon?.amount_off) {
                                return `-$${selectedCoupon.amount_off.toFixed(
                                  2
                                )}`;
                              }
                              return "";
                            })()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold text-blue-800 border-t pt-2">
                        <span>Total Price:</span>
                        <span>${invoiceData.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Due Date & Apply Coupon */}
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                          Due Date:
                        </label>
                        <input
                          type="date"
                          name="dueDate"
                          value={invoiceData.dueDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={handleInvoiceInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                          Apply Coupon:
                        </label>
                        <select
                          name="coupon"
                          value={invoiceData.coupon}
                          onChange={handleInvoiceInputChange}
                          disabled={isLoadingCoupons}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                        >
                          <option value="">
                            {isLoadingCoupons
                              ? "Loading coupons..."
                              : "— No Coupon —"}
                          </option>
                          {couponOptions.map((coupon) => (
                            <option key={coupon.id} value={coupon.id}>
                              {coupon.name} (
                              {coupon.percent_off
                                ? `${coupon.percent_off}% off`
                                : `$${coupon.amount_off} off`}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Agent Name */}
                    {/* <div>
                      <label className="block text-gray-700 font-medium mb-2 text-sm">
                        Agent Name:
                      </label>
                      <input
                        type="text"
                        name="agentName"
                        value={invoiceData.agentName}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                        placeholder="Agent name will be loaded from session"
                      />
                    </div> */}

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={createInvoice}
                        disabled={
                          !invoiceData.products[0].product_id ||
                          !invoiceData.products[0].price_id ||
                          invoiceData.products[0].quantity === 0 ||
                          !invoiceData.dueDate ||
                          isCreatingInvoice
                        }
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                      >
                        {isCreatingInvoice
                          ? "Creating Invoice..."
                          : "Create Invoice"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
