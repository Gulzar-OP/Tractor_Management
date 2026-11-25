
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Sparkles,
  Bug,
  Zap,
  CalendarDays,
  Clock,
  RefreshCw,
  PackageOpen,
} from "lucide-react";

import announcementService from "../../services/announcementService";

const typeConfig = {
  feature: {
    label: "New Feature",
    icon: Sparkles,
    color: "text-emerald-600 bg-emerald-50",
  },
  improvement: {
    label: "Improvement",
    icon: Zap,
    color: "text-blue-600 bg-blue-50",
  },
  bugfix: {
    label: "Bug Fix",
    icon: Bug,
    color: "text-orange-600 bg-orange-50",
  },
};

const Changelog = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const data = await announcementService.getAll();

      setAnnouncements(data.announcements || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load updates"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              PRODUCT UPDATES
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            What's New?
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
            Stay updated with the latest features,
            improvements and bug fixes in Smart Tractor.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && announcements.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <PackageOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />

            <h2 className="text-lg font-semibold text-gray-800">
              No updates yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              New product updates will appear here.
            </p>
          </div>
        )}

        {/* Timeline */}
        {!loading && announcements.length > 0 && (
          <div className="relative">

            <div className="absolute bottom-0 left-[7px] top-2 w-px bg-gray-200 sm:left-[9px]" />

            <div className="space-y-10">
              {announcements.map((item) => {
                const config =
                  typeConfig[item.type] || typeConfig.feature;

                const Icon = config.icon;

                return (
                  <div
                    key={item._id}
                    className="relative pl-8 sm:pl-12"
                  >
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-600 sm:h-5 sm:w-5" />

                    {/* Content Card */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-7">

                      {/* Version + Date */}
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                          VERSION {item.version}
                        </span>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CalendarDays size={14} />
                          {formatDate(item.publishedAt)}
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold text-gray-900">
                        {item.title}
                      </h2>

                      {/* Description */}
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                        {item.description}
                      </p>

                      {/* Type */}
                      <div className="mt-6 flex">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${config.color}`}
                        >
                          <Icon size={14} />
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            Smart Tractor · Product Changelog
          </p>
        </div>
      </div>
    </div>
  );
};

export default Changelog;
