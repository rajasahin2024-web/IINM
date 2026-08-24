// Shared types for HeroSlider and HeroSliderAdmin.
// Extracted so the admin component can import them without pulling in the
// full HeroSlider module.

export interface SlideData {
  badge: string;
  title: string;
  highlightText: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  googleRating: string;
  trustpilotRating: string;
}

export interface HomeHeroData {
  slides: SlideData[];
  videoYoutubeId: string;
  videoThumbnailUrl?: string;
  avatarImages: string[];
  googleRatingText: string;
  googleRatingStars: number;
  googleRatingSubtext: string;
  playerWidth?: number;
  playerTop?: number;
  playerLeft?: number;
}

export const defaultHeroData: HomeHeroData = {
  slides: [
    {
      badge: "IINM CONNECTING THE DOTS",
      title: "Next-Gen AI-Powered Connected Learning Platform",
      highlightText: "AI-Powered",
      description: "Transform your tech career with our state-of-the-art curriculum, expert mentorship, and hands-on laboratory learning. Join the pioneers connecting the dots of Artificial Intelligence.",
      primaryCtaText: "Get Started",
      primaryCtaLink: "/courses",
      secondaryCtaText: "Explore Courses",
      secondaryCtaLink: "/courses",
      googleRating: "4.9/5",
      trustpilotRating: "5/5",
    },
    {
      badge: "ROBOTICS & IoT LABS",
      title: "Hands-on Practical Training & Intelligent Robotics",
      highlightText: "Intelligent Robotics",
      description: "Step into our industry-standard robotics laboratories. Design, program, and deploy smart hardware systems, physical IoT devices, and deep learning models in real time.",
      primaryCtaText: "Explore Labs",
      primaryCtaLink: "/about-us",
      secondaryCtaText: "Learn About Us",
      secondaryCtaLink: "/about-us",
      googleRating: "4.9/5",
      trustpilotRating: "5/5",
    },
    {
      badge: "GLOBAL CERTIFICATION",
      title: "Secure Premium Placements in Top-Tier Tech Roles",
      highlightText: "Top-Tier Tech Roles",
      description: "Obtain industry-recognized global certifications. Leverage our network of tech recruitment partners, interview coaching, and career guidance workshops.",
      primaryCtaText: "View Careers",
      primaryCtaLink: "/contact-us",
      secondaryCtaText: "Contact Admissions",
      secondaryCtaLink: "/contact-us",
      googleRating: "4.9/5",
      trustpilotRating: "5/5",
    },
  ],
  videoYoutubeId: "FwOTs4UxQS4",
  videoThumbnailUrl: "",
  avatarImages: [
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=80&h=80&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80",
  ],
  googleRatingText: "4.4/5",
  googleRatingStars: 5,
  googleRatingSubtext: "Trusted Google Rating by Indian Learners",
  playerWidth: 680,
  playerTop: 0,
  playerLeft: 0,
};
