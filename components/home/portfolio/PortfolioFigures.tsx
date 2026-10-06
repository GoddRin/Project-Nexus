"use client";

import React from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, HardHat, Leaf, MapPinned, Zap } from "lucide-react";
import { fadeUp, inView, stagger } from "@/components/home/motionPresets";
import { StatTile } from "@/components/home/primitives/StatTile";

const oneDecimalIfNeeded = (n: number) => (n % 1 ? 1 : 0);

/** The portfolio's six figures, each counted up as the row scrolls into view, one after another. */
export function PortfolioFigures({ total, ongoing, completed, totalMw, renewableMw, provinces }: { total: number; ongoing: number; completed: number; totalMw: number; renewableMw: number; provinces: number }) {
  const tiles = [
    { icon: Building2, label: "Projects on record", value: total, tone: "green" as const },
    { icon: HardHat, label: "Ongoing", value: ongoing, tone: "amber" as const },
    { icon: CheckCircle2, label: "Completed", value: completed, tone: "blue" as const },
    { icon: Zap, label: "Power plants worked on", value: totalMw, decimals: oneDecimalIfNeeded(totalMw), unit: "MW", tone: "cyan" as const },
    { icon: Leaf, label: "Of which hydro, wind, solar", value: renewableMw, decimals: oneDecimalIfNeeded(renewableMw), unit: "MW", tone: "green" as const },
    { icon: MapPinned, label: "Provinces", value: provinces, tone: "blue" as const },
  ];
  return (
    <motion.div variants={stagger(70)} {...inView} className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {tiles.map((t) => (
        <motion.div key={t.label} variants={fadeUp} className="min-w-0">
          <StatTile {...t} className="h-full" />
        </motion.div>
      ))}
    </motion.div>
  );
}
