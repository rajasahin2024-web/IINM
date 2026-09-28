"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { apiFetch } from "@/lib/apiFetch";
import { cachedFetch, invalidateCache } from "@/lib/apiCache";
import { resolveAssetUrl } from "@/lib/config";
import { uploadWithProgress } from "@/lib/uploadWithProgress";
import { INDIAN_STATE_NAMES, INDIAN_STATES_CITIES, isCityInStateList } from "@/lib/indianLocations";
import { ReceiptData, downloadReceiptPdf, getReceiptPublicUrl } from "@/lib/receipt";
import "./admission.css";

/* ─────────────────────────────────────────
   Interfaces & Types
───────────────────────────────────────── */
interface Course {
  id: number;
  title: string;
  slug?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  price?: number | null;
  discount_price?: number | null;
  is_free?: boolean;
  currency?: string | null;
  skill_level?: string | null;
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

const WIZARD_STEPS = [
  { step: 0, label: "Course", title: "Select Course" },
  { step: 1, label: "Applicant", title: "Personal & Location" },
  { step: 2, label: "Batch", title: "Choose Batch" },
  { step: 3, label: "Payment", title: "Review & Pay" },
  { step: 4, label: "Slip", title: "Confirmation" },
];

/* ─────────────────────────────────────────
   Icons
───────────────────────────────────────── */
const Icon = {
  Check: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Camera: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  Location: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Calendar: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7M19 12H5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Certificate: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6" />
      <path d="m15.4 12.5 2.6 7.5-6-3-6 3 2.6-7.5" />
    </svg>
  ),
  GoogleIcon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  ),
};

/* ─────────────────────────────────────────
   Helper Routines
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
   Admission Portal Client View Component
───────────────────────────────────────── */
export default function AdmissionClientView() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0); // 0=Course, 1=Applicant & Location, 2=Batch, 3=Pay, 4=Receipt
  const [config, setConfig] = useState<SlotBookingConfig | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payMode, setPayMode] = useState<"booking" | "full">("booking");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");

  // Applicant details state
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const razorpayScriptLoaded = useRef(false);
  const locationAutoTriggeredRef = useRef(false);
  const stepItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smooth-scroll the active step into view on mobile
  useEffect(() => {
    const el = stepItemRefs.current[step];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [step]);

  // Load config and courses on mount
  useEffect(() => {
    fetchConfig();
    fetchCourses();
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await cachedFetch<SlotBookingConfig>("/api/public/slot-booking/config", 300_000);
      if (data) {
        setConfig(data);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const data = await cachedFetch<Course[]>("/api/public/slot-booking/courses", 180_000);
      const courseList: Course[] = Array.isArray(data) ? data : [];
      setCourses(courseList);

      // Pre-selection check from URL query params
      const courseParam = searchParams.get("course");
      const courseIdParam = searchParams.get("course_id");

      if (courseIdParam) {
        const matched = courseList.find((c) => c.id === Number(courseIdParam));
        if (matched) {
          setSelectedCourseId(matched.id);
          setStep(1); // advance to applicant details directly
        }
      } else if (courseParam) {
        const matched = courseList.find((c) => c.slug === courseParam || String(c.id) === courseParam);
        if (matched) {
          setSelectedCourseId(matched.id);
          setStep(1); // advance to applicant details directly
        }
      }
    } catch {
      // non-critical
    } finally {
      setCoursesLoading(false);
    }
  }, [searchParams]);

  // Fetch batches when selected course changes
  const fetchBatches = useCallback(async (cid: number) => {
    setBatchesLoading(true);
    try {
      const data = await cachedFetch<Batch[]>(`/api/public/slot-booking/courses/${cid}/batches`, 60_000);
      setBatches(Array.isArray(data) ? data : []);
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchBatches(Number(selectedCourseId));
    }
  }, [selectedCourseId, fetchBatches]);

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await uploadWithProgress("/api/public/slot-booking/upload-photo", formData, (pct) =>
        setPhotoProgress(pct)
      );
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

  // Google Maps Location Auto-detect
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
          setError("Google Maps API key is not configured. Please enter your location manually.");
          setLocating(false);
          return;
        }
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&result_type=street_address|premise|subpremise|point_of_interest&location_type=ROOFTOP|RANGE_INTERPOLATED&key=${apiKey}`
          );
          const data = await res.json();

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

            let foundCity = "",
              foundState = "",
              foundPin = "";
            let streetNumber = "",
              route = "",
              premise = "",
              subpremise = "";
            let sublocalityL1 = "",
              sublocalityL2 = "",
              sublocalityL3 = "",
              neighborhood = "";

            for (const c of components) {
              const types = c.types;
              if (types.includes("locality")) foundCity = c.long_name;
              else if (types.includes("administrative_area_level_3") && !foundCity) foundCity = c.long_name;
              else if (types.includes("postal_town") && !foundCity) foundCity = c.long_name;
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

            if (!foundAddress) {
              foundAddress = (result.formatted_address || "").replace(/,\s*India\s*$/i, "").trim();
            }

            setAddress(foundAddress);
            setCity(foundCity || "");
            setStateName(foundState || "");
            setPinCode(foundPin || "");

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
        let msg = "Could not detect your location.";
        if (err.code === 1) msg = "Location permission denied. Please enter your location manually.";
        else if (err.code === 2) msg = "Location is unavailable. Please enter your location manually.";
        else if (err.code === 3) msg = "Location detection timed out. Please enter manually.";
        setError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Google Login
  const handleGoogleLogin = () => {
    const clientId = config?.google_client_id;
    if (!clientId) {
      setError("Google Login is not configured.");
      return;
    }
    if (typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response.credential) {
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
      setError("Google Login script not loaded. Please fill manually.");
    }
  };

  // Duplicate booking check
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
          setError(data.detail || "You have already booked a slot for this course. Please check your email for the receipt.");
          return true;
        }
      }
    } catch {
      // non-critical, allow proceed
    }
    return false;
  };

  // Validation
  const validateStep1 = (): boolean => {
    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return false;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return false;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return false;
    }
    if (!selectedCourseId) {
      setError("Please select a course.");
      return false;
    }
    if (!category) {
      setError("Please select a student category.");
      return false;
    }
    if (category === "Others" && !otherCategory.trim()) {
      setError("Please specify your category.");
      return false;
    }
    if (!agreeTerms) {
      setError("You must agree to the Terms & Conditions.");
      return false;
    }
    if (!address.trim()) {
      setError("Please enter your address.");
      return false;
    }
    if (!stateName) {
      setError("Please select your state.");
      return false;
    }
    if (!city.trim()) {
      setError("Please select your city.");
      return false;
    }
    if (!pinCode.trim()) {
      setError("Please enter your pincode.");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!selectedBatchId) {
      setError("Please select an upcoming batch.");
      return false;
    }
    const chosen = batches.find((b) => b.id === selectedBatchId);
    if (!chosen || chosen.status !== "Upcoming") {
      setError("Please select an upcoming batch. Ongoing batches are currently in progress and closed for admission.");
      return false;
    }
    setError("");
    return true;
  };

  // Step advancement
  const handleNext = async () => {
    setError("");
    if (step === 0) {
      if (!selectedCourseId) {
        setError("Please choose a course to continue.");
        return;
      }
      setStep(1);
      window.scrollTo({ top: 200, behavior: "smooth" });
    } else if (step === 1) {
      if (!validateStep1()) return;
      setChecking(true);
      try {
        const alreadyBooked = await checkExistingBooking();
        if (alreadyBooked) return;
        setStep(2);
        window.scrollTo({ top: 200, behavior: "smooth" });
      } finally {
        setChecking(false);
      }
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError("");
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  // Pricing calculations
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
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
      return Math.max(0, round2(basePrice - (basePrice * Math.min(val, 100)) / 100));
    }
    if (selectedCourse.full_payment_discount_type === "amount") {
      return Math.max(0, round2(basePrice - Math.min(val, basePrice)));
    }
    return 0;
  })();

  const savingsAmount = discountActive ? basePrice - fullPayDiscountedPrice : 0;

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

  const bookingAmount = payMode === "full" && discountActive ? fullPayDiscountedPrice : normalBookingAmount;
  const currency = config?.currency || selectedCourse?.currency || "INR";

  // Razorpay
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
      setError("Payment gateway is not configured. Please contact institute support.");
      return;
    }
    if (bookingAmount <= 0) {
      await handleVerifyAndRegister("", "", "");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
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

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load payment gateway. Please check your internet connection.");
      }

      const rzp = new (window as any).Razorpay({
        key: config.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: config.site_name || "IINM",
        description: `Admission Slot Booking — ${selectedCourse?.title || "Course"}`,
        image: config.logo_url || undefined,
        prefill: {
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          contact: phone,
        },
        theme: { color: "#4338ca" },
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
            setError("Payment window closed. You can try again whenever ready.");
          },
        },
      });
      rzp.open();
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || "Payment failed. Please try again.");
    }
  };

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
      if (selectedCourseId) {
        invalidateCache(`/api/public/slot-booking/courses/${selectedCourseId}/batches`);
      }
      setStep(4); // Success step
      window.scrollTo({ top: 200, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receipt) return;
    try {
      await downloadReceiptPdf(receipt);
    } catch (err: any) {
      setError("Could not download receipt: " + (err.message || "Unknown error"));
    }
  };

  // Filtered course catalog
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter((c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [courses, searchQuery]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="adm-page-wrapper">
      <PublicNavbar />

      {/* ── Hero Header ── */}
      <section className="adm-hero">
        <div className="adm-hero-container">
          <div className="adm-hero-badge">
            <span className="adm-hero-badge-dot" />
            Admissions Open · Academic Year 2026-27
          </div>
          <h1 className="adm-hero-title">Online Admission & Slot Booking Portal</h1>
          <p className="adm-hero-desc">
            Reserve your confirmed batch seat for industry-accredited AI, Automation, and Digital Media diploma
            programs. Instant digital enrollment slip and verifiable tax invoice.
          </p>
          <div className="adm-hero-trust-bar">
            <div className="adm-trust-item">
              <Icon.Check /> 100% Guaranteed Seat Reservation
            </div>
            <div className="adm-trust-item">
              <Icon.Certificate /> Official IINM Diploma Accreditation
            </div>
            <div className="adm-trust-item">
              <Icon.Shield /> 256-Bit SSL Encrypted Razorpay Gateway
            </div>
          </div>
        </div>
      </section>

      {/* ── Wizard Main ── */}
      <main className="adm-main">
        <div className="adm-card">
          {/* Stepper Progress Bar */}
          <div className="adm-stepper">
            {WIZARD_STEPS.map((s) => {
              const isActive = step === s.step;
              const isDone = step > s.step;
              return (
                <div
                  key={s.step}
                  ref={(el) => {
                    stepItemRefs.current[s.step] = el;
                  }}
                  className={`adm-step-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                  onClick={() => {
                    // Allow navigating back to completed steps
                    if (isDone && step !== 4) setStep(s.step);
                  }}
                >
                  <div className="adm-step-num">{isDone ? "✓" : s.step + 1}</div>
                  <div className="adm-step-info">
                    <span className="adm-step-label-small">{s.label}</span>
                    <span className="adm-step-title">{s.title}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="adm-content">
            {error && (
              <div className="adm-alert-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>{error}</div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                STEP 0: Course Selection
            ══════════════════════════════════════════ */}
            {step === 0 && (
              <div>
                <div className="adm-section-header">
                  <h2 className="adm-section-title">Select Your Desired Certification Course</h2>
                  <p className="adm-section-desc">
                    Choose the course you want to enroll in. You will select your preferred batch timing in Step 3.
                  </p>
                </div>

                <div className="adm-course-filter-bar">
                  <div className="adm-search-wrap">
                    <span className="adm-search-icon">
                      <Icon.Search />
                    </span>
                    <input
                      type="text"
                      className="adm-search-input"
                      placeholder="Search courses by name or topic…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {coursesLoading ? (
                  <div className="adm-course-grid">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div key={idx} className="adm-course-card adm-course-skeleton">
                        <div>
                          <div className="adm-course-card-top">
                            <div className="adm-skeleton-line tag" />
                          </div>
                          <div className="adm-skeleton-line title" />
                          <div className="adm-skeleton-line desc" />
                          <div className="adm-skeleton-line desc short" />
                        </div>
                        <div className="adm-course-footer">
                          <div className="adm-skeleton-line price" />
                          <div className="adm-skeleton-line btn" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                    <p>No courses found matching your search. Please check the course title.</p>
                  </div>
                ) : (
                  <div className="adm-course-grid">
                    {filteredCourses.map((c) => {
                      const isSelected = selectedCourseId === c.id;
                      const hasDiscount = c.discount_price && c.price && c.discount_price < c.price;
                      const displayPrice = c.is_free ? 0 : (c.discount_price ?? c.price ?? 0);
                      return (
                        <div
                          key={c.id}
                          className={`adm-course-card ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedCourseId(c.id)}
                        >
                          <div>
                            <div className="adm-course-card-top">
                              <span className="adm-course-tag">{c.skill_level || "Professional"}</span>
                              <div className="adm-course-radio" />
                            </div>
                            <h3 className="adm-course-title">{c.title}</h3>
                            {c.description && <p className="adm-course-desc">{c.description}</p>}
                          </div>

                          <div className="adm-course-footer">
                            <div className="adm-course-price-wrap">
                              <span className="adm-price-label">Program Fee</span>
                              <div>
                                <span className="adm-price-val">
                                  {c.is_free ? "Free" : formatCurrency(displayPrice, c.currency || "INR")}
                                </span>
                                {hasDiscount && !c.is_free && (
                                  <span className="adm-price-original">
                                    {formatCurrency(c.price!, c.currency || "INR")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="adm-course-select-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCourseId(c.id);
                              }}
                            >
                              {isSelected ? "Selected ✓" : "Select Course"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════
                STEP 1: Applicant Details & Location
            ══════════════════════════════════════════ */}
            {step === 1 && (
              <div>
                <div className="adm-section-header">
                  <h2 className="adm-section-title">Applicant Information & Verified Location</h2>
                  <p className="adm-section-desc">
                    Enrolling in: <strong>{selectedCourse?.title || "Selected Course"}</strong>. Please enter the
                    applicant details accurately for your official student identity record.
                  </p>
                </div>

                {config?.enable_google_login && (
                  <div className="adm-google-box">
                    <button type="button" className="adm-google-btn" onClick={handleGoogleLogin}>
                      <Icon.GoogleIcon /> Autofill with Google
                    </button>
                  </div>
                )}

                {/* Photo Upload Section */}
                <div className="adm-photo-section">
                  <div className="adm-photo-avatar">
                    {photoUrl ? (
                      <img src={resolveAssetUrl(photoUrl)} alt="Profile Preview" />
                    ) : (
                      <span style={{ color: "#94a3b8" }}>
                        <Icon.Camera />
                      </span>
                    )}
                  </div>
                  <div className="adm-photo-controls">
                    <h4 className="adm-photo-title">Student Profile Photo</h4>
                    <p className="adm-photo-sub">
                      Upload a clear passport-size photo or take one using your camera for your student ID card.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      style={{ display: "none" }}
                      onChange={handlePhotoUpload}
                    />
                    <button
                      type="button"
                      className="adm-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                    >
                      <Icon.Camera />
                      {photoUploading ? `Uploading (${photoProgress}%)` : "Upload / Take Photo"}
                    </button>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="adm-form-grid">
                  <div className="adm-field">
                    <label className="adm-label">
                      First Name <span className="adm-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Rahul"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div className="adm-field">
                    <label className="adm-label">Last Name</label>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div className="adm-field">
                    <label className="adm-label">
                      Date of Birth <span className="adm-req">*</span>
                    </label>
                    <input
                      type="date"
                      className="adm-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>

                  <div className="adm-field">
                    <label className="adm-label">
                      Phone Number (WhatsApp) <span className="adm-req">*</span>
                    </label>
                    <input
                      type="tel"
                      className="adm-input"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="adm-field adm-field-full">
                    <label className="adm-label">
                      Email Address <span className="adm-req">*</span>
                    </label>
                    <input
                      type="email"
                      className="adm-input"
                      placeholder="e.g. rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="adm-field adm-field-full">
                    <label className="adm-label">Highest Qualification</label>
                    <input
                      type="text"
                      className="adm-input"
                      placeholder="e.g. B.Tech / BCA / High School / Working"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                    />
                  </div>

                  <div className="adm-field adm-field-full">
                    <label className="adm-label">
                      Applicant Category <span className="adm-req">*</span>
                    </label>
                    <div className="adm-category-grid">
                      {STUDENT_CATEGORIES.map((cat) => (
                        <div
                          key={cat}
                          className={`adm-category-card ${category === cat ? "selected" : ""}`}
                          onClick={() => setCategory(cat)}
                        >
                          <div className="adm-radio-dot" />
                          {cat}
                        </div>
                      ))}
                    </div>
                    {category === "Others" && (
                      <input
                        type="text"
                        className="adm-input"
                        style={{ marginTop: "10px" }}
                        placeholder="Please specify your occupation/status"
                        value={otherCategory}
                        onChange={(e) => setOtherCategory(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Location Detection Box */}
                <div className="adm-location-card">
                  <div className="adm-location-header">
                    <div className="adm-location-title">
                      <Icon.Location /> Verified Residential / Billing Address
                    </div>
                    <button
                      type="button"
                      className="adm-detect-btn"
                      onClick={handleDetectLocation}
                      disabled={locating}
                    >
                      {locating ? "Detecting GPS Location…" : "Auto-Detect My Location"}
                    </button>
                  </div>

                  {(address || city || stateName || pinCode) && !locating && (
                    <div className="adm-detected-pill">
                      <Icon.Location />
                      <div>
                        <strong>Location Detected:</strong> {address ? `${address}, ` : ""}
                        {city}, {stateName} - {pinCode}
                      </div>
                    </div>
                  )}

                  <div className="adm-form-grid" style={{ marginBottom: 0 }}>
                    <div className="adm-field adm-field-full">
                      <label className="adm-label">
                        Full Address / Street <span className="adm-req">*</span>
                      </label>
                      <textarea
                        className="adm-textarea"
                        rows={2}
                        placeholder="House/Flat No., Street, Landmark, Area…"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className="adm-field">
                      <label className="adm-label">
                        State <span className="adm-req">*</span>
                      </label>
                      <select
                        className="adm-select"
                        value={stateName}
                        onChange={(e) => {
                          setStateName(e.target.value);
                          setCity("");
                          setCityNotInList(false);
                        }}
                      >
                        <option value="" disabled>
                          Select State…
                        </option>
                        {INDIAN_STATE_NAMES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="adm-field">
                      <label className="adm-label">
                        City <span className="adm-req">*</span>
                      </label>
                      {cityNotInList || !stateName || INDIAN_STATES_CITIES[stateName]?.length === 0 ? (
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="Type your city name"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      ) : (
                        <select className="adm-select" value={city} onChange={(e) => setCity(e.target.value)}>
                          <option value="" disabled>
                            Select City…
                          </option>
                          {INDIAN_STATES_CITIES[stateName]?.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          {city && !isCityInStateList(stateName, city) && <option value={city}>{city}</option>}
                        </select>
                      )}
                      {!cityNotInList && stateName && (
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#4338ca",
                            fontSize: "12px",
                            cursor: "pointer",
                            textAlign: "left",
                            padding: "4px 0 0",
                          }}
                          onClick={() => setCityNotInList(true)}
                        >
                          City not in list? Type manually
                        </button>
                      )}
                      {cityNotInList && (
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#4338ca",
                            fontSize: "12px",
                            cursor: "pointer",
                            textAlign: "left",
                            padding: "4px 0 0",
                          }}
                          onClick={() => {
                            setCityNotInList(false);
                            setCity("");
                          }}
                        >
                          ← Back to city dropdown
                        </button>
                      )}
                    </div>

                    <div className="adm-field">
                      <label className="adm-label">
                        Pincode <span className="adm-req">*</span>
                      </label>
                      <input
                        type="text"
                        className="adm-input"
                        placeholder="6-digit PIN"
                        maxLength={6}
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications & Terms */}
                <div style={{ marginTop: "20px" }}>
                  <div className="adm-toggle-row">
                    <span className="adm-toggle-label">Receive Batch & Class Schedule Updates via Email</span>
                    <div
                      className={`adm-toggle ${allowEmail ? "on" : ""}`}
                      onClick={() => setAllowEmail(!allowEmail)}
                    />
                  </div>
                  <div className="adm-toggle-row">
                    <span className="adm-toggle-label">Receive WhatsApp & Push Notifications for Attendance</span>
                    <div className={`adm-toggle ${allowPush ? "on" : ""}`} onClick={() => setAllowPush(!allowPush)} />
                  </div>
                  <label className="adm-terms-row">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span>
                      I certify that the information provided is true, and I agree to IINM’s{" "}
                      <Link href="/page/terms-conditions" target="_blank">
                        Terms of Admission
                      </Link>{" "}
                      and{" "}
                      <Link href="/page/privacy-policy" target="_blank">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                STEP 2: Batch Selection
            ══════════════════════════════════════════ */}
            {step === 2 && (
              <div>
                <div className="adm-section-header">
                  <h2 className="adm-section-title">Select Your Preferred Batch & Schedule</h2>
                  <p className="adm-section-desc">
                    Choose from available live batches for <strong>{selectedCourse?.title}</strong>. Seats are allocated
                    on a first-come, first-served basis.
                  </p>
                </div>

                {batchesLoading ? (
                  <div className="adm-batch-grid">
                    {[1, 2, 3].map((idx) => (
                      <div key={idx} className="adm-batch-card adm-batch-skeleton">
                        <div className="adm-skeleton-line title" style={{ width: "60%", marginBottom: "14px", height: "20px" }} />
                        <div className="adm-skeleton-line desc" style={{ width: "80%", marginBottom: "10px", height: "14px" }} />
                        <div className="adm-skeleton-line desc" style={{ width: "50%", marginBottom: "16px", height: "14px" }} />
                        <div className="adm-skeleton-line btn" style={{ width: "100%", height: "36px" }} />
                      </div>
                    ))}
                  </div>
                ) : batches.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                    <p>No active batches found for this course. Please contact the admissions team for upcoming schedules.</p>
                  </div>
                ) : (
                  <div>
                    {batches.filter((b) => b.status === "Upcoming").length > 0 ? (
                      <div className="adm-batch-grid">
                        {batches
                          .filter((b) => b.status === "Upcoming")
                          .map((b) => {
                            const isSelected = selectedBatchId === b.id;
                            const fillPct =
                              b.max_capacity > 0 ? Math.round((b.enrolled_count / b.max_capacity) * 100) : 0;
                            const seatsClass =
                              b.seats_available > 10 ? "available" : b.seats_available > 0 ? "filling" : "full";

                            return (
                              <div
                                key={b.id}
                                className={`adm-batch-card ${isSelected ? "selected" : ""}`}
                                onClick={() => setSelectedBatchId(b.id)}
                              >
                                <div className="adm-batch-top">
                                  <span className="adm-batch-name">{b.name}</span>
                                  <span className="adm-batch-mode-badge">{b.mode || "Online Live"}</span>
                                </div>

                                <div className="adm-batch-meta-row">
                                  <div className="adm-batch-meta-item">
                                    <Icon.Calendar />
                                    Starts: {formatDate(b.start_date)}
                                  </div>
                                  <div className="adm-batch-meta-item">
                                    <Icon.Users />
                                    {b.enrolled_count}/{b.max_capacity} Enrolled
                                  </div>
                                </div>

                                <div className="adm-batch-progress-wrap">
                                  <div className="adm-batch-progress-bar">
                                    <div
                                      className={`adm-batch-progress-fill ${seatsClass}`}
                                      style={{ width: `${fillPct}%` }}
                                    />
                                  </div>
                                  <div className={`adm-batch-seats-text ${seatsClass}`}>
                                    <span>
                                      {b.seats_available > 0
                                        ? `${b.seats_available} seats remaining`
                                        : b.enable_waitlist
                                        ? "Waitlist Available"
                                        : "Batch Full"}
                                    </span>
                                    <span>{fillPct}% Reserved</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center", marginBottom: "20px" }}>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#64748b" }}>
                          No upcoming batches available for admission at this moment.
                        </p>
                      </div>
                    )}

                    {/* Ongoing Batches — Reference Only */}
                    {batches.filter((b) => b.status === "Ongoing").length > 0 && (
                      <div style={{ marginTop: "28px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#15803d", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 2px rgba(34,197,94,0.3)" }} />
                          Ongoing Batches (Classes In Progress · Admissions Closed)
                        </h4>
                        <div className="adm-batch-grid">
                          {batches
                            .filter((b) => b.status === "Ongoing")
                            .map((ob) => {
                              const fillPct =
                                ob.max_capacity > 0
                                  ? Math.round((ob.enrolled_count / ob.max_capacity) * 100)
                                  : 0;
                              return (
                                <div
                                  key={ob.id}
                                  className="adm-batch-card adm-batch-card-ongoing"
                                  title="Classes currently in progress. Admissions are closed."
                                >
                                  <div className="adm-batch-top">
                                    <span className="adm-batch-name">{ob.name}</span>
                                    <span className="adm-ongoing-badge">Ongoing · Closed</span>
                                  </div>

                                  <div className="adm-batch-meta-row">
                                    <div className="adm-batch-meta-item">
                                      <Icon.Calendar />
                                      Started: {formatDate(ob.start_date)}
                                    </div>
                                    <div className="adm-batch-meta-item">
                                      <Icon.Users />
                                      {ob.enrolled_count}/{ob.max_capacity} Enrolled
                                    </div>
                                  </div>

                                  <div className="adm-batch-progress-wrap">
                                    <div className="adm-batch-progress-bar">
                                      <div
                                        className="adm-batch-progress-fill ongoing"
                                        style={{ width: `${fillPct}%` }}
                                      />
                                    </div>
                                    <div className="adm-batch-seats-text">
                                      <span style={{ color: "#15803d", fontWeight: 600 }}>
                                        Classes started · Closed for booking
                                      </span>
                                      <span>{fillPct}% Enrolled</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {batches.filter((b) => b.status === "Completed").length > 0 && (
                      <div style={{ marginTop: "32px", opacity: 0.8 }}>
                        <h4 style={{ fontSize: "14px", color: "#64748b", margin: "0 0 12px" }}>
                          Previous Graduated Batches (Reference Only)
                        </h4>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          {batches
                            .filter((b) => b.status === "Completed")
                            .map((cb) => (
                              <div
                                key={cb.id}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "8px",
                                  background: "#f1f5f9",
                                  fontSize: "13px",
                                  color: "#64748b",
                                }}
                              >
                                {cb.name} · {formatDate(cb.start_date)} (Completed)
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════
                STEP 3: Review & Payment Split View
            ══════════════════════════════════════════ */}
            {step === 3 && (
              <div>
                <div className="adm-section-header">
                  <h2 className="adm-section-title">Application Summary & Payment Option</h2>
                  <p className="adm-section-desc">
                    Review your admission enrollment details and choose your preferred fee reservation mode.
                  </p>
                </div>

                <div className="adm-split-review-grid">
                  {/* Left Column: Review Summary */}
                  <div className="adm-review-summary-box">
                    <h3 className="adm-review-title">Admission Record Preview</h3>
                    <div className="adm-review-list">
                      <div className="adm-review-row">
                        <span className="adm-review-label">Candidate Name:</span>
                        <span className="adm-review-value">
                          {firstName} {lastName}
                        </span>
                      </div>
                      <div className="adm-review-row">
                        <span className="adm-review-label">Contact Email:</span>
                        <span className="adm-review-value">{email}</span>
                      </div>
                      <div className="adm-review-row">
                        <span className="adm-review-label">Mobile Number:</span>
                        <span className="adm-review-value">{phone}</span>
                      </div>
                      <div className="adm-review-row">
                        <span className="adm-review-label">Selected Program:</span>
                        <span className="adm-review-value">{selectedCourse?.title}</span>
                      </div>
                      <div className="adm-review-row">
                        <span className="adm-review-label">Allocated Batch:</span>
                        <span className="adm-review-value">{selectedBatch?.name || "Standard Batch"}</span>
                      </div>
                      <div className="adm-review-row">
                        <span className="adm-review-label">Class Commencement:</span>
                        <span className="adm-review-value">{formatDate(selectedBatch?.start_date)}</span>
                      </div>
                      <div className="adm-review-row">
                        <span className="adm-review-label">Registered City / State:</span>
                        <span className="adm-review-value">
                          {city}, {stateName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Payment Gate Options */}
                  <div className="adm-payment-box">
                    <h3 className="adm-review-title" style={{ marginTop: 0 }}>
                      Choose Payment Option
                    </h3>

                    {discountActive && savingsAmount > 0 && (
                      <div className="adm-countdown-box">
                        <span>⚡ Early Bird Discount Offer Ending In:</span>
                        <div className="adm-countdown-timer">
                          <span className="adm-timer-pill">{String(countdown.days).padStart(2, "0")}d</span>
                          <span>:</span>
                          <span className="adm-timer-pill">{String(countdown.hours).padStart(2, "0")}h</span>
                          <span>:</span>
                          <span className="adm-timer-pill">{String(countdown.minutes).padStart(2, "0")}m</span>
                          <span>:</span>
                          <span className="adm-timer-pill">{String(countdown.seconds).padStart(2, "0")}s</span>
                        </div>
                      </div>
                    )}

                    <div className="adm-pay-mode-group">
                      {/* Token Slot Booking Amount */}
                      <div
                        className={`adm-pay-option ${payMode === "booking" ? "selected" : ""}`}
                        onClick={() => setPayMode("booking")}
                      >
                        <div className="adm-pay-option-left">
                          <div className="adm-pay-radio" />
                          <div>
                            <h4 className="adm-pay-title">Seat Reservation Booking Fee</h4>
                            <p className="adm-pay-sub">
                              Reserve your slot now. Pay remaining balance before classes begin.
                            </p>
                          </div>
                        </div>
                        <div className="adm-pay-amount">{formatCurrency(normalBookingAmount, currency)}</div>
                      </div>

                      {/* Full Payment Offer */}
                      {discountActive && savingsAmount > 0 && (
                        <div
                          className={`adm-pay-option ${payMode === "full" ? "selected" : ""}`}
                          onClick={() => setPayMode("full")}
                        >
                          <div className="adm-pay-option-left">
                            <div className="adm-pay-radio" />
                            <div>
                              <h4 className="adm-pay-title">Full Course One-Time Payment</h4>
                              <span className="adm-pay-save-badge">
                                Instant Save {formatCurrency(savingsAmount, currency)}
                              </span>
                            </div>
                          </div>
                          <div className="adm-pay-amount">
                            {formatCurrency(fullPayDiscountedPrice, currency)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="adm-total-breakup">
                      <span className="adm-total-label">Payable Right Now</span>
                      <span className="adm-total-amount">{formatCurrency(bookingAmount, currency)}</span>
                    </div>

                    <button
                      type="button"
                      className="adm-btn adm-btn-pay"
                      style={{ width: "100%" }}
                      onClick={handlePay}
                      disabled={submitting}
                    >
                      <Icon.Lock />
                      {submitting ? "Processing Payment…" : `Proceed to Pay ${formatCurrency(bookingAmount, currency)}`}
                    </button>

                    <div className="adm-ssl-note">
                      <Icon.Lock /> Secured by Razorpay · 256-Bit SSL Encrypted
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                STEP 4: Admission Slip & Receipt View
            ══════════════════════════════════════════ */}
            {step === 4 && receipt && (
              <div className="adm-success-container">
                <div className="adm-success-icon-wrap">
                  <Icon.Check />
                </div>
                <h2 className="adm-success-title">Admission Slot Successfully Reserved!</h2>
                <p className="adm-success-subtitle">
                  Congratulations! An official confirmation email with your enrollment details has been sent to{" "}
                  <strong>{receipt.student_email}</strong>.
                </p>

                {/* Admission Summary Card */}
                <div className="adm-success-slip">
                  <div className="adm-slip-grid">
                    <div className="adm-slip-item">
                      <span className="adm-slip-label">Student Name</span>
                      <span className="adm-slip-val">{receipt.student_name}</span>
                    </div>
                    <div className="adm-slip-item">
                      <span className="adm-slip-label">Course Enrolled</span>
                      <span className="adm-slip-val">{receipt.course_title}</span>
                    </div>
                    <div className="adm-slip-item">
                      <span className="adm-slip-label">Batch</span>
                      <span className="adm-slip-val">{receipt.batch_name}</span>
                    </div>
                    <div className="adm-slip-item">
                      <span className="adm-slip-label">Class Commencement Date</span>
                      <span className="adm-slip-val" style={{ color: "#059669" }}>
                        {formatDate(receipt.class_start_date)}
                      </span>
                    </div>
                    <div className="adm-slip-item">
                      <span className="adm-slip-label">Amount Paid</span>
                      <span className="adm-slip-val">
                        {formatCurrency(receipt.booking_amount, receipt.currency)}
                      </span>
                    </div>
                    <div className="adm-slip-item">
                      <span className="adm-slip-label">Transaction / Ref ID</span>
                      <span className="adm-slip-val" style={{ fontSize: "12px", fontFamily: "monospace" }}>
                        {receipt.transaction_id || receipt.invoice_no || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code Verification */}
                {(() => {
                  const receiptUrl = getReceiptPublicUrl(receipt.invoice_uuid);
                  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    receiptUrl
                  )}`;
                  return (
                    <div>
                      <div className="adm-qr-card">
                        <img src={qrCodeUrl} alt="Receipt QR Code" />
                        <div className="adm-qr-info">
                          <h4 className="adm-qr-title">Instant Digital Verification QR</h4>
                          <p className="adm-qr-desc">
                            Scan to view the live official digitally signed admission voucher and tax invoice.
                          </p>
                        </div>
                      </div>

                      <div className="adm-success-actions">
                        <button type="button" className="adm-btn adm-btn-primary" onClick={handleDownloadReceipt}>
                          <Icon.Download /> Download Official PDF Receipt
                        </button>
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-btn adm-btn-secondary"
                        >
                          View Public Invoice Online ↗
                        </a>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginTop: "32px" }}>
                  <Link
                    href="/"
                    style={{ fontSize: "14px", color: "#4338ca", textDecoration: "none", fontWeight: 600 }}
                  >
                    ← Return to Homepage
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons (Steps 0 to 3) */}
          {step < 4 && (
            <div className="adm-footer-actions">
              <div>
                {step > 0 && (
                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary"
                    onClick={handleBack}
                    disabled={submitting}
                  >
                    <Icon.ArrowLeft /> Back
                  </button>
                )}
              </div>

              <div>
                {step < 3 && (
                  <button
                    type="button"
                    className="adm-btn adm-btn-primary"
                    onClick={handleNext}
                    disabled={submitting || checking}
                  >
                    {checking ? "Checking Availability…" : "Continue to Next Step"} <Icon.ArrowRight />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
