import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const API = `${API_BASE}/api`;

export const getAllExpenses = createAsyncThunk(
  "expense/getAllExpenses",
  async (_, thunkAPI) => {
    try {
      const { data } = await axios.get(
        `${API}/expenses/all-expenses`,
        {
          withCredentials: true,
        }
      );

      return data.expenses;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message
      );
    }
  }
);

const expenseSlice = createSlice({
  name: "expense",

  initialState: {
    expenses: [],
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder

      .addCase(getAllExpenses.pending, (state) => {
        state.loading = true;
      })

      .addCase(getAllExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload;
      })

      .addCase(getAllExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default expenseSlice.reducer;