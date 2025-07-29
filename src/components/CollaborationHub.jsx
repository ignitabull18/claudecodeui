import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  X,
  Users,
  Share2,
  UserPlus,
  Settings,
  Crown,
  Eye,
  Edit,
  Trash2,
  Copy,
  Mail,
  MessageSquare,
  Folder,
  Lock,
  Unlock,
  Globe,
  Shield,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Plus,
  Minus,
  Link2,
  Send,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Upload,
  Archive,
  Star,
  Heart,
  Zap,
  Target,
  Award,
  Bookmark
} from 'lucide-react';

const PERMISSION_LEVELS = {
  OWNER: 'owner',
  ADMIN: 'admin', 
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

const PERMISSION_LABELS = {
  [PERMISSION_LEVELS.OWNER]: { label: 'Owner', icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  [PERMISSION_LEVELS.ADMIN]: { label: 'Admin', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-100' },
  [PERMISSION_LEVELS.EDITOR]: { label: 'Editor', icon: Edit, color: 'text-blue-600', bg: 'bg-blue-100' },
  [PERMISSION_LEVELS.VIEWER]: { label: 'Viewer', icon: Eye, color: 'text-gray-600', bg: 'bg-gray-100' }
};

const SHARE_TYPES = {
  SESSION: 'session',
  PROJECT: 'project',
  WORKSPACE: 'workspace'
};

function CollaborationHub({ isOpen, onClose, selectedProject, currentSession }) {
  const [activeTab, setActiveTab] = useState('share');
  const [loading, setLoading] = useState(false);
  
  // Sharing state
  const [shareTarget, setShareTarget] = useState(null);
  const [shareType, setShareType] = useState(SHARE_TYPES.SESSION);
  const [sharePermission, setSharePermission] = useState(PERMISSION_LEVELS.VIEWER);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [sharedItems, setSharedItems] = useState([]);
  
  // Team management state
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitePending, setInvitePending] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(PERMISSION_LEVELS.EDITOR);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [createWorkspaceName, setCreateWorkspaceName] = useState('');
  const [createWorkspaceDescription, setCreateWorkspaceDescription] = useState('');
  
  // Real-time collaboration state
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [collaborativeSessions, setCollaborativeSessions] = useState([]);
  const [liveEditingEnabled, setLiveEditingEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollaborationData();
      connectCollaborationWebSocket();
    }
    return () => {
      disconnectCollaborationWebSocket();
    };
  }, [isOpen, selectedProject]);

  const loadCollaborationData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      // Load shared items
      const sharedResponse = await fetch('/api/collaboration/shared', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sharedResponse.ok) {
        const data = await sharedResponse.json();
        setSharedItems(data.shared || []);
      }

      // Load team members
      const teamResponse = await fetch('/api/collaboration/team', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (teamResponse.ok) {
        const data = await teamResponse.json();
        setTeamMembers(data.members || []);
        setInvitePending(data.pending || []);
      }

      // Load workspaces
      const workspacesResponse = await fetch('/api/collaboration/workspaces', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (workspacesResponse.ok) {
        const data = await workspacesResponse.json();
        setWorkspaces(data.workspaces || []);
        setCurrentWorkspace(data.current || null);
      }

      // Load active collaborators
      const collaboratorsResponse = await fetch('/api/collaboration/live', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (collaboratorsResponse.ok) {
        const data = await collaboratorsResponse.json();
        setActiveCollaborators(data.collaborators || []);
        setCollaborativeSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectCollaborationWebSocket = () => {
    // Implementation for real-time collaboration WebSocket
    console.log('Connecting to collaboration WebSocket...');
  };

  const disconnectCollaborationWebSocket = () => {
    // Implementation for disconnecting collaboration WebSocket
    console.log('Disconnecting from collaboration WebSocket...');
  };

  const shareItem = async (type, itemId, permission, email = null) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/collaboration/share', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          itemId,
          permission,
          email,
          generateLink: !email
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.shareLink) {
          setShareLink(data.shareLink);
        }
        await loadCollaborationData();
        return { success: true, data };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Error sharing item:', error);
      return { success: false, error: error.message };
    }
  };

  const inviteTeamMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/collaboration/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          workspaceId: currentWorkspace?.id
        })
      });

      if (response.ok) {
        setInviteEmail('');
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Error inviting team member:', error);
    }
  };

  const createWorkspace = async () => {
    if (!createWorkspaceName.trim()) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/collaboration/workspaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: createWorkspaceName,
          description: createWorkspaceDescription
        })
      });

      if (response.ok) {
        setCreateWorkspaceName('');
        setCreateWorkspaceDescription('');
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/collaboration/team/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const removeMember = async (memberId) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/collaboration/team/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const PermissionBadge = ({ permission }) => {
    const config = PERMISSION_LABELS[permission];
    const Icon = config.icon;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Collaboration Hub
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share sessions, manage teams, and collaborate in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadCollaborationData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            {[
              { id: 'share', label: 'Share & Access', icon: Share2 },
              { id: 'team', label: 'Team Management', icon: Users },
              { id: 'workspaces', label: 'Workspaces', icon: Folder },
              { id: 'live', label: 'Live Collaboration', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-lg text-gray-600 dark:text-gray-400">Loading collaboration data...</span>
            </div>
          ) : (
            <>
              {/* Share & Access Tab */}
              {activeTab === 'share' && (
                <div className="space-y-6">
                  {/* Share Current Item */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Share Current {currentSession ? 'Session' : 'Project'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Share with email (optional)
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Permission Level
                        </label>
                        <select
                          value={sharePermission}
                          onChange={(e) => setSharePermission(e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700"
                        >
                          <option value={PERMISSION_LEVELS.VIEWER}>Viewer - Can view only</option>
                          <option value={PERMISSION_LEVELS.EDITOR}>Editor - Can edit and comment</option>
                          <option value={PERMISSION_LEVELS.ADMIN}>Admin - Full access except ownership</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => shareItem(
                          currentSession ? SHARE_TYPES.SESSION : SHARE_TYPES.PROJECT,
                          currentSession?.id || selectedProject?.name,
                          sharePermission,
                          shareEmail || null
                        )}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        {shareEmail ? 'Send Invitation' : 'Generate Share Link'}
                      </Button>
                      
                      {shareLink && (
                        <Button
                          variant="outline"
                          onClick={copyShareLink}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </Button>
                      )}
                    </div>

                    {shareLink && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Link2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                            Share Link Generated
                          </span>
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 break-all font-mono bg-white dark:bg-gray-800 p-2 rounded">
                          {shareLink}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shared Items List */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Shared Items ({sharedItems.length})
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                    </div>

                    {sharedItems.length === 0 ? (
                      <div className="text-center py-8">
                        <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No shared items yet
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Share a session or project to get started with collaboration
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sharedItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              {item.type === 'session' ? (
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Folder className="w-5 h-5 text-green-600" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Shared {formatTimeAgo(item.sharedAt)} • {item.collaborators} collaborators
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <PermissionBadge permission={item.permission} />
                              <Button size="sm" variant="outline">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Team Management Tab */}
              {activeTab === 'team' && (
                <div className="space-y-6">
                  {/* Invite Member */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Invite Team Member
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <Input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="team-member@company.com"
                          className="w-full"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700"
                      >
                        <option value={PERMISSION_LEVELS.VIEWER}>Viewer</option>
                        <option value={PERMISSION_LEVELS.EDITOR}>Editor</option>
                        <option value={PERMISSION_LEVELS.ADMIN}>Admin</option>
                      </select>
                    </div>

                    <Button
                      onClick={inviteTeamMember}
                      disabled={!inviteEmail.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>

                  {/* Team Members */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Team Members ({teamMembers.length})
                    </h3>

                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {member.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <PermissionBadge permission={member.role} />
                            {member.role !== PERMISSION_LEVELS.OWNER && (
                              <>
                                <select
                                  value={member.role}
                                  onChange={(e) => updateMemberRole(member.id, e.target.value)}
                                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                >
                                  <option value={PERMISSION_LEVELS.VIEWER}>Viewer</option>
                                  <option value={PERMISSION_LEVELS.EDITOR}>Editor</option>
                                  <option value={PERMISSION_LEVELS.ADMIN}>Admin</option>
                                </select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeMember(member.id)}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Invitations */}
                  {invitePending.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Pending Invitations ({invitePending.length})
                      </h3>

                      <div className="space-y-3">
                        {invitePending.map((invite) => (
                          <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-yellow-600" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {invite.email}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Invited {formatTimeAgo(invite.invitedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <PermissionBadge permission={invite.role} />
                              <Button size="sm" variant="outline">
                                Resend
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Workspaces Tab */}
              {activeTab === 'workspaces' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <Folder className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Team Workspaces
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Create shared workspaces for team collaboration and project organization.
                    </p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Workspace
                    </Button>
                  </div>
                </div>
              )}

              {/* Live Collaboration Tab */}
              {activeTab === 'live' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Live Collaboration
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Real-time editing, live cursors, and collaborative sessions with your team.
                    </p>
                    <Button>
                      <Zap className="w-4 h-4 mr-2" />
                      Enable Live Editing
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>{teamMembers.length} team members</span>
            {sharedItems.length > 0 && (
              <>
                <span>•</span>
                <span>{sharedItems.length} shared items</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollaborationHub; 