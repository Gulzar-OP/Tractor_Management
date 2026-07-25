// redux/slice/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;
export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      // Try owner first
      const ownerRes = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
      });
      const ownerData = ownerRes.data?.user || ownerRes.data;
      if (ownerData) {
        return {
          role: "owner",
          data: ownerData,
        };
      }
    } catch {
      // ignore, try driver
    }

    try {
      // Try driver
      const driverRes = await axios.get(`${API}/driver/me`, {
        withCredentials: true,
      });
      const driverData = driverRes.data?.driver || driverRes.data;
      if (driverData) {
        return {
          role: "driver",
          data: driverData,
        };
      }
    } catch {
      // ignore
    }

    return rejectWithValue("No user found");
  }
);


const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,        // { role: "owner"|"driver", data: {...} }
    loading: false,
    error: null,
  },
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load user";
      });
  },
});

export const { logoutUser } = authSlice.actions;
export default authSlice.reducer;