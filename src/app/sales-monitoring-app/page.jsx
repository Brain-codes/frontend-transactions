"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import {
  Download,
  Share2,
  Star,
  ChevronRight,
  Shield,
  Trash2,
  Lock,
  Upload,
  AlertCircle,
  Smartphone,
  Monitor,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

/* ─── static data ─── */
const APP = {
  name: "Sales Monitoring App",
  developer: "Atmosfair",
  tagline: "Track sales, manage agents, and sync data — on the go.",
  version: "1.0.0",
  updatedOn: "June 2, 2026",
  size: "~45 MB",
  requires: "Android 8.0+",
  apkPath: "/downloads/sales-monitoring-app.apk",
};

const SCREENSHOTS = [
  { label: "Dashboard", bg: "from-blue-900 to-blue-700" },
  { label: "Sales Record", bg: "from-indigo-900 to-indigo-700" },
  { label: "Agent View", bg: "from-cyan-900 to-cyan-700" },
  { label: "Stove Manager", bg: "from-teal-900 to-teal-700" },
  { label: "Offline Sync", bg: "from-slate-800 to-slate-600" },
];

const TAGS = [
  "Sales Management",
  "Field Operations",
  "Offline-first",
  "Agent Tracking",
  "Stove Manager",
  "Enterprise",
];

const DATA_SAFETY = [
  {
    icon: Share2,
    title: "This app may share these data types with third parties",
    sub: "Sales records, Location data",
  },
  {
    icon: Upload,
    title: "This app may collect these data types",
    sub: "Sales data, Location, Device info",
  },
  {
    icon: Lock,
    title: "Data is encrypted in transit",
    sub: null,
  },
  {
    icon: Trash2,
    title: "You can request that data be deleted",
    sub: null,
  },
];

const REVIEWS = [
  {
    initials: "OA",
    bg: "bg-blue-600",
    name: "Organisation Admin",
    stars: 5,
    date: "Jun 1, 2026",
    body: "Very smooth experience for managing sales in the field. The offline mode is a lifesaver in areas with poor connectivity.",
  },
  {
    initials: "SA",
    bg: "bg-purple-600",
    name: "Sales Agent",
    stars: 5,
    date: "May 28, 2026",
    body: "Simple and intuitive. Recording a new sale takes less than a minute. Sync works perfectly when I get back to a good network.",
  },
  {
    initials: "PA",
    bg: "bg-teal-600",
    name: "Partner Agent",
    stars: 4,
    date: "May 20, 2026",
    body: "Great app overall. Would love to see stove transfer history visible in-app. Otherwise very solid.",
  },
];

/* ─── helpers ─── */
function StarRow({ count, filled = true }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < count
              ? "fill-green-600 text-green-600"
              : "fill-gray-300 text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, pct }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-2">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── page ─── */
export default function SalesMonitoringAppPage() {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const { user } = useAuth();

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = APP.apkPath;
    link.download = "Atmosfair-Sales-Monitoring-App.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Hero ── */}
      <div className="bg-[#1f1f1f] text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* back link */}
          {user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          )}

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* App icon */}
            <div className="flex-shrink-0 w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-xl">
              <Smartphone className="h-14 w-14 text-white" />
            </div>

            {/* App meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-medium mb-1">{APP.name}</h1>
              <p className="text-green-400 text-sm font-medium mb-1">
                {APP.developer}
              </p>
              <p className="text-white/50 text-sm mb-4">
                Free · Android only
              </p>

              {/* Rating + downloads row */}
              <div className="flex items-center gap-6 mb-6 text-sm">
                <div className="flex items-center gap-1.5 border-r border-white/20 pr-6">
                  <span className="font-medium">4.8</span>
                  <Star className="h-3.5 w-3.5 fill-white text-white" />
                  <span className="text-white/50 text-xs">3 reviews</span>
                </div>
                <div className="border-r border-white/20 pr-6">
                  <p className="font-medium">Internal</p>
                  <p className="text-white/50 text-xs">Release</p>
                </div>
                <div>
                  <p className="font-medium">{APP.size}</p>
                  <p className="text-white/50 text-xs">Download size</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="bg-[#01875f] hover:bg-[#017352] text-white font-medium px-10 py-3 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download APK
                </button>
                <button className="border border-white/30 hover:bg-white/10 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>

              <p className="text-white/40 text-xs mt-4 flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                This app is available for Android devices only
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0">

            {/* Screenshots */}
            <div className="flex gap-3 overflow-x-auto pb-3 mb-10 scrollbar-hide">
              {SCREENSHOTS.map((s, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 w-40 h-72 rounded-2xl bg-gradient-to-b ${s.bg} flex flex-col items-center justify-end p-4 border border-gray-200`}
                >
                  <span className="text-white/70 text-xs font-medium">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* About */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-medium">About this app</h2>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-3">
                ATMOSFAIR SALES MONITORING — MANAGE SALES IN THE FIELD
              </p>
              <div
                className={`text-sm text-gray-700 leading-relaxed ${
                  !aboutExpanded ? "line-clamp-4" : ""
                }`}
              >
                <p className="mb-3">
                  The Atmosfair Sales Monitoring App is the official mobile
                  companion for your organisation's sales operations. Designed
                  for ACSL agents, partner agents, and organisation admins, it
                  puts everything you need to record, track, and manage sales
                  right in your pocket.
                </p>
                <p className="mb-3">
                  Built offline-first, the app keeps you productive even in
                  areas with poor or no connectivity. All your sales, stove
                  transfers, and partner interactions are queued locally and
                  synced automatically the moment you're back online.
                </p>
                <p>
                  Role-based access ensures each user only sees what's relevant
                  to them — agents see their own pipeline while supervisors get
                  a full organisational view. Enterprise-grade encryption keeps
                  all data secure in transit and at rest.
                </p>
              </div>
              <button
                onClick={() => setAboutExpanded((p) => !p)}
                className="text-green-700 text-sm font-medium mt-2 hover:underline"
              >
                {aboutExpanded ? "Show less" : "more"}
              </button>

              <p className="text-sm text-gray-500 mt-5">
                <span className="font-medium text-gray-800">Updated on</span>{" "}
                {APP.updatedOn}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {TAGS.map((t) => (
                  <span
                    key={t}
                    className="border border-gray-300 rounded-full px-4 py-1 text-xs text-gray-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Data safety */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-medium">Data safety</h2>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Safety starts with understanding how developers collect and
                share your data. Data privacy and security practices may vary
                based on your use and role within the organisation.
              </p>

              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {DATA_SAFETY.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <item.icon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">{item.title}</p>
                      {item.sub && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <button className="text-green-700 text-sm font-medium hover:underline">
                    See details
                  </button>
                </div>
              </div>
            </section>

            {/* Ratings & reviews */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-medium">Ratings and reviews</h2>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>

              <div className="flex gap-10 mb-8 items-center">
                {/* Big number */}
                <div className="text-center">
                  <p className="text-6xl font-light text-gray-900">4.8</p>
                  <div className="flex justify-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < 5
                            ? "fill-green-600 text-green-600"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">3 reviews</p>
                </div>

                {/* Bars */}
                <div className="flex-1 space-y-1.5">
                  <RatingBar label="5" pct={80} />
                  <RatingBar label="4" pct={15} />
                  <RatingBar label="3" pct={5} />
                  <RatingBar label="2" pct={0} />
                  <RatingBar label="1" pct={0} />
                </div>
              </div>

              {/* Individual reviews */}
              <div className="space-y-8">
                {REVIEWS.map((r, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-8 h-8 rounded-full ${r.bg} flex items-center justify-center text-white text-xs font-semibold`}
                      >
                        {r.initials}
                      </div>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <StarRow count={r.stars} />
                      <span className="text-xs text-gray-500">{r.date}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {r.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="lg:w-72 flex-shrink-0 space-y-6">

            {/* Install notice */}
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    Android Only
                  </p>
                  <p className="text-xs text-gray-500">
                    Due to iOS platform restrictions for enterprise
                    applications, this app is only available on Android.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full bg-[#01875f] hover:bg-[#017352] text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download APK
              </button>
            </div>

            {/* App info */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-medium text-sm mb-4">App info</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["Version", APP.version],
                  ["Updated", APP.updatedOn],
                  ["Size", APP.size],
                  ["Requires", APP.requires],
                  ["Developer", APP.developer],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium text-right">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* App support */}
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">App support</h3>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                For help and support, contact{" "}
                <span className="text-green-700 font-medium">
                  support@atmosfair.com
                </span>
              </p>
            </div>

            {/* Who can use */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-medium text-sm mb-4">Who can use this app</h3>
              <div className="space-y-3 text-xs text-gray-600">
                {[
                  // {
                  //   icon: Shield,
                  //   color: "text-blue-500",
                  //   role: "Organisation Admins",
                  //   desc: "Full access to org data & reporting",
                  // },
                  {
                    icon: CheckCircle,
                    color: "text-green-500",
                    role: "Sales Agents (ACSL)",
                    desc: "Create and manage field sales",
                  },
                  {
                    icon: CheckCircle,
                    color: "text-purple-500",
                    role: "Partner Agents",
                    desc: "Manage partner stoves & customers",
                  },
                ].map((item) => (
                  <div key={item.role} className="flex items-start gap-2">
                    <item.icon
                      className={`h-4 w-4 ${item.color} flex-shrink-0 mt-0.5`}
                    />
                    <div>
                      <p className="font-medium text-gray-800">{item.role}</p>
                      <p className="text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 mt-6 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Atmosfair · All rights reserved
      </div>
    </div>
  );
}
