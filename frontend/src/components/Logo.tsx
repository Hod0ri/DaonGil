import React from 'react';

const Logo = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg 
    width="150" 
    height="50" 
    viewBox="0 0 150 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Stylized Path/Road Background */}
    <path 
      d="M10 40 C 40 40, 50 20, 80 20 S 120 40, 140 30" 
      stroke="url(#paint0_linear)" 
      strokeWidth="4" 
      strokeLinecap="round"
    />
    
    {/* Text "DaonGil" */}
    <text 
      x="50%" 
      y="50%" 
      dominantBaseline="middle" 
      textAnchor="middle" 
      fill="#4A4A4A" 
      fontSize="28" 
      fontWeight="bold" 
      fontFamily="'Gowun Dodum', sans-serif"
    >
      DaonGil
    </text>
    
    {/* Heart Accent */}
    <path 
      d="M135 15 C 135 10, 145 10, 145 15 C 145 25, 135 30, 135 30 C 135 30, 125 25, 125 15 C 125 10, 135 10, 135 15 Z" 
      fill="#FFB7C5" 
    />

    <defs>
      <linearGradient id="paint0_linear" x1="10" y1="40" x2="140" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFB7C5"/>
        <stop offset="1" stopColor="#A2D2FF"/>
      </linearGradient>
    </defs>
  </svg>
);

export default Logo;
