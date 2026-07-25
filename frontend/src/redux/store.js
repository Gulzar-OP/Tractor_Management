import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slice/authSlice";
import farmerReducer from "./slice/farmerSlice";
import workReducer from "./slice/workSlice";
import expenseReducer from "./slice/expenseSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    farmer: farmerReducer,
    work: workReducer,
    expense: expenseReducer,
  },
});