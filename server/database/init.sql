-- Initialize authentication database
PRAGMA foreign_keys = ON;

-- Users table (single user system)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ==================================================================
-- MULTI-FILE CODEBASE INTELLIGENCE SYSTEM SCHEMA
-- ==================================================================

-- Projects table - Store project information
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    path TEXT NOT NULL,
    description TEXT,
    primary_language TEXT,
    framework TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_analyzed DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Analysis Sessions - Store analysis runs and overall results
CREATE TABLE IF NOT EXISTS analysis_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    session_type TEXT NOT NULL, -- 'full', 'incremental', 'targeted'
    analysis_mode TEXT NOT NULL, -- 'claude-code', 'demo', 'fallback' 
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration_ms INTEGER,
    files_analyzed INTEGER DEFAULT 0,
    total_lines_analyzed INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    quality_score REAL,
    avg_complexity REAL,
    technical_debt REAL,
    issues_found INTEGER DEFAULT 0,
    suggestions_generated INTEGER DEFAULT 0,
    metadata TEXT, -- JSON for additional analysis metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- File Analysis - Store individual file analysis results
CREATE TABLE IF NOT EXISTS file_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_extension TEXT,
    file_size INTEGER,
    lines_of_code INTEGER,
    language TEXT,
    complexity REAL,
    maintainability_index REAL,
    technical_debt REAL,
    function_count INTEGER DEFAULT 0,
    class_count INTEGER DEFAULT 0,
    import_count INTEGER DEFAULT 0,
    export_count INTEGER DEFAULT 0,
    issues_count INTEGER DEFAULT 0,
    last_modified DATETIME,
    analysis_data TEXT, -- JSON for detailed analysis results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Dependencies - Store file dependency relationships
CREATE TABLE IF NOT EXISTS file_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    source_file TEXT NOT NULL,
    target_file TEXT NOT NULL,
    dependency_type TEXT NOT NULL, -- 'import', 'require', 'include', 'reference'
    strength REAL DEFAULT 1.0, -- Dependency strength score
    line_number INTEGER,
    is_dynamic BOOLEAN DEFAULT 0,
    is_circular BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Code Patterns - Store detected code patterns
CREATE TABLE IF NOT EXISTS code_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    pattern_type TEXT NOT NULL, -- 'design', 'architectural', 'coding', 'anti-pattern'
    pattern_name TEXT NOT NULL,
    description TEXT,
    frequency INTEGER DEFAULT 1,
    confidence TEXT, -- 'high', 'medium', 'low'
    files TEXT, -- JSON array of affected files
    evidence TEXT, -- JSON array of evidence
    examples TEXT, -- JSON array of code examples
    recommendation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Architecture Patterns - Store discovered architecture patterns
CREATE TABLE IF NOT EXISTS architecture_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    pattern_name TEXT NOT NULL, -- 'Component-based', 'Layered', 'Microservices', etc.
    pattern_category TEXT, -- 'architectural', 'structural', 'behavioral'
    description TEXT,
    confidence TEXT NOT NULL, -- 'high', 'medium', 'low'
    evidence TEXT, -- JSON array of evidence
    affected_directories TEXT, -- JSON array of directories
    strength_score REAL DEFAULT 0.0,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Refactoring History - Store refactoring operations and results
CREATE TABLE IF NOT EXISTS refactoring_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    session_id INTEGER,
    operation_type TEXT NOT NULL, -- 'rename', 'extract', 'merge', 'move', 'inline'
    operation_description TEXT,
    target_files TEXT, -- JSON array of files affected
    parameters TEXT, -- JSON object with operation parameters
    status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'executed', 'failed', 'reverted'
    risk_level TEXT, -- 'low', 'medium', 'high'
    files_affected INTEGER DEFAULT 0,
    lines_changed INTEGER DEFAULT 0,
    backup_created BOOLEAN DEFAULT 0,
    backup_path TEXT,
    execution_time DATETIME,
    execution_duration_ms INTEGER,
    error_message TEXT,
    rollback_info TEXT, -- JSON for rollback information
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE SET NULL
);

-- Code Generation History - Store generated code and context
CREATE TABLE IF NOT EXISTS code_generation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    session_id INTEGER,
    generation_type TEXT NOT NULL, -- 'component', 'function', 'class', 'module', 'test', 'api'
    requirement TEXT NOT NULL, -- Original user requirement
    generated_code TEXT, -- The generated code
    file_path TEXT, -- Target file path for the code
    language TEXT,
    framework TEXT,
    context_factors TEXT, -- JSON object with context settings
    generation_settings TEXT, -- JSON object with generation parameters
    analysis_mode TEXT, -- 'claude-code', 'demo'
    generation_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    generation_duration_ms INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    code_quality_score REAL,
    follows_conventions BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE SET NULL
);

-- Cross References - Store cross-file symbol references
CREATE TABLE IF NOT EXISTS cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    symbol_name TEXT NOT NULL,
    symbol_type TEXT NOT NULL, -- 'function', 'class', 'variable', 'constant', 'type'
    definition_file TEXT NOT NULL,
    definition_line INTEGER,
    reference_file TEXT NOT NULL,
    reference_line INTEGER,
    reference_type TEXT, -- 'call', 'import', 'inheritance', 'usage'
    context TEXT, -- Surrounding code context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Intelligence Metadata - Store system metadata and settings
CREATE TABLE IF NOT EXISTS intelligence_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT NOT NULL, -- 'system', 'project', 'analysis', 'user_preference'
    key TEXT NOT NULL,
    value TEXT,
    data_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_system BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Smart File Selection Cache - Cache intelligent file selection results
CREATE TABLE IF NOT EXISTS smart_selection_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    context_hash TEXT NOT NULL, -- Hash of selection context
    operation_type TEXT NOT NULL,
    selected_files TEXT, -- JSON array of selected files with scores
    relevance_scores TEXT, -- JSON object with detailed scoring
    context_factors TEXT, -- JSON object with context used
    selection_quality REAL,
    cache_created DATETIME DEFAULT CURRENT_TIMESTAMP,
    cache_expires DATETIME,
    hit_count INTEGER DEFAULT 0,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ==================================================================
-- INDEXES FOR INTELLIGENCE SYSTEM PERFORMANCE
-- ==================================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);

-- Analysis sessions indexes
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_project ON analysis_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_type ON analysis_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created ON analysis_sessions(created_at);

-- File analysis indexes
CREATE INDEX IF NOT EXISTS idx_file_analysis_session ON file_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_project ON file_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_path ON file_analysis(file_path);
CREATE INDEX IF NOT EXISTS idx_file_analysis_complexity ON file_analysis(complexity);

-- Dependencies indexes
CREATE INDEX IF NOT EXISTS idx_dependencies_session ON file_dependencies(session_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_project ON file_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON file_dependencies(source_file);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON file_dependencies(target_file);
CREATE INDEX IF NOT EXISTS idx_dependencies_circular ON file_dependencies(is_circular);

-- Patterns indexes
CREATE INDEX IF NOT EXISTS idx_code_patterns_session ON code_patterns(session_id);
CREATE INDEX IF NOT EXISTS idx_code_patterns_project ON code_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_code_patterns_type ON code_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_arch_patterns_project ON architecture_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_arch_patterns_confidence ON architecture_patterns(confidence);

-- Refactoring indexes
CREATE INDEX IF NOT EXISTS idx_refactoring_project ON refactoring_history(project_id);
CREATE INDEX IF NOT EXISTS idx_refactoring_status ON refactoring_history(status);
CREATE INDEX IF NOT EXISTS idx_refactoring_type ON refactoring_history(operation_type);
CREATE INDEX IF NOT EXISTS idx_refactoring_created ON refactoring_history(created_at);

-- Code generation indexes
CREATE INDEX IF NOT EXISTS idx_code_gen_project ON code_generation_history(project_id);
CREATE INDEX IF NOT EXISTS idx_code_gen_type ON code_generation_history(generation_type);
CREATE INDEX IF NOT EXISTS idx_code_gen_success ON code_generation_history(success);
CREATE INDEX IF NOT EXISTS idx_code_gen_created ON code_generation_history(created_at);

-- Cross references indexes
CREATE INDEX IF NOT EXISTS idx_cross_ref_session ON cross_references(session_id);
CREATE INDEX IF NOT EXISTS idx_cross_ref_symbol ON cross_references(symbol_name);
CREATE INDEX IF NOT EXISTS idx_cross_ref_def_file ON cross_references(definition_file);
CREATE INDEX IF NOT EXISTS idx_cross_ref_ref_file ON cross_references(reference_file);

-- Metadata indexes
CREATE INDEX IF NOT EXISTS idx_metadata_project ON intelligence_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_metadata_category ON intelligence_metadata(category);
CREATE INDEX IF NOT EXISTS idx_metadata_key ON intelligence_metadata(key);

-- Smart selection cache indexes
CREATE INDEX IF NOT EXISTS idx_smart_cache_project ON smart_selection_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_smart_cache_hash ON smart_selection_cache(context_hash);
CREATE INDEX IF NOT EXISTS idx_smart_cache_expires ON smart_selection_cache(cache_expires);

-- ==================================================================
-- VIEWS FOR COMMON INTELLIGENCE QUERIES
-- ==================================================================

-- Project summary view with latest analysis
CREATE VIEW IF NOT EXISTS project_intelligence_summary AS
SELECT 
    p.id,
    p.name,
    p.display_name,
    p.path,
    p.primary_language,
    p.framework,
    p.last_analyzed,
    latest.session_id,
    latest.quality_score,
    latest.avg_complexity,
    latest.technical_debt,
    latest.files_analyzed,
    latest.issues_found,
    latest.suggestions_generated,
    COUNT(DISTINCT cp.id) as code_patterns_count,
    COUNT(DISTINCT ap.id) as arch_patterns_count,
    COUNT(DISTINCT rh.id) as refactoring_operations,
    COUNT(DISTINCT cgh.id) as code_generations
FROM projects p
LEFT JOIN (
    SELECT DISTINCT 
        project_id,
        session_id,
        quality_score,
        avg_complexity, 
        technical_debt,
        files_analyzed,
        issues_found,
        suggestions_generated,
        ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) as rn
    FROM analysis_sessions 
    WHERE status = 'completed'
) latest ON p.id = latest.project_id AND latest.rn = 1
LEFT JOIN code_patterns cp ON p.id = cp.project_id
LEFT JOIN architecture_patterns ap ON p.id = ap.project_id  
LEFT JOIN refactoring_history rh ON p.id = rh.project_id
LEFT JOIN code_generation_history cgh ON p.id = cgh.project_id
WHERE p.is_active = 1
GROUP BY p.id;

-- File analysis summary view
CREATE VIEW IF NOT EXISTS file_intelligence_summary AS
SELECT 
    fa.project_id,
    fa.file_path,
    fa.file_name,
    fa.language,
    fa.complexity,
    fa.maintainability_index,
    fa.technical_debt,
    fa.lines_of_code,
    COUNT(DISTINCT fd_out.id) as outgoing_dependencies,
    COUNT(DISTINCT fd_in.id) as incoming_dependencies,
    COUNT(DISTINCT cr_def.id) as symbols_defined,
    COUNT(DISTINCT cr_ref.id) as symbols_referenced,
    MAX(fa.created_at) as last_analyzed
FROM file_analysis fa
LEFT JOIN file_dependencies fd_out ON fa.file_path = fd_out.source_file AND fa.project_id = fd_out.project_id
LEFT JOIN file_dependencies fd_in ON fa.file_path = fd_in.target_file AND fa.project_id = fd_in.project_id
LEFT JOIN cross_references cr_def ON fa.file_path = cr_def.definition_file AND fa.project_id = cr_def.project_id
LEFT JOIN cross_references cr_ref ON fa.file_path = cr_ref.reference_file AND fa.project_id = cr_ref.project_id
GROUP BY fa.project_id, fa.file_path;