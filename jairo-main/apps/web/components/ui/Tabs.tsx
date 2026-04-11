"use client";

import { useState } from "react";

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    variant?: "underline" | "pills" | "rounded";
}

export function Tabs({ tabs, activeTab, onChange, variant = "underline" }: TabsProps) {
    if (variant === "pills") {
        return (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                                ? "bg-white text-gray-900 shadow"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-primary text-white" : "bg-gray-200"
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    if (variant === "rounded") {
        return (
            <div className="flex gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${activeTab === tab.id
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-gray-300"
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    // Underline variant (default)
    return (
        <div className="flex gap-6 border-b">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition-all ${activeTab === tab.id
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-gray-100"
                            }`}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
