import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TaskManagement from "./TaskManagement";

const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  return <TaskManagement />;
};

export default Tasks;