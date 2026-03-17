import React from "react";
import { motion } from "motion/react";
import { Briefcase, User, Calendar, FileText, Mail, Filter, AlertTriangle, DollarSign, Bell, Heart } from "lucide-react";

export type Category = "Todos" | "Urgente" | "Trabalho & Carreira" | "Finanças & Contas" | "Pessoal" | "Atualizações" | "Outros";

interface FilterBarProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

const categories: { label: Category; icon: React.ElementType }[] = [
  { label: "Todos", icon: Filter },
  { label: "Urgente", icon: AlertTriangle },
  { label: "Trabalho & Carreira", icon: Briefcase },
  { label: "Finanças & Contas", icon: DollarSign },
  { label: "Pessoal", icon: Heart },
  { label: "Atualizações", icon: Bell },
  { label: "Outros", icon: Mail },
];

export function FilterBar({ selectedCategory, onSelectCategory }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
      {categories.map(({ label, icon: Icon }) => {
        const isSelected = selectedCategory === label;
        return (
          <button
            key={label}
            onClick={() => onSelectCategory(label)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              isSelected
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-100" : "text-gray-400"}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
