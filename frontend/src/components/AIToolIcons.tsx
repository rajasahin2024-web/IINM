"use client";
import React from "react";

interface IconProps {
  size?: number;
  opacity?: number;
}

export const ClaudeIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#1a1a2e" opacity="0.08"/>
    <path d="M24 8C24 8 14 14 14 24C14 31.18 18.42 37.08 24 39C29.58 37.08 34 31.18 34 24C34 14 24 8 24 8Z" stroke="#CC785C" strokeWidth="2.5" fill="none" opacity="0.7"/>
    <path d="M24 14C24 14 18 18 18 24C18 28.42 20.78 32.22 24 33.6C27.22 32.22 30 28.42 30 24C30 18 24 14 24 14Z" stroke="#D4A574" strokeWidth="2" fill="none" opacity="0.6"/>
    <circle cx="24" cy="24" r="3" fill="#CC785C" opacity="0.5"/>
  </svg>
);

export const ChatGPTIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#10A37F" opacity="0.08"/>
    <path d="M24 6L36 13V27L24 34L12 27V13L24 6Z" stroke="#10A37F" strokeWidth="2.5" fill="none" opacity="0.7"/>
    <path d="M24 12L31 16.5V25.5L24 30L17 25.5V16.5L24 12Z" stroke="#0D8C6D" strokeWidth="2" fill="none" opacity="0.6"/>
    <path d="M24 18L27 20V24L24 26L21 24V20L24 18Z" fill="#10A37F" opacity="0.5"/>
  </svg>
);

export const GeminiIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="none"/>
    <path d="M24 4L28 16L40 20L28 24L24 36L20 24L8 20L20 16L24 4Z" fill="#4285F4" opacity="0.12"/>
    <path d="M24 4L28 16L40 20L28 24L24 36L20 24L8 20L20 16L24 4Z" stroke="#4285F4" strokeWidth="1.8" fill="none" opacity="0.6"/>
    <path d="M24 10L26.5 17.5L34 20L26.5 22.5L24 30L21.5 22.5L14 20L21.5 17.5L24 10Z" fill="#EA4335" opacity="0.15"/>
    <circle cx="24" cy="20" r="3" fill="#FBBC05" opacity="0.3"/>
  </svg>
);

export const GrokIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#000" opacity="0.06"/>
    <path d="M14 12C14 12 18 12 20 16C22 20 20 24 18 26C16 28 14 30 14 30" stroke="#1a1a1a" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>
    <path d="M22 14C22 14 26 14 28 18C30 22 28 26 26 28C24 30 22 32 22 32" stroke="#333" strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round"/>
    <path d="M30 12C30 12 34 12 36 16C38 20 36 24 34 26C32 28 30 30 30 30" stroke="#1a1a1a" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>
    <circle cx="24" cy="36" r="3" fill="#333" opacity="0.3"/>
  </svg>
);

export const CursorIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#1e1e1e" opacity="0.06"/>
    <path d="M16 8L16 32L20 26L26 38L30 36L24 24L32 24L16 8Z" stroke="#1e1e1e" strokeWidth="2.5" fill="none" opacity="0.65" strokeLinejoin="round"/>
    <path d="M18 12L18 28L21 23L26 32L28 31L23 22L28 22L18 12Z" fill="#1e1e1e" opacity="0.25"/>
  </svg>
);

export const WindsurfIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#00A8E8" opacity="0.06"/>
    <path d="M8 30C12 26 16 28 20 24C24 20 28 22 32 18C36 14 40 16 42 14" stroke="#00A8E8" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>
    <path d="M8 36C14 32 18 34 24 28C30 22 34 24 40 20" stroke="#0077B6" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
    <path d="M12 38L18 30L24 32L30 26L36 28" stroke="#00A8E8" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
    <circle cx="36" cy="18" r="3" fill="#00A8E8" opacity="0.25"/>
  </svg>
);

export const KimiIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#6B46C1" opacity="0.06"/>
    <path d="M24 8C16 8 10 14 10 22C10 30 16 36 24 36" stroke="#6B46C1" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>
    <path d="M24 12C18 12 14 16 14 22C14 28 18 32 24 32" stroke="#8B5CF6" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
    <path d="M24 16C20 16 18 18 18 22C18 26 20 28 24 28" stroke="#A78BFA" strokeWidth="1.8" fill="none" opacity="0.4" strokeLinecap="round"/>
    <circle cx="24" cy="22" r="2" fill="#6B46C1" opacity="0.35"/>
  </svg>
);

export const QwenIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#FF6A00" opacity="0.06"/>
    <circle cx="22" cy="20" r="12" stroke="#FF6A00" strokeWidth="2.5" fill="none" opacity="0.6"/>
    <circle cx="22" cy="20" r="7" stroke="#FF8533" strokeWidth="2" fill="none" opacity="0.45"/>
    <path d="M30 28L38 38" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
    <path d="M32 26L40 36" stroke="#FF8533" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    <circle cx="22" cy="20" r="3" fill="#FF6A00" opacity="0.25"/>
  </svg>
);

export const NvidiaIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#76B900" opacity="0.08"/>
    <path d="M12 14C12 14 18 10 24 10C30 10 36 14 36 14V30C36 30 30 26 24 26C18 26 12 30 12 30V14Z" stroke="#76B900" strokeWidth="2.5" fill="none" opacity="0.65" strokeLinejoin="round"/>
    <path d="M16 16C16 16 20 13 24 13C28 13 32 16 32 16V28C32 28 28 25 24 25C20 25 16 28 16 28V16Z" stroke="#5A8F00" strokeWidth="2" fill="none" opacity="0.5" strokeLinejoin="round"/>
    <circle cx="24" cy="19" r="4" stroke="#76B900" strokeWidth="1.5" fill="none" opacity="0.4"/>
    <path d="M22 17L26 21M26 17L22 21" stroke="#76B900" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>
  </svg>
);

export const MicrosoftIcon: React.FC<IconProps> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="none"/>
    <rect x="8" y="8" width="14" height="14" rx="2" fill="#F25022" opacity="0.15"/>
    <rect x="26" y="8" width="14" height="14" rx="2" fill="#7FBA00" opacity="0.15"/>
    <rect x="8" y="26" width="14" height="14" rx="2" fill="#00A4EF" opacity="0.15"/>
    <rect x="26" y="26" width="14" height="14" rx="2" fill="#FFB900" opacity="0.15"/>
    <rect x="8" y="8" width="14" height="14" rx="2" stroke="#F25022" strokeWidth="1.8" opacity="0.5"/>
    <rect x="26" y="8" width="14" height="14" rx="2" stroke="#7FBA00" strokeWidth="1.8" opacity="0.5"/>
    <rect x="8" y="26" width="14" height="14" rx="2" stroke="#00A4EF" strokeWidth="1.8" opacity="0.5"/>
    <rect x="26" y="26" width="14" height="14" rx="2" stroke="#FFB900" strokeWidth="1.8" opacity="0.5"/>
  </svg>
);
