import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

/**
 * WholesaleCalculator — gated margin calculator (approved mockup 2026-07-05,
 * gate per Alex 7/2: wholesale pricing is NEVER shown publicly).
 *
 * Only public math here is revenue at MSRP ($49.99). Cost and profit cells are
 * decorative locked placeholders — no wholesale numbers exist anywhere in
 * client code; real pricing is shared post-approval.
 */

const MSRP = 49.99;

export function WholesaleCalculator() {
  const [bags, setBags] = useState(20);
  const revenue = MSRP * bags;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1C130B] text-[#EDE6D6] p-8 md:p-10 mb-12 grid md:grid-cols-2 gap-8 md:gap-12">
      <div>
        <h2 className="text-2xl md:text-[26px] font-display font-extrabold uppercase text-[#FBF5E9]">
          Your Shelf, Your Margin.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#EDE6D6]/60">
          MSRP is ${MSRP.toFixed(2)}. Your wholesale pricing — and the margin
          math — unlocks the moment your application is approved.
        </p>

        <label
          htmlFor="ws-bags"
          className="block mt-7 text-[10.5px] font-bold tracking-[0.22em] uppercase text-[#C9A86A]"
        >
          Bags sold per month
        </label>
        <input
          id="ws-bags"
          type="range"
          min={5}
          max={100}
          step={5}
          value={bags}
          onChange={(e) => setBags(Number(e.target.value))}
          className="w-full mt-3.5 accent-primary cursor-pointer"
        />
        <div className="mt-1.5 font-display text-xl font-extrabold">
          {bags} bags / month
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 content-center">
        <div className="rounded-xl border border-[#EDE6D6]/12 bg-[#EDE6D6]/5 p-5">
          <div className="font-display font-black text-2xl md:text-3xl text-[#C9A86A]">
            $
            {revenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="mt-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-[#EDE6D6]/50">
            Monthly Revenue at MSRP
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-[#EDE6D6]/12 bg-[#EDE6D6]/5 p-5">
          <div className="font-display font-black text-2xl md:text-3xl blur-[7px] select-none" aria-hidden="true">
            $•••.••
          </div>
          <div className="mt-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-[#EDE6D6]/50">
            Your Cost
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <Lock className="w-5 h-5 text-[#C9A86A]" aria-label="Locked until approval" />
          </div>
        </div>

        <div className="relative overflow-hidden col-span-2 rounded-xl border border-[#C9A86A]/35 bg-[#B5862E]/15 p-5">
          <div className="font-display font-black text-3xl md:text-4xl blur-[7px] select-none" aria-hidden="true">
            $•,•••.••
          </div>
          <div className="mt-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-[#EDE6D6]/60">
            Monthly Profit — margins that beat the big electrolyte brands
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/35">
            <Lock className="w-5 h-5 text-[#C9A86A]" aria-hidden="true" />
            <Link href="/wholesale/apply">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
              >
                Apply to Unlock Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
