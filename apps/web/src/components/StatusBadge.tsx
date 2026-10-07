import React from "react";

export type BadgeStatus =
  | "READY"
  | "APPROVED"
  | "RELEASED"
  | "REVIEW_REQUIRED"
  | "INCOMPLETE"
  | "VERIFIED"
  | "MISSING"
  | "OPEN"
  | "RISK_ACCEPTED"
  | "PASSED"
  | "FAILED";

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  let bg = "bg-gray-800 text-gray-300 border-gray-700";
  let dot = "bg-gray-400";
  let label = status.replace(/_/g, " ");

  switch (status) {
    case "READY":
    case "VERIFIED":
    case "PASSED":
      bg = "bg-emerald-950/60 text-emerald-400 border-emerald-800/80";
      dot = "bg-emerald-400";
      break;
    case "APPROVED":
    case "RELEASED":
      bg = "bg-blue-950/60 text-blue-400 border-blue-800/80";
      dot = "bg-blue-400";
      break;
    case "REVIEW_REQUIRED":
      bg = "bg-amber-950/60 text-amber-300 border-amber-800/80";
      dot = "bg-amber-400";
      label = "REVIEW REQUIRED";
      break;
    case "INCOMPLETE":
    case "FAILED":
    case "MISSING":
    case "OPEN":
      bg = "bg-rose-950/60 text-rose-400 border-rose-800/80";
      dot = "bg-rose-400";
      break;
    case "RISK_ACCEPTED":
      bg = "bg-purple-950/60 text-purple-300 border-purple-800/80";
      dot = "bg-purple-400";
      label = "RISK ACCEPTED";
      break;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
    lg: "px-3.5 py-1.5 text-sm font-bold tracking-wide"
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
}
