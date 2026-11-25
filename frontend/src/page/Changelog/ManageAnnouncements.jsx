
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Zap,
  Bug,
  RefreshCw,
  Megaphone,
} from "lucide-react";

import announcementService from "../../services/announcementService";

const initialForm = {
  title: "",
  description: "",
  version: "",
  type: "feature",
};

const typeConfig = {
  feature: {
    label: "New Feature",
    icon: Sparkles,
    color: "bg-emerald-50 text-emerald-700",
  },
  improvement: {
    label: "Improvement",
    icon: Zap,
    color: "bg-blue-50 text-blue-700",
  },
  bugfix: {
    label: "Bug Fix",
    icon: Bug,
    color: "bg-orange-50 text-orange-700",
  },
};

const ManageAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const data = await announcementService.getAdminAll();

      setAnnouncements(data.announcements || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load announcements"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item._id);

    setForm({
      title: item.title,
      description: item.description,
      version: item.version,
      type: item.type,
    });

    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim() ||
        !form.version.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await announcementService.update(editingId, form);
        toast.success("Update saved successfully");
      } else {
        await announcementService.create(form);
        toast.success("Announcement created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);

      await fetchAnnouncements();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await announcementService.togglePublish(id);

      toast.success("Publish status updated");
      await fetchAnnouncements();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update status"
      );
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this update?"
    );

    if (!confirmed) return;

    try {
      await announcementService.delete(id);

      toast.success("Announcement deleted");
      await fetchAnnouncements();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete announcement"
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not published";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Megaphone className="text-emerald-600" size={20} />

              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Product Management
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Manage Updates
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Create and manage Smart Tractor changelog entries.
            </p>
          </div>

          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus size={18} />
            Create Update
          </button>
        </div>

        {/* Stats */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-gray-500">Total Updates</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {announcements.length}
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-gray-500">Published</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">
              {announcements.filter((a) => a.isPublished).length}
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-gray-500">Drafts</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-500">
              {announcements.filter((a) => !a.isPublished).length}
            </h2>
          </div>
        </div>

        {/* Announcement List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-5">
            <h2 className="font-bold text-gray-900">
              All Updates
            </h2>

            <button
              onClick={fetchAnnouncements}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="animate-spin text-emerald-600" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Megaphone className="mx-auto mb-3 text-gray-300" size={40} />

              <h3 className="font-semibold text-gray-800">
                No updates created
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Create your first product update.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {announcements.map((item) => {
                const config =
                  typeConfig[item.type] || typeConfig.feature;

                const Icon = config.icon;

                return (
                  <div
                    key={item._id}
                    className="flex flex-col justify-between gap-5 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                          v{item.version}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}
                        >
                          <Icon size={13} />
                          {config.label}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.isPublished
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {item.isPublished ? "Published" : "Draft"}
                        </span>
                      </div>

                      <h3 className="truncate font-bold text-gray-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {item.description}
                      </p>

                      <p className="mt-3 text-xs text-gray-400">
                        {formatDate(item.publishedAt || item.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openEditForm(item)}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        onClick={() => handlePublish(item._id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                          item.isPublished
                            ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {item.isPublished ? (
                          <>
                            <EyeOff size={14} />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            Publish
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(item._id)}
                        className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? "Edit Update" : "Create New Update"}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Add a new product changelog entry.
                  </p>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-5">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Update Title
                  </label>

                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. New Dashboard Design"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe what's new..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Version
                    </label>

                    <input
                      name="version"
                      value={form.version}
                      onChange={handleChange}
                      placeholder="1.1.0"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Update Type
                    </label>

                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="feature">New Feature</option>
                      <option value="improvement">Improvement</option>
                      <option value="bugfix">Bug Fix</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Create Draft"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAnnouncements;
