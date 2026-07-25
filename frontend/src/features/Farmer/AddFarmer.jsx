import React, { useRef, useState } from "react";
import PageHeader from "../../components/UI/PageHeader";
import Card from "../../components/UI/Card";
import Field from "../../components/UI/Field";
import PrimaryButton from "../../components/UI/PrimaryButton";
import axios from "axios";
import { IoMicOutline } from "react-icons/io5";
import { FiMicOff } from "react-icons/fi";

const EMPTY_FORM = {
  name: "",
  fatherName: "",
  phone: "",
  village: "",
  address: "",
  notes: "",
};
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export default function AddFarmer() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }

  const recognitionRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 1800);
  };

  // ---- Voice input ----
  // Speech recognition (lang="hi-IN") returns Devanagari text, so the
  // keywords we search for must be in Devanagari too — e.g. "नाम",
  // "फादर नेम", "फोन नंबर", "विलेज"/"गांव", "पता"/"एड्रेस".
  const parseVoiceText = (text) => {
    const nameMatch = text.match(
      /नाम\s+(.+?)(?=\s*(?:फादर नेम|फोन नंबर|मोबाइल नंबर|विलेज|गांव|गाँव|पता|एड्रेस|$))/
    );
    const fatherMatch = text.match(
      /फादर नेम\s+(.+?)(?=\s*(?:नाम|फोन नंबर|मोबाइल नंबर|विलेज|गांव|गाँव|पता|एड्रेस|$))/
    );
    const villageMatch = text.match(
      /(?:विलेज|गांव|गाँव)\s+(.+?)(?=\s*(?:नाम|फादर नेम|फोन नंबर|मोबाइल नंबर|पता|एड्रेस|$))/
    );
    const addressMatch = text.match(/(?:पता|एड्रेस)\s+(.+)/);

    // Phone numbers often come through with a space in the middle
    // (e.g. "9661 720780"), so match digit groups and strip spaces.
    const phoneMatch = text.match(/\d[\d\s]{8,13}\d/);

    return {
      name: nameMatch?.[1]?.trim() || "",
      fatherName: fatherMatch?.[1]?.trim() || "",
      phone: phoneMatch ? phoneMatch[0].replace(/\s/g, "") : "",
      village: villageMatch?.[1]?.trim() || "",
      address: addressMatch?.[1]?.trim() || "",
    };
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    // If already listening, treat the button as a stop toggle instead of
    // starting a second overlapping recognition session.
    if (listening) {
      stopListening();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("error", "Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const parsed = parseVoiceText(text);

      setFormData((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(parsed).filter(([, value]) => value) // keep only fields voice actually filled
        ),
      }));
    };

    recognition.onerror = () => {
      setListening(false);
      showToast("error", "Couldn't catch that. Try again.");
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  // ---- Submit ----
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      await axios.post(`${API}/farmer`, formData, {
        withCredentials: true,
      });

      showToast("success", "Farmer added successfully");
      setFormData(EMPTY_FORM);
    } catch (error) {
      console.error("Failed to add farmer:", error);
      showToast("error", "Couldn't save farmer. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add Farmer" subtitle="Create a new farmer profile" />

      <Card className="p-6 max-w-3xl">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Farmer Name">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
              required
            />
          </Field>

          <Field label="Father Name">
            <input
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
            />
          </Field>

          <Field label="Phone">
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
            />
          </Field>

          <Field label="Village">
            <input
              name="village"
              value={formData.village}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
            />
          </Field>

          <Field label="Address" className="sm:col-span-2">
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
            />
          </Field>

          <Field label="Notes" className="sm:col-span-2">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
            />
          </Field>

          <div className="sm:col-span-2 flex items-center gap-5">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Farmer"}
            </PrimaryButton>

            <button
              type="button"
              onClick={startListening}
              className="flex items-center gap-3 border px-4 py-2 rounded-2xl transition-colors hover:bg-green-600 hover:text-white"
            >
              {listening ? <FiMicOff size={20} /> : <IoMicOutline size={20} />}
              {listening ? "Listening..." : "Voice"}
            </button>
          </div>
        </form>
      </Card>

      {toast && (
        <div
          className={`toast fixed bottom-8 right-8 px-4 py-2 rounded-xl text-white ${
            toast.type === "error" ? "bg-red-600" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}