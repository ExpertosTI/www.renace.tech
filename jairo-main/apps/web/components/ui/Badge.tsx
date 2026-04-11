"use client";

import { ReactNode } from "react";

interface BadgeProps {
    children: ReactNode;
    variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "gray";
    size?: "sm" | "md";
    dot?: boolean;
}

export function Badge({ children, variant = "gray", size = "sm", dot = false }: BadgeProps) {
    const variantClasses = {
        primary: "bg-primary/10 text-primary",
        secondary: "bg-secondary/10 text-secondary",
        success: "bg-green-100 text-green-700",
        warning: "bg-orange-100 text-orange-700",
        danger: "bg-red-100 text-red-700",
        gray: "bg-gray-100 text-gray-700"
    };

    const sizeClasses = {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm"
    };

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${variant === "primary" ? "bg-primary" :
                        variant === "secondary" ? "bg-secondary" :
                            variant === "success" ? "bg-green-500" :
                                variant === "warning" ? "bg-orange-500" :
                                    variant === "danger" ? "bg-red-500" :
                                        "bg-gray-500"
                    }`} />
            )}
            {children}
        </span>
    );
}

interface StatusBadgeProps {
    status: "active" | "pending" | "inactive" | "open" | "closed" | "accepted" | "rejected";
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const statusConfig = {
        active: { label: "Activo", variant: "success" as const },
        pending: { label: "Pendiente", variant: "warning" as const },
        inactive: { label: "Inactivo", variant: "gray" as const },
        open: { label: "Abierto", variant: "success" as const },
        closed: { label: "Cerrado", variant: "gray" as const },
        accepted: { label: "Aceptado", variant: "success" as const },
        rejected: { label: "Rechazado", variant: "danger" as const }
    };

    const config = statusConfig[status] || statusConfig.inactive;

    return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

interface CountBadgeProps {
    count: number;
    max?: number;
}

export function CountBadge({ count, max = 99 }: CountBadgeProps) {
    if (count === 0) return null;

    return (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-bold rounded-full">
            {count > max ? `${max}+` : count}
        </span>
    );
}
