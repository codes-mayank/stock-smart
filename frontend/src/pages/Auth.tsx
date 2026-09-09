import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/config";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"shopkeeper" | "customer">("shopkeeper");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { signInWithToken } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Sign in failed");
        }

        signInWithToken(data.token);
        toast.success("Welcome back!");

        // Check profile for role-based redirect
        try {
          const profileRes = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const userRole = profileData?.role;
            if (userRole === "customer") {
              navigate("/customer", { replace: true });
            } else {
              navigate("/", { replace: true });
            }
          } else {
            navigate("/", { replace: true });
          }
        } catch (profileError) {
          console.error("Error fetching profile:", profileError);
          navigate("/", { replace: true });
        }
      } catch (error: any) {
        toast.error(error?.message || "Sign in failed");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Sign up failed");
        }

        signInWithToken(data.token);
        toast.success("Account created!");

        // Create a profile document via API
        try {
          await fetch(`${API_BASE_URL}/profile`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}` 
            },
            body: JSON.stringify({
              role,
              owner_name: fullName,
              shop_name: "",
              phone: null,
              address: null,
              pincode: null,
              profile_picture_url: null,
              custom_fields: null,
              date_of_birth: null,
              gender: null,
              is_active: true,
            })
          });

          if (role === "customer") {
            navigate("/customer", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } catch (e) {
          console.warn("Failed to create profile after signup", e);
          if (role === "customer") {
            navigate("/customer", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }
      } catch (error: any) {
        console.error("Signup error:", error);
        toast.error(error?.message || "Sign up failed");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">ShopSphere</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to manage your inventory" : "Create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" checked={role === 'shopkeeper'} onChange={() => setRole('shopkeeper')} />
                <span className="text-sm">Shopkeeper</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" checked={role === 'customer'} onChange={() => setRole('customer')} />
                <span className="text-sm">Customer</span>
              </label>
            </div>
            {!isLogin && (
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
