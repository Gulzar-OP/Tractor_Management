
import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "../redux/slice/authSlice";

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const dispatch = useDispatch();

  const { user, loading, error } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (!user && !loading && !error) {
      dispatch(getCurrentUser());
    }
  }, [user, loading, error, dispatch]);

  // Wait for authentication
  if (loading || (!user && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role authorization
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
