"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Clock, Globe, Tag, Share2, Download, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SynthesisDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchItem() {
            if (!id) return;
            const { data, error } = await supabase
                .from("processed_items")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching synthesis:", error);
                router.push("/");
            } else {
                setItem(data);
            }
            setLoading(false);
        }

        fetchItem();
    }, [id, router]);

    const copyToClipboard = () => {
        if (!item?.content_markdown) return;
        navigator.clipboard.writeText(item.content_markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!item) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-4xl mx-auto px-6 pt-12">
                {/* Navigation */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-secondary/40 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Dashboard
                </Link>

                {/* Header Section */}
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-black px-2 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider">
                            Synthesis Asset
                        </span>
                        <span className="text-secondary/20 text-xs font-medium">•</span>
                        <div className="flex items-center gap-1.5 text-secondary/40 text-[10px] font-bold uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-secondary leading-tight mb-6">
                        {item.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/5 rounded-lg">
                            <Globe className="w-3.5 h-3.5 text-secondary/40" />
                            <span className="text-xs font-medium text-secondary/60 truncate max-w-[200px]">
                                {item.original_url}
                            </span>
                        </div>
                        {item.metadata?.tags?.map((tag: string) => (
                            <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                                <Tag className="w-3 h-3 text-primary/60" />
                                <span className="text-xs font-bold text-primary tracking-wide uppercase">{tag}</span>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Actions Bar */}
                <div className="flex items-center gap-3 mb-12 pb-6 border-b border-secondary/5">
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-secondary/90 transition-all active:scale-95"
                    >
                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy Markdown"}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 glass-card text-secondary rounded-lg text-sm font-bold hover:bg-secondary/5 transition-all active:scale-95">
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button className="ml-auto p-2 text-secondary/40 hover:text-primary transition-colors">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Image Gallery */}
                {item.image_assets && item.image_assets.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-lg text-sm font-black">
                                {item.image_assets.length}
                            </span>
                            Images
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {item.image_assets.map((img: any, idx: number) => (
                                <a
                                    key={idx}
                                    href={img.gcs_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative aspect-video rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-primary transition-all"
                                >
                                    <img
                                        src={img.gcs_url}
                                        alt={`Screenshot ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2">
                                            <ArrowLeft className="w-4 h-4 text-primary rotate-[135deg]" />
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Analysis Highlights */}
                {(item.key_insights || item.action_items || item.themes) && (
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        {item.key_insights && item.key_insights.length > 0 && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Key Insights</h3>
                                <ul className="space-y-2">
                                    {item.key_insights.slice(0, 5).map((insight: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-blue-400">
                                            {insight}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {item.action_items && item.action_items.length > 0 && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">✅ Action Items</h3>
                                <ul className="space-y-2">
                                    {item.action_items.slice(0, 5).map((action: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-green-400">
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {item.themes && item.themes.length > 0 && (
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">🏷️ Themes</h3>
                                <div className="flex flex-wrap gap-2">
                                    {item.themes.map((theme: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-white text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                                            {theme}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Markdown Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-slate max-w-none 
            prose-headings:text-secondary prose-headings:font-black
            prose-p:text-secondary/80 prose-p:leading-relaxed prose-p:text-lg
            prose-strong:text-secondary prose-strong:font-bold
            prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:px-6 prose-blockquote:py-1 prose-blockquote:rounded-r-xl
            prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-secondary prose-pre:text-white prose-pre:rounded-2xl prose-pre:p-8
            prose-li:text-secondary/70
            "
                >
                    <ReactMarkdown>{item.content_markdown}</ReactMarkdown>
                </motion.div>
            </div>
        </div>
    );
}
