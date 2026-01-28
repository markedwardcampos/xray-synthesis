"use client";

import { useState, useEffect } from "react";
import { Plus, Folder, Clock, CheckCircle2, AlertCircle, ExternalLink, ArrowRight, Users, Link2, X, ChevronDown, Image as ImageIcon } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [currentTeam, setCurrentTeam] = useState<any>(null);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  // Project UI state
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Team invite state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const router = useRouter();

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) router.push("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load Teams
  useEffect(() => {
    async function loadTeams() {
      if (!session) return;

      const { data: membershipData, error } = await supabase
        .from("team_members")
        .select("team_id, role, teams(*)")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error loading teams:", error);
      } else {
        const userTeams = membershipData?.map(m => m.teams) || [];
        setTeams(userTeams);
        if (userTeams.length > 0) {
          setCurrentTeam(userTeams[0]);
        }
      }
      setIsTeamLoading(false);
    }

    loadTeams();
  }, [session]);

  // Data fetching - Poll every 4s
  useEffect(() => {
    if (!currentTeam) return;

    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 4000);

    return () => clearInterval(interval);
  }, [currentTeam?.id]);

  const fetchData = async () => {
    if (!currentTeam) return;

    // Fetch queue
    const { data: qData } = await supabase
      .from("ingest_queue")
      .select("*")
      .eq("team_id", currentTeam.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (qData) setQueueItems(qData);

    // Fetch history
    const { data: hData } = await supabase
      .from("processed_items")
      .select("*")
      .eq("team_id", currentTeam.id)
      .eq("is_synthesis", false)
      .order("created_at", { ascending: false })
      .limit(20);
    if (hData) setHistoryItems(hData);

    // Fetch projects
    const { data: pData } = await supabase
      .from("projects")
      .select("*, processed_items(count)")
      .eq("team_id", currentTeam.id)
      .order("updated_at", { ascending: false });
    if (pData) setProjects(pData);
  };

  const handleProcessNow = async () => {
    if (!url || !currentTeam) return;
    setLoading(true);
    try {
      await axios.post("/api/ingest", {
        url,
        team_id: currentTeam.id,
        mode: "instant"
      });
      setUrl("");
      fetchData();
    } catch (error) {
      console.error("Process error:", error);
      alert("Failed to process link");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProject = async (projectId: string) => {
    if (!url || !currentTeam) return;
    setLoading(true);
    try {
      await axios.post("/api/ingest", {
        url,
        team_id: currentTeam.id,
        mode: "project",
        project_id: projectId
      });
      setUrl("");
      setShowProjectDropdown(false);
      fetchData();
    } catch (error) {
      console.error("Add to project error:", error);
      alert("Failed to add to project");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName || !currentTeam) return;
    try {
      const { data } = await axios.post("/api/projects", {
        name: newProjectName,
        teamId: currentTeam.id
      });
      setNewProjectName("");
      setShowNewProjectDialog(false);
      fetchData();

      // Auto-add current URL to the new project
      if (url && data?.project) {
        handleAddToProject(data.project.id);
      }
    } catch (error) {
      console.error("Create project error:", error);
      alert("Failed to create project");
    }
  };

  const handleSynthesizeProject = async (projectId: string) => {
    try {
      await axios.post(`/api/projects/${projectId}/synthesize`);
      alert("Project synthesis started!");
      fetchData();
    } catch (error) {
      console.error("Synthesis error:", error);
      alert("Failed to synthesize project");
    }
  };

  const handleCreateInvite = async () => {
    if (!currentTeam) return;
    try {
      const { data } = await axios.post("/api/teams/invites", {
        teamId: currentTeam.id,
        expiresInDays: 7,
        maxUses: 10
      });
      const link = `${window.location.origin}/join?code=${data.invite.invite_code}`;
      setInviteLink(link);
      setShowInviteDialog(true);
    } catch (error) {
      console.error("Invite error:", error);
      alert("Failed to create invite");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!session || isTeamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">No Teams Yet</h2>
          <p className="text-gray-600 mb-6">You need to be part of a team to use XRay Synthesis.</p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-indigo-600 hover:text-indigo-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">XRay Synthesis</h1>
            <p className="text-sm text-gray-600">{currentTeam?.name || "Select a team"}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCreateInvite}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition"
            >
              <Users className="w-4 h-4" />
              Invite
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Add Conversation Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Add Conversation</h2>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste ChatGPT, Gemini, Claude, or Perplexity link..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleProcessNow}
              disabled={!url || loading}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Process Now
            </button>
            <div className="relative">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                disabled={!url || loading}
                className="px-6 py-2 bg-white text-indigo-600 border-2 border-indigo-600 font-medium rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                Add to Project
                <ChevronDown className="w-4 h-4" />
              </button>

              {showProjectDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {projects.length > 0 ? (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddToProject(p.id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-gray-500">{p.status}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-sm text-gray-500">No projects yet</p>
                  )}
                  <button
                    onClick={() => {
                      setShowProjectDropdown(false);
                      setShowNewProjectDialog(true);
                    }}
                    className="w-full px-4 py-2 text-left text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 border-t border-gray-100 mt-2 pt-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects Section */}
        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5 text-indigo-600" />
              Projects
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600">
                        {project.processed_items?.[0]?.count || 0} conversations
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                          project.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                      }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-center"
                    >
                      View
                    </Link>
                    {project.status === 'draft' && (
                      <button
                        onClick={() => handleSynthesizeProject(project.id)}
                        className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Synthesize
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Queue */}
        {queueItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Processing Queue
            </h2>
            <div className="space-y-2">
              {queueItems.slice(0, 5).map((item) => (
                <div key={item.id} className="border border-gray-200 rounded p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.url}</p>
                    <p className="text-xs text-gray-500">{item.last_activity || item.status}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {item.priority && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        Priority
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <Clock className="w-4 h-4 text-yellow-600 animate-spin" />
                    )}
                    {item.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Results */}
        {historyItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Recent Results
            </h2>
            <div className="space-y-3">
              {historyItems.slice(0, 10).map((item) => (
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
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Project</h3>
              <button onClick={() => setShowNewProjectDialog(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewProjectDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Team Invite Link</h3>
              <button onClick={() => setShowInviteDialog(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Share this link to invite team members:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  alert("Copied to clipboard!");
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Link expires in 7 days • Max 10 uses
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
