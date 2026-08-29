"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { resolveAssetUrl } from "@/lib/config";
import { uploadWithProgress } from "@/lib/uploadWithProgress";
import { INDIAN_STATE_NAMES, INDIAN_STATES_CITIES, isCityInStateList } from "@/lib/indianLocations";
import { ReceiptData, downloadReceiptPdf, getReceiptPublicUrl } from "@/lib/receipt";
import "./slot-booking.css";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Course {
  id: number;
  title: string;
  slug?: string;
  price?: number | null;
  discount_price?: number | null;
  is_free?: boolean;
  currency?: string | null;
  min_payment_type?: string | null;
  min_payment_value?: number | null;
  full_payment_discount_type?: string | null;
  full_payment_discount_value?: number | null;
  full_payment_discount_valid_till?: string | null;
}

interface Batch {
  id: number;
  name: string;
  mode?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  max_capacity: number;
  seats_available: number;
  enrolled_count: number;
  enable_waitlist: boolean;
}

interface SlotBookingConfig {
  razorpay_key_id?: string | null;
  currency?: string;
  is_test_mode?: boolean;
  google_map_api_key?: string | null;
  enable_google_login?: boolean;
  google_client_id?: string | null;
  site_name?: string | null;
  logo_url?: string | null;
  founder_name?: string | null;
  founder_designation?: string | null;
  founder_signature_url?: string | null;
}


const STUDENT_CATEGORIES = [
  "Business Owner",
  "Working Professional",
  "Students after 12th",
  "Student After Graduation",
  "Others",
];

const STEPS = ["Details", "Batch", "Pay", "Done"];

/* ─────────────────────────────────────────
   Icons
───────────────────────────────────────── */
const Icon = {
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Check: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 50, strokeDashoffset: 0 }}><polyline points="20 6 9 17 4 12"/></svg>,
  Camera: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  Location: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Calendar: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  ArrowLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7M19 12H5"/></svg>,
  ArrowRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  GoogleIcon: () => (
    <svg className="sb-google-icon" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────
   Helper: format currency
───────────────────────────────────────── */
function formatCurrency(amount: number, currency: string = "INR") {
  if (currency === "INR" || currency === "₹") {
    return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ─────────────────────────────────────────
   Countdown Timer Hook
───────────────────────────────────────── */
function useCountdown(validTill: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });

  useEffect(() => {
    if (!validTill) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }
    const target = new Date(validTill).getTime();
    if (isNaN(target)) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isExpired: false,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [validTill]);

  return timeLeft;
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
interface SlotBookingDrawerProps {
  open: boolean;
  onClose: () => void;
  course: Course | null;
}

export default function SlotBookingDrawer({ open, onClose, course }: SlotBookingDrawerProps) {
  const [step, setStep] = useState(0); // 0=Details, 1=Batch, 2=Pay, 3=Success
  const [config, setConfig] = useState<SlotBookingConfig | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payMode, setPayMode] = useState<"booking" | "full">("booking");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Form state
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [qualification, setQualification] = useState("");
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [address, setAddress] = useState("");
  const [cityNotInList, setCityNotInList] = useState(false);
  const [locating, setLocating] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [allowEmail, setAllowEmail] = useState(true);
  const [allowPush, setAllowPush] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<number | "">("");
  const [showLocation, setShowLocation] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const razorpayScriptLoaded = useRef(false);
  const locationAutoTriggeredRef = useRef(false);

  // Reset & init when opened
  useEffect(() => {
    if (open && course) {
      setStep(0);
      setError("");
      setReceipt(null);
      setSelectedCourseId(course.id);
      setAddress("");
      setCityNotInList(false);
      setAgreeTerms(true);
      setAllowEmail(true);
      setAllowPush(true);
      setPayMode("booking");
      locationAutoTriggeredRef.current = false;
      fetchConfig();
      fetchCourses();
    }
  }, [open, course]);

  // Fetch batches when course changes or step=1 (Batch step)
  useEffect(() => {
    if (open && step === 1 && selectedCourseId) {
      fetchBatches(selectedCourseId);
    }
  }, [open, step, selectedCourseId]);

  // Auto-detect location once when the drawer opens and config is loaded
  useEffect(() => {
    if (open && !locating && config && !locationAutoTriggeredRef.current) {
      locationAutoTriggeredRef.current = true;
      handleDetectLocation();
    }
  }, [open, locating, config]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiFetch("/api/public/slot-booking/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await apiFetch("/api/public/slot-booking/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchBatches = useCallback(async (cid: number) => {
    setBatchesLoading(true);
    try {
      const res = await apiFetch(`/api/public/slot-booking/courses/${cid}/batches`);
      if (res.ok) {
        const data = await res.json();
        setBatches(Array.isArray(data) ? data : []);
      }
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  // ── Photo Upload ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await uploadWithProgress("/api/public/slot-booking/upload-photo", formData, (pct) => setPhotoProgress(pct));
      if (result.ok && result.data?.url) {
        setPhotoUrl(result.data.url);
      } else {
        setError(result.error || "Photo upload failed");
      }
    } catch (err: any) {
      setError("Photo upload failed: " + (err.message || "Unknown error"));
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Google Maps Location ──
  const handleDetectLocation = () => {
    locationAutoTriggeredRef.current = true;
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const apiKey = config?.google_map_api_key;
        if (!apiKey) {
          // Fallback: no API key — store lat/lng so user can fill manually
          setError("Google Maps API key is not configured. Please enter your location manually.");
          setLocating(false);
          return;
        }
        try {
          // Use result_type=street_address to get the most precise result first,
          // and location_type=ROOFTOP to request the most accurate available.
          // Google will still fall back to approximate if rooftop isn't available.
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&result_type=street_address|premise|subpremise|point_of_interest&location_type=ROOFTOP|RANGE_INTERPOLATED&key=${apiKey}`
          );
          const data = await res.json();

          // If the precise query returns no results, fall back to the standard query
          if (!data.results || data.results.length === 0) {
            const fallbackRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const fallbackData = await fallbackRes.json();
            data.results = fallbackData.results || [];
          }

          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;

            let foundCity = "", foundState = "", foundPin = "";
            let streetNumber = "", route = "", premise = "", subpremise = "";
            let sublocalityL1 = "", sublocalityL2 = "", sublocalityL3 = "", neighborhood = "";

            for (const c of components) {
              const types = c.types;
              // City: prefer "locality", then "administrative_area_level_3", then "postal_town"
              if (types.includes("locality")) foundCity = c.long_name;
              else if (types.includes("administrative_area_level_3") && !foundCity) foundCity = c.long_name;
              else if (types.includes("postal_town") && !foundCity) foundCity = c.long_name;
              // If still no city, use administrative_area_level_2 as last resort
              else if (types.includes("administrative_area_level_2") && !foundCity) foundCity = c.long_name;

              if (types.includes("administrative_area_level_1")) foundState = c.long_name;
              if (types.includes("postal_code")) foundPin = c.long_name;
              if (types.includes("street_number")) streetNumber = c.long_name;
              if (types.includes("route")) route = c.long_name;
              if (types.includes("premise")) premise = c.long_name;
              if (types.includes("subpremise")) subpremise = c.long_name;
              if (types.includes("sublocality_level_1")) sublocalityL1 = c.long_name;
              if (types.includes("sublocality_level_2")) sublocalityL2 = c.long_name;
              if (types.includes("sublocality_level_3")) sublocalityL3 = c.long_name;
              if (types.includes("neighborhood")) neighborhood = c.long_name;
            }

            // Build the most accurate address possible from granular components.
            // Order: premise/subpremise → street_number → route → sublocality_l3 → l2 → l1 → neighborhood
            const addressParts = [
              premise,
              subpremise,
              streetNumber,
              route,
              sublocalityL3,
              sublocalityL2,
              sublocalityL1,
              neighborhood,
            ].filter(Boolean);
            let foundAddress = addressParts.join(", ");

            // Fallback: if no granular parts, use formatted_address but strip ", India" suffix
            if (!foundAddress) {
              foundAddress = (result.formatted_address || "").replace(/,\s*India\s*$/i, "").trim();
            }

            setAddress(foundAddress);
            setCity(foundCity || "");
            setStateName(foundState || "");
            setPinCode(foundPin || "");

            // Check if city is in our JSON list for the detected state
            if (foundState && foundCity && !isCityInStateList(foundState, foundCity)) {
              setCityNotInList(true);
            } else {
              setCityNotInList(false);
            }
          } else {
            setError("Could not determine your address from this location. Please enter manually.");
          }
        } catch {
          setError("Could not fetch location details. Please enter manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        // Show specific error messages based on error code
        let msg = "Could not detect your location.";
        if (err.code === 1) msg = "Location permission denied. Please allow location access in your browser settings and try again.";
        else if (err.code === 2) msg = "Location is unavailable. Your device may not have GPS enabled. Please enter your location manually.";
        else if (err.code === 3) msg = "Location detection timed out. Please try again or enter your location manually.";
        setError(msg);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,  // Use GPS if available
        timeout: 20000,            // 20 seconds — enough time for GPS lock on mobile
        maximumAge: 0,             // Always get a fresh position, never use cached
      }
    );
  };

  // ── Google Login ──
  const handleGoogleLogin = () => {
    const clientId = config?.google_client_id;
    if (!clientId) {
      setError("Google Login is not configured.");
      return;
    }
    // Use Google Identity Services
    if (typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response.credential) {
            // Decode JWT payload
            try {
              const payload = JSON.parse(atob(response.credential.split(".")[1]));
              const name = payload.name || "";
              const [first, ...rest] = name.split(" ");
              setFirstName(first || "");
              setLastName(rest.join(" ") || "");
              setEmail(payload.email || "");
              if (payload.picture) setPhotoUrl(payload.picture);
            } catch {
              setError("Could not parse Google login response.");
            }
          }
        },
      });
      (window as any).google.accounts.id.prompt();
    } else {
      setError("Google Login script not loaded. Please refresh and try again.");
    }
  };

  // ── Duplicate booking check ──
  const checkExistingBooking = async (): Promise<boolean> => {
    if (!selectedCourseId || !email.trim()) return false;
    try {
      const params = new URLSearchParams({
        course_id: String(selectedCourseId),
        email: email.trim(),
      });
      if (phone.trim()) params.append("phone", phone.trim());
      const res = await apiFetch(`/api/public/slot-booking/check-existing?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.already_booked) {
          setError(data.detail || "You have already booked a slot for this course. Check your email for the receipt.");
          return true;
        }
      }
    } catch {
      // non-critical, allow user to proceed
    }
    return false;
  };

  // ── Validation ──
  const validateStep0 = (): boolean => {
    if (!firstName.trim()) { setError("Please enter your first name."); return false; }
    if (!email.trim()) { setError("Please enter your email address."); return false; }
    if (!phone.trim()) { setError("Please enter your phone number."); return false; }
    if (!selectedCourseId) { setError("Please select a course."); return false; }
    if (!category) { setError("Please select a student category."); return false; }
    if (category === "Others" && !otherCategory.trim()) { setError("Please specify your category."); return false; }
    if (!agreeTerms) { setError("You must agree to the Terms & Conditions."); return false; }
    // Location validation (merged from former step 1)
    if (!address.trim()) { setError("Please enter your address."); return false; }
    if (!stateName) { setError("Please select your state."); return false; }
    if (!city.trim()) { setError("Please select your city."); return false; }
    if (!pinCode.trim()) { setError("Please enter your pincode."); return false; }
    setError("");
    return true;
  };

  const validateStep1 = (): boolean => {
    if (!selectedBatchId) { setError("Please select a batch."); return false; }
    setError("");
    return true;
  };

  // ── Step Navigation ──
  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep0()) return;
      setChecking(true);
      setError("");
      try {
        const alreadyBooked = await checkExistingBooking();
        if (alreadyBooked) return;
      } finally {
        setChecking(false);
      }
    } else if (step === 1) {
      if (!validateStep1()) return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError("");
    }
  };

  // ── Compute booking amount ──
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || course;

  // ── Full Payment Discount logic ──
  const basePrice = selectedCourse?.discount_price ?? selectedCourse?.price ?? 0;
  const hasFullPayDiscount = !!(
    selectedCourse?.full_payment_discount_type &&
    selectedCourse?.full_payment_discount_value &&
    selectedCourse?.full_payment_discount_valid_till
  );
  const countdown = useCountdown(selectedCourse?.full_payment_discount_valid_till);
  const discountActive = hasFullPayDiscount && !countdown.isExpired;

  const fullPayDiscountedPrice = (() => {
    if (!discountActive || !selectedCourse) return 0;
    const val = selectedCourse.full_payment_discount_value!;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    if (selectedCourse.full_payment_discount_type === "percentage") {
      return Math.max(0, round2(basePrice - (basePrice * Math.min(val, 100) / 100)));
    }
    if (selectedCourse.full_payment_discount_type === "amount") {
      return Math.max(0, round2(basePrice - Math.min(val, basePrice)));
    }
    return 0;
  })();

  const savingsAmount = discountActive ? basePrice - fullPayDiscountedPrice : 0;

  // Normal booking amount (min payment or full price)
  const normalBookingAmount = (() => {
    if (!selectedCourse) return 0;
    if (selectedCourse.is_free) return 0;
    if (selectedCourse.min_payment_type === "percentage" && selectedCourse.min_payment_value) {
      return Math.round((selectedCourse.min_payment_value / 100) * basePrice);
    }
    if (selectedCourse.min_payment_type === "amount" && selectedCourse.min_payment_value) {
      return selectedCourse.min_payment_value;
    }
    return basePrice;
  })();

  // Final booking amount based on pay mode
  const bookingAmount = (payMode === "full" && discountActive) ? fullPayDiscountedPrice : normalBookingAmount;

  const currency = config?.currency || selectedCourse?.currency || "INR";

  // ── Razorpay Payment ──
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (razorpayScriptLoaded.current && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        razorpayScriptLoaded.current = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    if (!config?.razorpay_key_id) {
      setError("Payment gateway is not configured. Please contact support.");
      return;
    }
    if (bookingAmount <= 0) {
      // Free course — skip payment, go directly to register
      await handleVerifyAndRegister("", "", "");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create order
      const orderRes = await apiFetch("/api/public/slot-booking/create-order", {
        method: "POST",
        body: JSON.stringify({
          course_id: selectedCourseId,
          student_name: `${firstName} ${lastName}`.trim(),
          student_email: email,
          phone: phone.trim(),
          amount: bookingAmount,
          pay_mode: payMode,
        }),
      });
      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create payment order.");
      }
      const order = await orderRes.json();

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load payment gateway. Please check your internet connection.");
      }

      // 3. Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: config.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: config.site_name || "IINM",
        description: `Slot Booking — ${selectedCourse?.title || "Course"}`,
        image: config.logo_url || undefined,
        prefill: {
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          contact: phone,
        },
        theme: { color: "#0a1628" },
        handler: (response: any) => {
          handleVerifyAndRegister(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature
          );
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError("Payment cancelled. You can try again.");
          },
        },
      });
      rzp.open();
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || "Payment failed. Please try again.");
    }
  };

  // ── Verify & Register ──
  const handleVerifyAndRegister = async (paymentId: string, orderId: string, signature: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch("/api/public/slot-booking/verify-and-register", {
        method: "POST",
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
          amount_paid: bookingAmount,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim(),
          phone: phone.trim(),
          date_of_birth: dob || null,
          profile_photo_url: photoUrl || null,
          city: city || null,
          state: stateName || null,
          pin_code: pinCode || null,
          address: address || null,
          highest_qualification: qualification || null,
          student_category: category === "Others" ? otherCategory.trim() : category,
          course_id: selectedCourseId,
          batch_id: selectedBatchId || null,
          allow_email_notifications: allowEmail,
          allow_push_notifications: allowPush,
          agree_terms: agreeTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Registration failed. Please contact support.");
      }
      setReceipt(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download Receipt PDF ──
  const handleDownloadReceipt = async () => {
    if (!receipt) return;
    try {
      await downloadReceiptPdf(receipt);
    } catch (err: any) {
      setError("Could not download receipt: " + (err.message || "Unknown error"));
    }
  };

  if (!open) return null;

  // Success modal shown after successful payment
  if (step === 3 && receipt) {
    return (
      <div className="sb-overlay sb-success-modal-overlay" onClick={onClose}>
        <div className="sb-success-modal" onClick={(e) => e.stopPropagation()}>
          <div className="sb-step-content sb-success">
            <div className="sb-success-check">
              <Icon.Check />
            </div>
            <h2 className="sb-success-title">Successfully Slot Booked!</h2>
            <p className="sb-success-subtitle">A confirmation email has been sent to {receipt.student_email}</p>

            <div className="sb-success-date">
              <div className="sb-success-date-label">Class Start Date</div>
              <div className="sb-success-date-value">{formatDate(receipt.class_start_date)}</div>
            </div>

            <div className="sb-success-notice">
              <strong>Important:</strong> Admission fees must be paid before the class start date to get confirmed admission and your platform login credentials.
            </div>

            {(() => {
              const receiptUrl = getReceiptPublicUrl(receipt.invoice_uuid);
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(receiptUrl)}`;
              return (
                <>
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sb-success-qr"
                    title="Scan to view receipt"
                  >
                    <img src={qrCodeUrl} alt="Scan to view receipt" />
                    <span>Scan to view receipt</span>
                  </a>

                  <div className="sb-success-actions">
                    <a
                      className="sb-btn sb-btn-view"
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Receipt
                    </a>
                    <button className="sb-btn sb-btn-download" onClick={handleDownloadReceipt}>
                      <Icon.Download /> Download Receipt
                    </button>
                  </div>

                  <button className="sb-success-close-link" onClick={onClose}>
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  return (
    <div className="sb-overlay" onClick={onClose}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="sb-header">
          <div>
            <h2 className="sb-header-title">Book Your Slot</h2>
            <p className="sb-header-subtitle">{selectedCourse?.title || "Course"}</p>
          </div>
          <button className="sb-close-btn" onClick={onClose} aria-label="Close">
            <Icon.Close />
          </button>
        </div>

        {/* ── Progress ── */}
        <div className="sb-progress">
          {STEPS.map((label, i) => (
            <div key={i} className={`sb-step ${i === step ? "active" : i < step ? "done" : ""}`}>
              {i < STEPS.length - 1 && <div className="sb-step-line" />}
              <div className="sb-step-circle">
                {i < step ? "✓" : i + 1}
              </div>
              <span className="sb-step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="sb-body">
          {error && <div className="sb-error">{error}</div>}

          {/* ── Step 0: Student Details ── */}
          {step === 0 && (
            <div className="sb-step-content">
              {/* Google Login */}
              {config?.enable_google_login && (
                <button className="sb-google-btn" onClick={handleGoogleLogin} type="button">
                  <Icon.GoogleIcon /> Sign in with Google
                </button>
              )}

              {/* Photo Upload */}
              <div className="sb-field">
                <label className="sb-label">Profile Photo</label>
                <div className="sb-photo-upload">
                  <div className="sb-photo-preview">
                    {photoUrl ? (
                      <img src={resolveAssetUrl(photoUrl)} alt="Profile" />
                    ) : (
                      <span className="sb-photo-placeholder"><Icon.Camera /></span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={handlePhotoUpload} />
                    <button className="sb-photo-btn" onClick={() => fileInputRef.current?.click()} disabled={photoUploading} type="button">
                      {photoUploading ? `Uploading ${photoProgress}%` : "Upload / Capture"}
                    </button>
                    {photoUploading && (
                      <div className="sb-photo-progress">
                        <div className="sb-photo-progress-bar" style={{ width: `${photoProgress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="sb-row">
                <div className="sb-field">
                  <label className="sb-label">First Name<span className="sb-req">*</span></label>
                  <input className="sb-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Rahul" />
                </div>
                <div className="sb-field">
                  <label className="sb-label">Last Name</label>
                  <input className="sb-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Sharma" />
                </div>
              </div>

              {/* DOB & Phone */}
              <div className="sb-row">
                <div className="sb-field">
                  <label className="sb-label">Date of Birth<span className="sb-req">*</span></label>
                  <input className="sb-input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div className="sb-field">
                  <label className="sb-label">Phone Number<span className="sb-req">*</span></label>
                  <input className="sb-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
                </div>
              </div>

              {/* Email */}
              <div className="sb-field">
                <label className="sb-label">Email Address<span className="sb-req">*</span></label>
                <input className="sb-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rahul@example.com" />
              </div>

              {/* Course */}
              <div className="sb-field">
                <label className="sb-label">Selected Course<span className="sb-req">*</span></label>
                <select className="sb-select" value={selectedCourseId} onChange={e => setSelectedCourseId(Number(e.target.value))}>
                  <option value="" disabled>Select a course…</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Qualification */}
              <div className="sb-field">
                <label className="sb-label">Last Qualification</label>
                <input className="sb-input" type="text" value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. B.Tech, MCA, 12th Pass" />
              </div>

              {/* Student Category */}
              <div className="sb-field">
                <label className="sb-label">Student Category<span className="sb-req">*</span></label>
                <div className="sb-category-grid">
                  {STUDENT_CATEGORIES.map(cat => (
                    <div key={cat} className={`sb-category-card ${category === cat ? "selected" : ""}`} onClick={() => setCategory(cat)}>
                      <div className="sb-radio-dot" />
                      {cat}
                    </div>
                  ))}
                </div>
                {category === "Others" && (
                  <input className="sb-input" style={{ marginTop: 8 }} type="text" value={otherCategory} onChange={e => setOtherCategory(e.target.value)} placeholder="Please specify your category" />
                )}
              </div>

              {/* Notification Toggles */}
              <div className="sb-toggle-row">
                <span className="sb-toggle-label">Allow Class Notifications in Email</span>
                <div className={`sb-toggle ${allowEmail ? "on" : ""}`} onClick={() => setAllowEmail(!allowEmail)} />
              </div>
              <div className="sb-toggle-row">
                <span className="sb-toggle-label">Allow Push Notifications</span>
                <div className={`sb-toggle ${allowPush ? "on" : ""}`} onClick={() => setAllowPush(!allowPush)} />
              </div>

              {/* Terms */}
              <label className="sb-check-row">
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                <span className="sb-check-label">
                  I agree to the <a href="/terms" target="_blank">Terms & Conditions</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
                </span>
              </label>

              {/* ── Collapsible Location Section (merged from former Location step) ── */}
              <div className="sb-location-collapse-wrap">
                <button
                  type="button"
                  className="sb-location-collapse-header"
                  onClick={() => setShowLocation(s => !s)}
                  aria-expanded={showLocation}
                >
                  <span className="sb-location-collapse-title">
                    <Icon.Location /> Location Details
                  </span>
                  <span className={`sb-location-collapse-chevron ${showLocation ? "open" : ""}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                </button>
                {showLocation && (
                  <div className="sb-location-collapse-body">
                    <p className="sb-location-intro-desc">
                      We need your accurate location for admission records. Your current location is fetched automatically, or you can enter it manually below.
                    </p>

                    {/* Detect Button */}
                    <button className="sb-detect-btn" onClick={handleDetectLocation} disabled={locating} type="button">
                      {locating ? (
                        <><span className="sb-detect-spinner" /> Detecting…</>
                      ) : (
                        <><Icon.Location /> Detect My Location</>
                      )}
                    </button>

                    {/* Detected Info */}
                    {(address || city || stateName || pinCode) && !locating && (
                      <div className="sb-location-detected">
                        <Icon.Location />
                        <div>
                          <strong>Location Detected</strong>
                          <div className="sb-location-detected-address">
                            {address && <>{address}<br /></>}
                            {city}{stateName ? `, ${stateName}` : ""}{pinCode ? ` — ${pinCode}` : ""}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    <div className="sb-field">
                      <label className="sb-label">Full Address<span className="sb-req">*</span></label>
                      <textarea
                        className="sb-textarea"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="House/Flat no, Street, Area, Landmark…"
                        rows={2}
                      />
                    </div>

                    {/* State + City */}
                    <div className="sb-row">
                      <div className="sb-field">
                        <label className="sb-label">State<span className="sb-req">*</span></label>
                        <select
                          className="sb-select"
                          value={stateName}
                          onChange={e => {
                            setStateName(e.target.value);
                            setCity("");
                            setCityNotInList(false);
                          }}
                        >
                          <option value="" disabled>Select state…</option>
                          {INDIAN_STATE_NAMES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sb-field">
                        <label className="sb-label">City<span className="sb-req">*</span></label>
                        {cityNotInList || !stateName || INDIAN_STATES_CITIES[stateName]?.length === 0 ? (
                          <input
                            className="sb-input"
                            type="text"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="Type your city…"
                          />
                        ) : (
                          <select
                            className="sb-select"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                          >
                            <option value="" disabled>Select city…</option>
                            {INDIAN_STATES_CITIES[stateName]?.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            {/* If geocode city not in list, show it as an extra option */}
                            {city && !isCityInStateList(stateName, city) && (
                              <option value={city}>{city}</option>
                            )}
                          </select>
                        )}
                        {!cityNotInList && stateName && (
                          <button
                            type="button"
                            className="sb-city-toggle"
                            onClick={() => setCityNotInList(true)}
                          >
                            City not in list? Type manually
                          </button>
                        )}
                        {cityNotInList && (
                          <button
                            type="button"
                            className="sb-city-toggle"
                            onClick={() => { setCityNotInList(false); setCity(""); }}
                          >
                            ← Back to dropdown
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pincode */}
                    <div className="sb-field">
                      <label className="sb-label">Pincode<span className="sb-req">*</span></label>
                      <input
                        className="sb-input"
                        type="text"
                        value={pinCode}
                        onChange={e => setPinCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                        placeholder="6-digit pincode"
                        inputMode="numeric"
                        maxLength={6}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 1: Batch Selection ── */}
          {step === 1 && (
            <div className="sb-step-content">
              {batchesLoading ? (
                <>
                  <div className="sb-skeleton sb-skeleton-batch" />
                  <div className="sb-skeleton sb-skeleton-batch" />
                  <div className="sb-skeleton sb-skeleton-batch" />
                </>
              ) : batches.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <Icon.Calendar />
                  <p style={{ marginTop: 12, fontSize: 14 }}>No batches for this course yet. Please check back later or contact support.</p>
                </div>
              ) : (
                <>
                  {/* Active (Upcoming/Ongoing) batches — selectable */}
                  {batches.filter(b => b.status === "Upcoming" || b.status === "Ongoing").length > 0 && (
                    <>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Select Your Batch</h3>
                      <div className="sb-batch-list">
                        {batches.filter(b => b.status === "Upcoming" || b.status === "Ongoing").map(batch => {
                          const seatsClass = batch.seats_available > 10 ? "available" : batch.seats_available > 0 ? "filling" : "full";
                          const modeClass = (batch.mode || "online").toLowerCase();
                          const modeLabel = batch.mode === "Hybrid" ? "Pre-recorded + Live Class" : (batch.mode || "Online");
                          const fillPct = batch.max_capacity > 0 ? Math.round((batch.enrolled_count / batch.max_capacity) * 100) : 0;
                          return (
                            <div key={batch.id} className={`sb-batch-card ${selectedBatchId === batch.id ? "selected" : ""}`} onClick={() => setSelectedBatchId(batch.id)}>
                              <div className="sb-batch-card-header">
                                <span className="sb-batch-name">{batch.name}</span>
                                <span className={`sb-batch-mode ${modeClass}`}>{modeLabel}</span>
                              </div>
                              <div className="sb-batch-meta">
                                <span className="sb-batch-meta-item"><Icon.Calendar /> Starts {formatDate(batch.start_date)}</span>
                                <span className="sb-batch-meta-item"><Icon.Users /> {batch.enrolled_count}/{batch.max_capacity} enrolled</span>
                              </div>
                              <div className="sb-batch-progress-wrap">
                                <div className="sb-batch-progress-bar">
                                  <div className={`sb-batch-progress-fill ${seatsClass}`} style={{ width: `${fillPct}%` }} />
                                </div>
                                <span className={`sb-batch-seats ${seatsClass}`}>
                                  {batch.seats_available > 0 ? `${batch.seats_available} seats left` : batch.enable_waitlist ? "Waitlist available" : "Full"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Completed batches — reference only, not selectable */}
                  {batches.filter(b => b.status === "Completed").length > 0 && (
                    <>
                      <div className="sb-completed-header">
                        <span className="sb-completed-header-line" />
                        <span className="sb-completed-header-text">Completed Batches</span>
                        <span className="sb-completed-header-line" />
                      </div>
                      <div className="sb-batch-list">
                        {batches.filter(b => b.status === "Completed").map(batch => {
                          const fillPct = batch.max_capacity > 0 ? Math.round((batch.enrolled_count / batch.max_capacity) * 100) : 0;
                          return (
                            <div key={batch.id} className="sb-batch-card-completed">
                              <div className="sb-completed-badge-pill">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Completed
                              </div>
                              <div className="sb-completed-card-body">
                                <div className="sb-completed-card-top">
                                  <span className="sb-batch-name completed-name">{batch.name}</span>
                                </div>
                                <div className="sb-batch-meta">
                                  <span className="sb-batch-meta-item"><Icon.Calendar /> {formatDate(batch.start_date)} — {formatDate(batch.end_date)}</span>
                                  <span className="sb-batch-meta-item"><Icon.Users /> {batch.enrolled_count}/{batch.max_capacity} certified</span>
                                </div>
                                <div className="sb-batch-progress-wrap">
                                  <div className="sb-batch-progress-bar">
                                    <div className="sb-batch-progress-fill completed" style={{ width: `${fillPct}%` }} />
                                  </div>
                                  <span className="sb-completed-pct">{fillPct}% filled</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Payment ── */}
          {step === 2 && (
            <div className="sb-step-content">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Review & Pay</h3>

              {/* ── Payment Mode Selection (top) ── */}
              {discountActive && savingsAmount > 0 && (
                <div className="sb-pay-mode-wrap">
                  <div
                    className={`sb-pay-mode-option ${payMode === "booking" ? "selected" : ""}`}
                    onClick={() => setPayMode("booking")}
                  >
                    <div className="sb-pay-mode-radio" />
                    <div className="sb-pay-mode-info">
                      <span className="sb-pay-mode-title">Booking Amount</span>
                      <span className="sb-pay-mode-price">{formatCurrency(normalBookingAmount, currency)}</span>
                    </div>
                  </div>
                  <div
                    className={`sb-pay-mode-option sb-pay-mode-offer ${payMode === "full" ? "selected" : ""}`}
                    onClick={() => setPayMode("full")}
                  >
                    {/* Celebration blast — confetti + particles + flash */}
                    {payMode === "full" && (
                      <div className="sb-celebration-blast">
                        <div className="sb-blast-flash" />
                        <span className="sb-confetti" style={{ "--i": 0 } as any} />
                        <span className="sb-confetti" style={{ "--i": 1 } as any} />
                        <span className="sb-confetti" style={{ "--i": 2 } as any} />
                        <span className="sb-confetti" style={{ "--i": 3 } as any} />
                        <span className="sb-confetti" style={{ "--i": 4 } as any} />
                        <span className="sb-confetti" style={{ "--i": 5 } as any} />
                        <span className="sb-confetti" style={{ "--i": 6 } as any} />
                        <span className="sb-confetti" style={{ "--i": 7 } as any} />
                        <span className="sb-confetti" style={{ "--i": 8 } as any} />
                        <span className="sb-confetti" style={{ "--i": 9 } as any} />
                        <span className="sb-confetti" style={{ "--i": 10 } as any} />
                        <span className="sb-confetti" style={{ "--i": 11 } as any} />
                        <span className="sb-confetti" style={{ "--i": 12 } as any} />
                        <span className="sb-confetti" style={{ "--i": 13 } as any} />
                        <span className="sb-confetti" style={{ "--i": 14 } as any} />
                        <span className="sb-confetti" style={{ "--i": 15 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 0 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 1 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 2 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 3 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 4 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 5 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 6 } as any} />
                        <span className="sb-blast-particle" style={{ "--i": 7 } as any} />
                      </div>
                    )}
                    <div className="sb-pay-mode-radio" />
                    <div className="sb-pay-mode-info">
                      <span className="sb-pay-mode-title">Full Payment <span className="sb-pay-mode-save">Save {formatCurrency(savingsAmount, currency)}</span></span>
                      <span className="sb-pay-mode-price">{formatCurrency(fullPayDiscountedPrice, currency)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Full Payment Discount Offer Card (compact, with countdown) ── */}
              {discountActive && savingsAmount > 0 && (
                <div className={`sb-discount-card ${payMode === "full" ? "sb-discount-card-active" : ""}`}>
                  <div className="sb-discount-card-glow" />
                  {/* Gift icon */}
                  <div className="sb-discount-gift-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="4" rx="1"/>
                      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
                      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
                    </svg>
                  </div>
                  {/* Compact layout: title + prices in one row, countdown below */}
                  <div className="sb-discount-body">
                    <div className="sb-discount-info">
                      <span className="sb-discount-title">Full Payment Offer</span>
                      <div className="sb-discount-prices">
                        <span className="sb-discount-original">{formatCurrency(basePrice, currency)}</span>
                        <span className="sb-discount-new">{formatCurrency(fullPayDiscountedPrice, currency)}</span>
                      </div>
                    </div>
                    <div className="sb-discount-save-badge">Save {formatCurrency(savingsAmount, currency)}</div>
                  </div>
                  {/* Countdown Timer — compact inline */}
                  <div className="sb-countdown">
                    <div className="sb-countdown-box">
                      <span className="sb-countdown-num">{String(countdown.days).padStart(2, "0")}</span>
                      <span className="sb-countdown-unit">Days</span>
                    </div>
                    <div className="sb-countdown-box">
                      <span className="sb-countdown-num">{String(countdown.hours).padStart(2, "0")}</span>
                      <span className="sb-countdown-unit">Hrs</span>
                    </div>
                    <div className="sb-countdown-box">
                      <span className="sb-countdown-num">{String(countdown.minutes).padStart(2, "0")}</span>
                      <span className="sb-countdown-unit">Min</span>
                    </div>
                    <div className="sb-countdown-box">
                      <span className="sb-countdown-num">{String(countdown.seconds).padStart(2, "0")}</span>
                      <span className="sb-countdown-unit">Sec</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="sb-summary">
                <div className="sb-summary-row">
                  <span className="sb-summary-label">Student Name</span>
                  <span className="sb-summary-value">{firstName} {lastName}</span>
                </div>
                <div className="sb-summary-row">
                  <span className="sb-summary-label">Email</span>
                  <span className="sb-summary-value">{email}</span>
                </div>
                <div className="sb-summary-row">
                  <span className="sb-summary-label">Phone</span>
                  <span className="sb-summary-value">{phone}</span>
                </div>
                <div className="sb-summary-row">
                  <span className="sb-summary-label">Course</span>
                  <span className="sb-summary-value">{selectedCourse?.title}</span>
                </div>
                {selectedBatch && (
                  <div className="sb-summary-row">
                    <span className="sb-summary-label">Batch</span>
                    <span className="sb-summary-value">{selectedBatch.name}</span>
                  </div>
                )}
                {selectedBatch?.start_date && (
                  <div className="sb-summary-row">
                    <span className="sb-summary-label">Class Starts</span>
                    <span className="sb-summary-value">{formatDate(selectedBatch.start_date)}</span>
                  </div>
                )}
                <div className="sb-summary-row sb-summary-total">
                  <span className="sb-summary-label">Booking Amount</span>
                  <span className="sb-summary-value">{formatCurrency(bookingAmount, currency)}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon.Lock /> Secured by Razorpay · 256-bit SSL encryption
              </div>
            </div>
          )}

          {/* ── Step 3: Success is rendered as a centered modal above ── */}
        </div>

        {/* ── Footer ── */}
        {step < 3 && (
          <div className="sb-footer">
            {step > 0 && (
              <button className="sb-btn sb-btn-back" onClick={handleBack} disabled={submitting}>
                <Icon.ArrowLeft /> Back
              </button>
            )}
            {step < 2 && (
              <button className="sb-btn sb-btn-next" onClick={handleNext} disabled={submitting || checking}>
                {checking ? "Checking…" : "Next"} <Icon.ArrowRight />
              </button>
            )}
            {step === 2 && (
              <button className="sb-btn sb-btn-pay" onClick={handlePay} disabled={submitting}>
                {submitting ? "Processing…" : `Pay ${formatCurrency(bookingAmount, currency)}`}
              </button>
            )}
          </div>
        )}

        {/* ── Loading Overlay ── */}
        {submitting && step !== 3 && (
          <div className="sb-loading-overlay">
            <div className="sb-spinner" />
            <div className="sb-loading-text">
              {step === 2 ? "Processing payment & registering…" : "Please wait…"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
