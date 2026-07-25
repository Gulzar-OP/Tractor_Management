import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

// ================= GET ALL FARMERS =================

export const getAllFarmers = createAsyncThunk(
  "farmer/getAllFarmers",
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.post(
        `${API}/farmer/all-farmer`,
        {},
        {
          withCredentials: true,
        }
      );

      return data.farmers;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Something went wrong"
      );
    }
  }
);
// export const getAllFarmers = createAsyncThunk(
//   "farmer/getAllFarmers",
//   async () => {
//     console.log("THUNK RUNNING");

//     return [
//       {
//         _id: 1,
//         name: "Ram",
//       },
//     ];
//   }
// );

const farmerSlice = createSlice({
  name: "farmer",

  initialState: {
    farmers: [],
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder

      .addCase(getAllFarmers.pending, (state) => {
        state.loading = true;
      })

      .addCase(getAllFarmers.fulfilled, (state, action) => {
        state.loading = false;
        state.farmers = action.payload;
      })

      .addCase(getAllFarmers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default farmerSlice.reducer;