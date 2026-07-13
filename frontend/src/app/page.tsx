"use client";
import React from "react";
import PublicNavbar from "../components/PublicNavbar";
import HeroSlider from "../components/HeroSlider";
import PartnerSection from "../components/PartnerSection";
import CourseCategoriesSection from "../components/CourseCategoriesSection";
import AIEcosystemSection from "../components/AIEcosystemSection";
import RecentlyLaunchedCourses from "../components/RecentlyLaunchedCourses";
import FounderDeskSection from "../components/FounderDeskSection";
import StudentReelsSection from "../components/StudentReelsSection";
import TrustedLearnersSection from "../components/TrustedLearnersSection";
import PublicFooter from "../components/PublicFooter";
import LazySection from "../components/LazySection";
import AnimatedCTASection from "../components/AnimatedCTASection";
import BlogSection from "../components/BlogSection";
import Link from "next/link";
import "./home.css";

export default function Home() {
  return (
    <div className="hp-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── IMMEDIATE (Above-the-fold) ── */}
      <PublicNavbar />
      <HeroSlider />
      <PartnerSection />

      {/* ── LAZY (Below-the-fold, load when scrolled near viewport) ── */}
      <LazySection fallbackHeight={500}>
        <CourseCategoriesSection />
      </LazySection>

      <LazySection fallbackHeight={1200}>
        <AIEcosystemSection />
      </LazySection>

      <LazySection fallbackHeight={600}>
        <RecentlyLaunchedCourses />
      </LazySection>

      <LazySection fallbackHeight={700}>
        <FounderDeskSection />
      </LazySection>

      <LazySection fallbackHeight={700}>
        <StudentReelsSection />
      </LazySection>

      <LazySection fallbackHeight={500}>
        <TrustedLearnersSection />
      </LazySection>

      <LazySection fallbackHeight={500}>
        <AnimatedCTASection />
      </LazySection>

      <LazySection fallbackHeight={600}>
        <BlogSection />
      </LazySection>

      <LazySection fallbackHeight={400}>
        <PublicFooter />
      </LazySection>
    </div>
  );
}
