import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

export const getAllWorks = createAsyncThunk(
  "work/getAllWorks",
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.post(
        `${API}/work/all-works`,
        {},
        {
          withCredentials: true,
        }
      );

      return data.works;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message
      );
    }
  }
);

const workSlice = createSlice({
  name: "work",

  initialState: {
    works: [],
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder

      .addCase(getAllWorks.pending, (state) => {
        state.loading = true;
      })

      .addCase(getAllWorks.fulfilled, (state, action) => {
        state.loading = false;
        state.works = action.payload;
      })

      .addCase(getAllWorks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default workSlice.reducer;