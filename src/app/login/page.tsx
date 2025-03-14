// src/app/login/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { session, setSession, fetchSession } = useApp();
  const router = useRouter();

  // Handle automatic redirect after successful login
  useEffect(() => {
    if (session) {
      console.log("Login Page: ", session);
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log(
        "Data returned from login API:",
        data,
        "\nResponse: ",
        response
      );
      if (response.ok) {
        // Only fetch session and let the useEffect handle redirect
        await fetchSession();
      } else {
        alert(data.error || "Login failed");
      }
    } catch (error) {
      alert("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600">
      <form
        onSubmit={handleSubmit}
        className="backdrop-blur-lg bg-white/10 p-8 rounded-xl shadow-2xl w-96 space-y-6 border border-white/20"
      >
        <h2 className="text-3xl font-extrabold text-center text-white drop-shadow-md">
          Welcome Back
        </h2>

        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              required
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-white/20 text-white py-3 rounded-lg hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? "Logging in..." : "Sign In"}
        </button>

        <p className="text-center text-white/80 text-sm">
          Don't have an account?{" "}
          <a href="#" className="underline text-white hover:text-white/90">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
