"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) router.push("/");
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) router.push("/");
        });

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md p-8 glass-card">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tighter">
                        Architect Access
                    </h1>
                    <p className="text-secondary/40 text-xs font-bold uppercase tracking-widest">
                        Login to access your ingest pipeline
                    </p>
                </div>

                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#1566B9',
                                    brandAccent: '#0E1C2D',
                                }
                            }
                        }
                    }}
                    providers={["github", "google"]}
                    theme="light"
                />
            </div>
        </div>
    );
}
