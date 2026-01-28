"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, Image as ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { supabase } from "@/lib/supabase";

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [synthesis, setSynthesis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [synthesizing, setSynthesizing] = useState(false);

    useEffect(() => {
        fetchProject();
        const interval = setInterval(fetchProject, 4000);
        return () => clearInterval(interval);
    }, [projectId]);

    const fetchProject = async () => {
        if (!projectId) return;

        // Fetch project
        const { data: pData } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();

        if (pData) {
            setProject(pData);

            // Fetch synthesis if completed
            if (pData.synthesis_id) {
                const { data: sData } = await supabase
                    .from("processed_items")
                    .select("*")
                    .eq("id", pData.synthesis_id)
                    .single();
                if (sData) setSynthesis(sData);
            }
        }

        // Fetch items
        const { data: iData } = await supabase
            .from("processed_items")
            .select("*")
            .eq("project_id", projectId)
            .eq("is_synthesis", false)
            .order("created_at", { ascending: false });

        if (iData) setItems(iData);
        setLoading(false);
    };

    const handleSynthesize = async () => {
        setSynthesizing(true);
        try {
            await axios.post(`/api/projects/${projectId}/synthesize`);
            alert("Synthesis started!");
            fetchProject();
        } catch (error) {
            console.error("Synthesis error:", error);
            alert("Failed to synthesize project");
        } finally {
            setSynthesizing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
                    <Link href="/" className="text-indigo-600 hover:underline">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <Link href="/" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                            <p className="text-sm text-gray-600">{items.length} conversations</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${project.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    project.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                        project.status === 'failed' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                }`}>
                                {project.status}
                            </span>
                            {project.status === 'draft' && items.length > 0 && (
                                <button
                                    onClick={handleSynthesize}
                                    disabled={synthesizing}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {synthesizing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Synthesizing...
                                        </>
                                    ) : (
                                        <>Synthesize Project</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Synthesis Result */}
                {synthesis && (
                    <div className="bg-white rounded-lg shadow-sm border-2 border-indigo-200 p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            Project Synthesis
                        </h2>

                        {synthesis.synthesis_narrative && (
                            <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                                <h3 className="font-semibold text-indigo-900 mb-2">Summary</h3>
                                <p className="text-gray-700 leading-relaxed">{synthesis.synthesis_narrative}</p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold mb-3">🎯 Key Insights</h3>
                                <ul className="space-y-2">
                                    {synthesis.key_insights?.map((insight: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-indigo-300">
                                            {insight}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-3">✅ Action Items</h3>
                                <ul className="space-y-2">
                                    {synthesis.action_items?.map((action: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-green-300">
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {synthesis.contradictions && synthesis.contradictions.length > 0 && (
                            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Contradictions Found</h3>
                                <ul className="space-y-1">
                                    {synthesis.contradictions.map((c: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700">• {c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Individual Conversations */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">Conversations in this Project</h2>

                    {items.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No conversations yet. Add some from the dashboard!</p>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/synthesis/${item.id}`}
                                    className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{item.title || "Untitled"}</h3>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                {item.key_insights?.[0] || "No insights yet"}
                                            </p>
                                            {item.image_assets && item.image_assets.length > 0 && (
                                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                    <ImageIcon className="w-3 h-3" />
                                                    {item.image_assets.length} image{item.image_assets.length > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-400 ml-4" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
