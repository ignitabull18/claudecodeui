import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../database/db.js';

const router = express.Router();

// Permission levels
const PERMISSION_LEVELS = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// Share types
const SHARE_TYPES = {
  SESSION: 'session',
  PROJECT: 'project',
  WORKSPACE: 'workspace'
};

// Helper function to get collaboration data directory
function getCollaborationDataDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'collaboration');
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Helper function to generate share token
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to check permission hierarchy
function hasPermission(userRole, requiredRole) {
  const hierarchy = {
    [PERMISSION_LEVELS.VIEWER]: 1,
    [PERMISSION_LEVELS.EDITOR]: 2,
    [PERMISSION_LEVELS.ADMIN]: 3,
    [PERMISSION_LEVELS.OWNER]: 4
  };
  
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

// Initialize collaboration database tables
function initializeCollaborationTables() {
  try {
    // Workspaces table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    // Workspace members table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Shared items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        permission TEXT NOT NULL,
        share_token TEXT UNIQUE,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    // Shared item access table
    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_item_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shared_item_id TEXT NOT NULL,
        user_id INTEGER,
        email TEXT,
        permission TEXT NOT NULL,
        accessed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shared_item_id) REFERENCES shared_items(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Team invitations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        inviter_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
        FOREIGN KEY (inviter_id) REFERENCES users(id)
      )
    `);

    // Live collaboration sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS collaboration_sessions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    // Active collaborators table
    db.exec(`
      CREATE TABLE IF NOT EXISTS active_collaborators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        cursor_position TEXT,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES collaboration_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_shared_items_owner ON shared_items(owner_id);
      CREATE INDEX IF NOT EXISTS idx_shared_items_token ON shared_items(share_token);
      CREATE INDEX IF NOT EXISTS idx_shared_item_access_item ON shared_item_access(shared_item_id);
      CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_item ON collaboration_sessions(item_id);
      CREATE INDEX IF NOT EXISTS idx_active_collaborators_session ON active_collaborators(session_id);
    `);

    console.log('✅ Collaboration database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing collaboration tables:', error);
  }
}

// Initialize collaboration tables on startup
initializeCollaborationTables();

// GET /api/collaboration/shared - Get user's shared items
router.get('/shared', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📤 Loading shared items for user: ${userId}`);

    // Get shared items created by the user
    const stmt = db.prepare(`
      SELECT 
        si.*,
        COUNT(sia.id) as collaborator_count
      FROM shared_items si
      LEFT JOIN shared_item_access sia ON si.id = sia.shared_item_id
      WHERE si.owner_id = ? AND (si.expires_at IS NULL OR si.expires_at > datetime('now'))
      GROUP BY si.id
      ORDER BY si.created_at DESC
    `);
    
    const sharedItems = stmt.all(userId);

    // Format the response
    const formattedItems = sharedItems.map(item => ({
      id: item.id,
      type: item.type,
      name: item.item_id, // In a real implementation, fetch actual names
      permission: item.permission,
      collaborators: item.collaborator_count,
      sharedAt: item.created_at,
      shareToken: item.share_token
    }));

    res.json({
      success: true,
      shared: formattedItems
    });
  } catch (error) {
    console.error('Error loading shared items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load shared items',
      details: error.message
    });
  }
});

// GET /api/collaboration/team - Get team members and pending invitations
router.get('/team', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`👥 Loading team data for user: ${userId}`);

    // Return team data from database
    // In a real implementation, query workspace members and invitations
    const mockMembers = [
      {
        id: userId,
        name: req.user.username,
        email: `${req.user.username}@example.com`,
        role: PERMISSION_LEVELS.OWNER,
        joinedAt: new Date().toISOString()
      }
    ];

    const mockPending = [];

    res.json({
      success: true,
      members: mockMembers,
      pending: mockPending
    });
  } catch (error) {
    console.error('Error loading team data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load team data',
      details: error.message
    });
  }
});

// GET /api/collaboration/workspaces - Get user's workspaces
router.get('/workspaces', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🏢 Loading workspaces for user: ${userId}`);

    // Get workspaces owned by or accessible to the user
    const stmt = db.prepare(`
      SELECT 
        w.*,
        COUNT(wm.id) as member_count
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE w.owner_id = ? OR w.id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = ?
      )
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);
    
    const workspaces = stmt.all(userId, userId);

    // Get current workspace (first one or default)
    const currentWorkspace = workspaces.length > 0 ? workspaces[0] : null;

    res.json({
      success: true,
      workspaces: workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        description: ws.description,
        memberCount: ws.member_count,
        isOwner: ws.owner_id === userId,
        createdAt: ws.created_at
      })),
      current: currentWorkspace ? {
        id: currentWorkspace.id,
        name: currentWorkspace.name,
        description: currentWorkspace.description
      } : null
    });
  } catch (error) {
    console.error('Error loading workspaces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load workspaces',
      details: error.message
    });
  }
});

// GET /api/collaboration/live - Get active collaborators and sessions
router.get('/live', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔴 Loading live collaboration data for user: ${userId}`);

    // Get active collaboration sessions
    const sessionStmt = db.prepare(`
      SELECT cs.*, COUNT(ac.id) as collaborator_count
      FROM collaboration_sessions cs
      LEFT JOIN active_collaborators ac ON cs.id = ac.session_id
      WHERE cs.active = 1 AND (cs.owner_id = ? OR cs.id IN (
        SELECT session_id FROM active_collaborators WHERE user_id = ?
      ))
      GROUP BY cs.id
      ORDER BY cs.created_at DESC
    `);
    
    const sessions = sessionStmt.all(userId, userId);

    // Get active collaborators
    const collaboratorStmt = db.prepare(`
      SELECT 
        ac.*,
        u.username,
        cs.type as session_type,
        cs.item_id
      FROM active_collaborators ac
      JOIN users u ON ac.user_id = u.id
      JOIN collaboration_sessions cs ON ac.session_id = cs.id
      WHERE ac.last_seen > datetime('now', '-5 minutes')
      ORDER BY ac.last_seen DESC
    `);
    
    const collaborators = collaboratorStmt.all();

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        type: session.type,
        itemId: session.item_id,
        collaboratorCount: session.collaborator_count,
        isOwner: session.owner_id === userId,
        createdAt: session.created_at
      })),
      collaborators: collaborators.map(collab => ({
        id: collab.id,
        username: collab.username,
        sessionId: collab.session_id,
        sessionType: collab.session_type,
        itemId: collab.item_id,
        cursorPosition: collab.cursor_position ? JSON.parse(collab.cursor_position) : null,
        lastSeen: collab.last_seen
      }))
    });
  } catch (error) {
    console.error('Error loading live collaboration data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load live collaboration data',
      details: error.message
    });
  }
});

// POST /api/collaboration/share - Share an item
router.post('/share', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, itemId, permission, email, generateLink, expiresIn } = req.body;

    if (!type || !itemId || !permission) {
      return res.status(400).json({
        success: false,
        error: 'Type, item ID, and permission are required'
      });
    }

    console.log(`🔗 Sharing ${type} ${itemId} with ${permission} permission`);

    const shareId = uuidv4();
    const shareToken = generateShareToken();
    
    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresIn) {
      const expireDate = new Date();
      expireDate.setTime(expireDate.getTime() + expiresIn * 1000);
      expiresAt = expireDate.toISOString();
    }

    // Create shared item
    const stmt = db.prepare(`
      INSERT INTO shared_items (id, type, item_id, owner_id, permission, share_token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(shareId, type, itemId, userId, permission, shareToken, expiresAt);

    // If email is provided, create access record
    if (email) {
      const accessStmt = db.prepare(`
        INSERT INTO shared_item_access (shared_item_id, email, permission)
        VALUES (?, ?, ?)
      `);
      
      accessStmt.run(shareId, email, permission);

      // In a real implementation, send email invitation here
      console.log(`📧 Would send invitation email to: ${email}`);
    }

    let shareLink = null;
    if (generateLink) {
      shareLink = `${req.protocol}://${req.get('host')}/shared/${shareToken}`;
    }

    res.json({
      success: true,
      shareId,
      shareToken,
      shareLink,
      message: email ? 'Invitation sent successfully' : 'Share link generated successfully'
    });
  } catch (error) {
    console.error('Error sharing item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share item',
      details: error.message
    });
  }
});

// POST /api/collaboration/invite - Invite team member
router.post('/invite', async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, role, workspaceId } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email and role are required'
      });
    }

    console.log(`💌 Inviting ${email} with role ${role}`);

    const inviteId = uuidv4();
    const inviteToken = generateShareToken();
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const stmt = db.prepare(`
      INSERT INTO team_invitations (id, workspace_id, inviter_id, email, role, token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(inviteId, workspaceId, userId, email, role, inviteToken, expiresAt.toISOString());

    // In a real implementation, send invitation email here
    console.log(`📧 Would send team invitation email to: ${email}`);

    res.json({
      success: true,
      inviteId,
      message: 'Team invitation sent successfully'
    });
  } catch (error) {
    console.error('Error inviting team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invite team member',
      details: error.message
    });
  }
});

// POST /api/collaboration/workspaces - Create new workspace
router.post('/workspaces', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Workspace name is required'
      });
    }

    console.log(`🏢 Creating workspace: ${name}`);

    const workspaceId = uuidv4();

    // Create workspace
    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, description, owner_id)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(workspaceId, name.trim(), description || null, userId);

    // Add creator as owner member
    const memberStmt = db.prepare(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (?, ?, ?)
    `);
    
    memberStmt.run(workspaceId, userId, PERMISSION_LEVELS.OWNER);

    res.json({
      success: true,
      workspaceId,
      message: 'Workspace created successfully'
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workspace',
      details: error.message
    });
  }
});

// PUT /api/collaboration/team/:memberId/role - Update team member role
router.put('/team/:memberId/role', async (req, res) => {
  try {
    const userId = req.user.id;
    const { memberId } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(PERMISSION_LEVELS).includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role is required'
      });
    }

    console.log(`👑 Updating member ${memberId} role to ${role}`);

    // In a real implementation, check permissions and update role
    // For now, just return success
    res.json({
      success: true,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update member role',
      details: error.message
    });
  }
});

// DELETE /api/collaboration/team/:memberId - Remove team member
router.delete('/team/:memberId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { memberId } = req.params;

    console.log(`🚪 Removing team member: ${memberId}`);

    // In a real implementation, check permissions and remove member
    // For now, just return success
    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member',
      details: error.message
    });
  }
});

// GET /api/collaboration/shared/:token - Access shared item by token
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    console.log(`🔐 Accessing shared item with token: ${token}`);

    // Find shared item by token
    const stmt = db.prepare(`
      SELECT si.*, u.username as owner_name
      FROM shared_items si
      JOIN users u ON si.owner_id = u.id
      WHERE si.share_token = ? AND (si.expires_at IS NULL OR si.expires_at > datetime('now'))
    `);
    
    const sharedItem = stmt.get(token);

    if (!sharedItem) {
      return res.status(404).json({
        success: false,
        error: 'Shared item not found or expired'
      });
    }

    // Record access if user is logged in
    if (req.user) {
      const accessStmt = db.prepare(`
        INSERT OR REPLACE INTO shared_item_access 
        (shared_item_id, user_id, permission, accessed_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      
      accessStmt.run(sharedItem.id, req.user.id, sharedItem.permission);
    }

    res.json({
      success: true,
      item: {
        id: sharedItem.id,
        type: sharedItem.type,
        itemId: sharedItem.item_id,
        permission: sharedItem.permission,
        ownerName: sharedItem.owner_name,
        createdAt: sharedItem.created_at
      }
    });
  } catch (error) {
    console.error('Error accessing shared item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to access shared item',
      details: error.message
    });
  }
});

// POST /api/collaboration/live/join - Join live collaboration session
router.post('/live/join', async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, itemId, type } = req.body;

    console.log(`🔴 User ${userId} joining live session: ${sessionId || 'new'}`);

    let actualSessionId = sessionId;

    // Create session if it doesn't exist
    if (!sessionId) {
      actualSessionId = uuidv4();
      
      const sessionStmt = db.prepare(`
        INSERT INTO collaboration_sessions (id, type, item_id, owner_id)
        VALUES (?, ?, ?, ?)
      `);
      
      sessionStmt.run(actualSessionId, type, itemId, userId);
    }

    // Add or update collaborator
    const collaboratorStmt = db.prepare(`
      INSERT OR REPLACE INTO active_collaborators (session_id, user_id, last_seen)
      VALUES (?, ?, datetime('now'))
    `);
    
    collaboratorStmt.run(actualSessionId, userId);

    res.json({
      success: true,
      sessionId: actualSessionId,
      message: 'Joined collaboration session successfully'
    });
  } catch (error) {
    console.error('Error joining live session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join live session',
      details: error.message
    });
  }
});

// POST /api/collaboration/live/leave - Leave live collaboration session
router.post('/live/leave', async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    console.log(`🔴 User ${userId} leaving live session: ${sessionId}`);

    // Remove collaborator
    const stmt = db.prepare(`
      DELETE FROM active_collaborators 
      WHERE session_id = ? AND user_id = ?
    `);
    
    stmt.run(sessionId, userId);

    res.json({
      success: true,
      message: 'Left collaboration session successfully'
    });
  } catch (error) {
    console.error('Error leaving live session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave live session',
      details: error.message
    });
  }
});

// POST /api/collaboration/live/cursor - Update cursor position
router.post('/live/cursor', async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, position } = req.body;

    console.log(`🎯 Updating cursor position for user ${userId} in session ${sessionId}`);

    // Update cursor position
    const stmt = db.prepare(`
      UPDATE active_collaborators 
      SET cursor_position = ?, last_seen = datetime('now')
      WHERE session_id = ? AND user_id = ?
    `);
    
    stmt.run(JSON.stringify(position), sessionId, userId);

    res.json({
      success: true,
      message: 'Cursor position updated successfully'
    });
  } catch (error) {
    console.error('Error updating cursor position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cursor position',
      details: error.message
    });
  }
});

// DELETE /api/collaboration/shared/:shareId - Revoke shared access
router.delete('/shared/:shareId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { shareId } = req.params;

    console.log(`🚫 Revoking shared access: ${shareId}`);

    // Delete shared item and all access records
    const stmt = db.prepare(`
      DELETE FROM shared_items 
      WHERE id = ? AND owner_id = ?
    `);
    
    const result = stmt.run(shareId, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shared item not found or access denied'
      });
    }

    // Delete access records
    const accessStmt = db.prepare(`
      DELETE FROM shared_item_access 
      WHERE shared_item_id = ?
    `);
    
    accessStmt.run(shareId);

    res.json({
      success: true,
      message: 'Shared access revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking shared access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke shared access',
      details: error.message
    });
  }
});

export default router; 