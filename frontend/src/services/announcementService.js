
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const API = `${API_BASE}/api/announcements`;

const announcementService = {
  getAll: async () => {
    const { data } = await axios.get(API, {
      withCredentials: true,
    });
    return data;
  },

  getAdminAll: async () => {
    const { data } = await axios.get(`${API}/admin/all`, {
      withCredentials: true,
    });
    return data;
  },

  create: async (payload) => {
    const { data } = await axios.post(API, payload, {
      withCredentials: true,
    });
    return data;
  },

  update: async (id, payload) => {
    const { data } = await axios.put(`${API}/${id}`, payload, {
      withCredentials: true,
    });
    return data;
  },

  togglePublish: async (id) => {
    const { data } = await axios.patch(
      `${API}/${id}/publish`,
      {},
      { withCredentials: true }
    );
    return data;
  },

  delete: async (id) => {
    const { data } = await axios.delete(`${API}/${id}`, {
      withCredentials: true,
    });
    return data;
  },
};

export default announcementService;
