import { Routes, Route } from "react-router-dom";
import Masthead from "./components/Masthead";
import Calculator from "./pages/Calculator";
import Dashboard from "./pages/Dashboard";
import Manual from "./pages/Manual";
import Attachment from "./pages/Attachment";

export default function App() {
  return (
    <>
      <Masthead />
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/attachment" element={<Attachment />} />
        <Route path="*" element={<Calculator />} />
      </Routes>
    </>
  );
}
