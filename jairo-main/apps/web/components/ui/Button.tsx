"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: "left" | "right";
    fullWidth?: boolean;
}

export function Button({
    children,
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    iconPosition = "left",
    fullWidth = false,
    disabled,
    className = "",
    ...props
}: ButtonProps) {
    const variantClasses = {
        primary: "bg-primary text-white hover:bg-primary-600 focus:ring-primary/20",
        secondary: "bg-secondary text-white hover:bg-secondary-600 focus:ring-secondary/20",
        outline: "border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary/20",
        ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-200",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-200"
    };

    const sizeClasses = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5",
        lg: "px-6 py-3 text-lg"
    };

    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-xl
        transition-all duration-200 focus:outline-none focus:ring-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="animate-spin" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
            {!loading && icon && iconPosition === "left" && icon}
            {children}
            {!loading && icon && iconPosition === "right" && icon}
        </button>
    );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    variant?: "primary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
}

export function IconButton({
    icon,
    variant = "ghost",
    size = "md",
    loading = false,
    disabled,
    className = "",
    ...props
}: IconButtonProps) {
    const variantClasses = {
        primary: "bg-primary text-white hover:bg-primary-600",
        ghost: "text-gray-600 hover:bg-gray-100",
        danger: "text-red-500 hover:bg-red-50"
    };

    const sizeClasses = {
        sm: "p-1.5",
        md: "p-2",
        lg: "p-3"
    };

    return (
        <button
            className={`
        inline-flex items-center justify-center rounded-xl
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? <Loader2 className="animate-spin" size={16} /> : icon}
        </button>
    );
}
