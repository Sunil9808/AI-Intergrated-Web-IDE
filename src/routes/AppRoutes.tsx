import { Routes, Route, Navigate } from 'react-router-dom';
import WorkspaceLayout from '../layouts/WorkspaceLayout';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WorkspaceLayout />} />
      <Route path="/workspace" element={<WorkspaceLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
