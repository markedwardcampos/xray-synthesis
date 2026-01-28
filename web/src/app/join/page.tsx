"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

function JoinTeamContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const code = searchParams.get("code");

    const [loading, setLoading] = useState(true);
    const [invite, setInvite] = useState<any>(null);
    const [error, setError] = useState("");
    const [joining, setJoining] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!code) {
            setError("Invalid invite link");
            setLoading(false);
            return;
        }

        fetchInvite();
    }, [code]);

    const fetchInvite = async () => {
        try {
            const response = await fetch(`/api/teams/invites?code=${code}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Invalid invite");
            } else {
                setInvite(data.invite);
            }
        } catch (err) {
            setError("Failed to load invite");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setJoining(true);
        try {
            const response = await fetch("/api/teams/invites", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to join team");
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/");
                }, 2000);
            }
        } catch (err) {
            setError("Failed to join team");
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
                {error ? (
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Link href="/login" className="text-indigo-600 hover:underline">
                            Go to Login
                        </Link>
                    </div>
                ) : success ? (
                    <div className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                        <p className="text-gray-600 mb-4">You've joined the team successfully.</p>
                        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Team</h1>
                            <p className="text-gray-600">
                                You've been invited to join <span className="font-semibold">{invite?.teams?.name}</span>
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-600">
                                By accepting this invite, you'll be able to collaborate on conversational analysis and project synthesis.
                            </p>
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={joining}
                            className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {joining ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                "Accept Invite"
                            )}
                        </button>

                        <p className="mt-4 text-xs text-gray-500">
                            Don't have an account?{" "}
                            <Link href="/login" className="text-indigo-600 hover:underline">
                                Sign up first
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function JoinTeam() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <JoinTeamContent />
        </Suspense>
    );
}
