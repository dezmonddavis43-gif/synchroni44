import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, Btn, Input, Textarea, PageTitle, Spinner, EmptyState } from '../shared/UI'
import { Plus, Table, Columns3, Download, StickyNote, X, ChevronDown, GripVertical, Check } from 'lucide-react'
import type { Profile } from '../../lib/types'

interface CRMProject {
  id: string
  client: string
  project_name: string
  music_type: string
  terms: string
  budget: string
  briefed: string
  search_sent: string
  who: string
  music_due: string
  sent: string
  creative_selects: string
  ballparks: string
  client_approval: string
  ship_date: string
  vocal_consent: string
  musicology: string
  ba_added: string
  finished: string
  final_cost: string
  notes: string
  stage: 'briefed' | 'search_sent' | 'creative_selects' | 'client_approval' | 'ship_ready' | 'finished'
}

interface ProjectsCRMProps {
  profile: Profile
}

const STAGES = [
  { id: 'briefed', label: 'Briefed', color: '#4A90A4' },
  { id: 'search_sent', label: 'Search Sent', color: '#8B7355' },
  { id: 'creative_selects', label: 'Creative Selects', color: '#C8A97E' },
  { id: 'client_approval', label: 'Client Approval', color: '#9B8BB8' },
  { id: 'ship_ready', label: 'Ship Ready', color: '#7BA386' },
  { id: 'finished', label: 'Finished', color: '#5A9F5A' },
] as const

interface Column {
  key: string
  label: string
  width: number
  frozen?: boolean
  type?: 'date'
}

const COLUMNS: Column[] = [
  { key: 'client', label: 'CLIENT', width: 120, frozen: true },
  { key: 'project_name', label: 'PROJECT NAME', width: 180, frozen: true },
  { key: 'music_type', label: 'MUSIC TYPE', width: 120 },
  { key: 'terms', label: 'TERMS', width: 100 },
  { key: 'budget', label: 'BUDGET', width: 100 },
  { key: 'briefed', label: 'BRIEFED', width: 100, type: 'date' },
  { key: 'search_sent', label: 'SEARCH SENT', width: 100, type: 'date' },
  { key: 'who', label: 'WHO', width: 80 },
  { key: 'music_due', label: 'MUSIC DUE', width: 100, type: 'date' },
  { key: 'sent', label: 'SENT', width: 80 },
  { key: 'creative_selects', label: 'CREATIVE SELECTS', width: 130, type: 'date' },
  { key: 'ballparks', label: 'BALLPARKS', width: 100, type: 'date' },
  { key: 'client_approval', label: 'CLIENT APPROVAL', width: 130, type: 'date' },
  { key: 'ship_date', label: 'SHIP DATE', width: 100, type: 'date' },
  { key: 'vocal_consent', label: 'VOCAL CONSENT', width: 120 },
  { key: 'musicology', label: 'MUSICOLOGY', width: 100 },
  { key: 'ba_added', label: 'BA ADDED', width: 100 },
  { key: 'finished', label: 'FINISHED', width: 100, type: 'date' },
  { key: 'final_cost', label: 'FINAL COST', width: 100 },
]

const SEED_DATA: CRMProject[] = [
  {
    id: '1',
    client: 'VW',
    project_name: 'ID.4 Launch',
    music_type: 'Upbeat Indie',
    terms: 'WW 1yr',
    budget: '$75K',
    briefed: '2024-01-15',
    search_sent: '2024-01-18',
    who: 'Sarah',
    music_due: '2024-02-01',
    sent: '12',
    creative_selects: '2024-02-05',
    ballparks: '2024-02-08',
    client_approval: '2024-02-12',
    ship_date: '2024-02-20',
    vocal_consent: 'Received',
    musicology: 'Clear',
    ba_added: 'Yes',
    finished: '2024-02-22',
    final_cost: '$68K',
    notes: 'Client loved the indie rock direction. Fast turnaround.',
    stage: 'finished'
  },
  {
    id: '2',
    client: 'VW',
    project_name: 'Golf R Campaign',
    music_type: 'Electronic',
    terms: 'US 6mo',
    budget: '$50K',
    briefed: '2024-02-01',
    search_sent: '2024-02-03',
    who: 'Mike',
    music_due: '2024-02-15',
    sent: '8',
    creative_selects: '2024-02-18',
    ballparks: '',
    client_approval: '',
    ship_date: '2024-03-01',
    vocal_consent: '',
    musicology: '',
    ba_added: '',
    finished: '',
    final_cost: '',
    notes: 'Waiting on creative team feedback.',
    stage: 'creative_selects'
  },
  {
    id: '3',
    client: 'VW',
    project_name: 'Taos Summer',
    music_type: 'Feel-good Pop',
    terms: 'NA 1yr',
    budget: '$60K',
    briefed: '2024-02-10',
    search_sent: '',
    who: 'Sarah',
    music_due: '2024-02-28',
    sent: '',
    creative_selects: '',
    ballparks: '',
    client_approval: '',
    ship_date: '2024-03-15',
    vocal_consent: '',
    musicology: '',
    ba_added: '',
    finished: '',
    final_cost: '',
    notes: 'Need songs with summer vibes, driving imagery.',
    stage: 'briefed'
  },
  {
    id: '4',
    client: 'VW',
    project_name: 'Atlas Cross Sport',
    music_type: 'Cinematic',
    terms: 'WW 2yr',
    budget: '$120K',
    briefed: '2024-01-20',
    search_sent: '2024-01-25',
    who: 'Lisa',
    music_due: '2024-02-10',
    sent: '15',
    creative_selects: '2024-02-14',
    ballparks: '2024-02-18',
    client_approval: '2024-02-25',
    ship_date: '2024-03-05',
    vocal_consent: 'Pending',
    musicology: 'In Progress',
    ba_added: 'No',
    finished: '',
    final_cost: '',
    notes: 'Big budget campaign. Orchestral preferred.',
    stage: 'ship_ready'
  },
  {
    id: '5',
    client: 'VW',
    project_name: 'Jetta GLI Spot',
    music_type: 'Rock/Alternative',
    terms: 'US 1yr',
    budget: '$45K',
    briefed: '2024-02-05',
    search_sent: '2024-02-07',
    who: 'Mike',
    music_due: '2024-02-20',
    sent: '6',
    creative_selects: '',
    ballparks: '',
    client_approval: '',
    ship_date: '2024-03-10',
    vocal_consent: '',
    musicology: '',
    ba_added: '',
    finished: '',
    final_cost: '',
    notes: 'Targeting younger demographic.',
    stage: 'search_sent'
  },
  {
    id: '6',
    client: 'VW',
    project_name: 'Tiguan Family',
    music_type: 'Acoustic/Warm',
    terms: 'NA 1yr',
    budget: '$55K',
    briefed: '2024-01-28',
    search_sent: '2024-01-30',
    who: 'Sarah',
    music_due: '2024-02-12',
    sent: '10',
    creative_selects: '2024-02-16',
    ballparks: '2024-02-20',
    client_approval: '2024-02-28',
    ship_date: '',
    vocal_consent: 'Received',
    musicology: 'Clear',
    ba_added: 'Yes',
    finished: '',
    final_cost: '',
    notes: 'Family-focused campaign. Needs warm, emotional feel.',
    stage: 'client_approval'
  }
]

export function ProjectsCRM({ profile }: ProjectsCRMProps) {
  const [projects, setProjects] = useState<CRMProject[]>(SEED_DATA)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Partial<CRMProject> | null>(null)
  const [notesPanel, setNotesPanel] = useState<CRMProject | null>(null)
  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(null)
  const [draggedProject, setDraggedProject] = useState<CRMProject | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [mobileStageIndex, setMobileStageIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('supervisor_id', profile.id)

    if (data && data.length > 0) {
      const mappedProjects: CRMProject[] = data.map(p => ({
        id: p.id,
        client: p.client || '',
        project_name: p.name || '',
        music_type: '',
        terms: '',
        budget: p.budget ? `$${p.budget.toLocaleString()}` : '',
        briefed: '',
        search_sent: '',
        who: '',
        music_due: p.deadline || '',
        sent: '',
        creative_selects: '',
        ballparks: '',
        client_approval: '',
        ship_date: '',
        vocal_consent: '',
        musicology: '',
        ba_added: '',
        finished: '',
        final_cost: '',
        notes: '',
        stage: (p.status === 'completed' ? 'finished' : 'briefed') as CRMProject['stage']
      }))
      setProjects([...SEED_DATA, ...mappedProjects])
    }
    setLoading(false)
  }, [profile.id])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const updateProject = (id: string, key: string, value: string) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, [key]: value } : p
    ))
    setEditingCell(null)
  }

  const updateProjectStage = (id: string, stage: CRMProject['stage']) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, stage } : p
    ))
  }

  const addNewProject = () => {
    const newProject: CRMProject = {
      id: crypto.randomUUID(),
      client: editingProject?.client || '',
      project_name: editingProject?.project_name || '',
      music_type: editingProject?.music_type || '',
      terms: editingProject?.terms || '',
      budget: editingProject?.budget || '',
      briefed: new Date().toISOString().split('T')[0],
      search_sent: '',
      who: '',
      music_due: '',
      sent: '',
      creative_selects: '',
      ballparks: '',
      client_approval: '',
      ship_date: '',
      vocal_consent: '',
      musicology: '',
      ba_added: '',
      finished: '',
      final_cost: '',
      notes: editingProject?.notes || '',
      stage: 'briefed'
    }
    setProjects([newProject, ...projects])
    setShowForm(false)
    setEditingProject(null)
  }

  const exportCSV = () => {
    const headers = COLUMNS.map(c => c.label).join(',')
    const rows = projects.map(p =>
      COLUMNS.map(c => `"${(p[c.key as keyof CRMProject] || '').toString().replace(/"/g, '""')}"`).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'projects-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDragStart = (e: React.DragEvent, project: CRMProject) => {
    setDraggedProject(project)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, stage: CRMProject['stage']) => {
    e.preventDefault()
    if (draggedProject) {
      updateProjectStage(draggedProject.id, stage)
      setDraggedProject(null)
    }
  }

  const frozenWidth = COLUMNS.filter(c => c.frozen).reduce((sum, c) => sum + c.width, 0)

  const handleMobileSwipeStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleMobileSwipeMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current
    setSwipeOffset(diff)
  }

  const handleMobileSwipeEnd = () => {
    const threshold = 80
    if (swipeOffset > threshold && mobileStageIndex > 0) {
      setMobileStageIndex(mobileStageIndex - 1)
    } else if (swipeOffset < -threshold && mobileStageIndex < STAGES.length - 1) {
      setMobileStageIndex(mobileStageIndex + 1)
    }
    setSwipeOffset(0)
    touchStartX.current = 0
    touchCurrentX.current = 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div
      className="h-[calc(100vh-76px)] flex flex-col bg-[#0A0A0C]"
      style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 pb-4 border-b border-[#1A1A1E] gap-3">
        <PageTitle title="Projects CRM" sub="Track and manage your sync licensing projects" />
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="hidden md:flex bg-[#1A1A1E] rounded-lg p-1">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'table'
                  ? 'bg-[#C8A97E] text-[#0A0A0C]'
                  : 'text-[#888] hover:text-[#E8E8E8]'
              }`}
            >
              <Table className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'kanban'
                  ? 'bg-[#C8A97E] text-[#0A0A0C]'
                  : 'text-[#888] hover:text-[#E8E8E8]'
              }`}
            >
              <Columns3 className="w-4 h-4" />
              Kanban
            </button>
          </div>
          <Btn variant="ghost" onClick={exportCSV} className="hidden md:flex">
            <Download className="w-4 h-4" />
            Export
          </Btn>
          <Btn onClick={() => { setEditingProject({}); setShowForm(true) }} className="flex-1 md:flex-none touch-manipulation">
            <Plus className="w-4 h-4" />
            New Project
          </Btn>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#E8E8E8]">New Project</h3>
              <button onClick={() => { setShowForm(false); setEditingProject(null) }} className="text-[#666] hover:text-[#E8E8E8]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Client"
                value={editingProject?.client || ''}
                onChange={e => setEditingProject({ ...editingProject, client: e.target.value })}
                placeholder="Client name"
              />
              <Input
                label="Project Name"
                value={editingProject?.project_name || ''}
                onChange={e => setEditingProject({ ...editingProject, project_name: e.target.value })}
                placeholder="Project name"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Music Type"
                  value={editingProject?.music_type || ''}
                  onChange={e => setEditingProject({ ...editingProject, music_type: e.target.value })}
                  placeholder="e.g., Upbeat Indie"
                />
                <Input
                  label="Budget"
                  value={editingProject?.budget || ''}
                  onChange={e => setEditingProject({ ...editingProject, budget: e.target.value })}
                  placeholder="$0"
                />
              </div>
              <Input
                label="Terms"
                value={editingProject?.terms || ''}
                onChange={e => setEditingProject({ ...editingProject, terms: e.target.value })}
                placeholder="e.g., WW 1yr"
              />
              <Textarea
                label="Notes"
                value={editingProject?.notes || ''}
                onChange={e => setEditingProject({ ...editingProject, notes: e.target.value })}
                placeholder="Project notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditingProject(null) }}>
                Cancel
              </Btn>
              <Btn onClick={addNewProject}>Create Project</Btn>
            </div>
          </Card>
        </div>
      )}

      {view === 'table' ? (
        <div className="flex-1 overflow-hidden relative hidden md:block">
          <div
            ref={tableRef}
            className="h-full overflow-auto"
            onScroll={handleScroll}
          >
            <table className="w-max min-w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr>
                  {COLUMNS.map((col, idx) => (
                    <th
                      key={col.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider bg-[#0F0F12] border-b border-[#1A1A1E] ${
                        col.frozen
                          ? 'sticky z-30'
                          : ''
                      }`}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        left: col.frozen ? (idx === 0 ? 0 : COLUMNS[0].width) : undefined,
                        boxShadow: col.frozen && scrollLeft > 0 ? '2px 0 4px rgba(0,0,0,0.3)' : undefined
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider bg-[#0F0F12] border-b border-[#1A1A1E] w-20">
                    NOTES
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, rowIdx) => (
                  <tr
                    key={project.id}
                    className={`group hover:bg-[#1A1A1E]/50 ${rowIdx % 2 === 0 ? 'bg-[#0A0A0C]' : 'bg-[#0D0D10]'}`}
                  >
                    {COLUMNS.map((col, colIdx) => {
                      const isEditing = editingCell?.id === project.id && editingCell?.key === col.key
                      const value = project[col.key as keyof CRMProject] || ''

                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2 text-sm border-b border-[#1A1A1E]/50 ${
                            col.frozen
                              ? `sticky z-10 ${rowIdx % 2 === 0 ? 'bg-[#0A0A0C]' : 'bg-[#0D0D10]'} group-hover:bg-[#1A1A1E]/50`
                              : ''
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            left: col.frozen ? (colIdx === 0 ? 0 : COLUMNS[0].width) : undefined,
                            boxShadow: col.frozen && colIdx === 1 && scrollLeft > 0 ? '2px 0 4px rgba(0,0,0,0.3)' : undefined
                          }}
                          onClick={() => setEditingCell({ id: project.id, key: col.key })}
                        >
                          {isEditing ? (
                            <input
                              type={col.type === 'date' ? 'date' : 'text'}
                              value={value}
                              onChange={e => updateProject(project.id, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={e => e.key === 'Enter' && setEditingCell(null)}
                              autoFocus
                              className="w-full bg-[#1A1A1E] border border-[#C8A97E] rounded px-2 py-1 text-sm text-[#E8E8E8] outline-none"
                            />
                          ) : (
                            <span className={`${col.frozen ? 'text-[#E8E8E8] font-medium' : 'text-[#B0B0B0]'} cursor-text`}>
                              {value || <span className="text-[#444]">-</span>}
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-sm border-b border-[#1A1A1E]/50">
                      <button
                        onClick={() => setNotesPanel(project)}
                        className={`p-1.5 rounded hover:bg-[#C8A97E]/20 transition-colors ${
                          project.notes ? 'text-[#C8A97E]' : 'text-[#444]'
                        }`}
                      >
                        <StickyNote className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="absolute top-0 left-0 h-full pointer-events-none z-20"
            style={{
              width: frozenWidth,
              boxShadow: scrollLeft > 0 ? '4px 0 8px rgba(0,0,0,0.4)' : 'none'
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6 hidden md:block">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(stage => {
              const stageProjects = projects.filter(p => p.stage === stage.id)

              return (
                <div
                  key={stage.id}
                  className="w-72 flex-shrink-0 flex flex-col bg-[#0F0F12] rounded-xl overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, stage.id as CRMProject['stage'])}
                >
                  <div
                    className="px-4 py-3 border-b border-[#1A1A1E]"
                    style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#E8E8E8]">{stage.label}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                      >
                        {stageProjects.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageProjects.map(project => (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={e => handleDragStart(e, project)}
                        className="bg-[#1A1A1E] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-[#222226] transition-colors group"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-[#444] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-[#C8A97E] font-medium">{project.client}</span>
                            </div>
                            <h4 className="text-sm font-medium text-[#E8E8E8] truncate">{project.project_name}</h4>
                            {project.music_type && (
                              <p className="text-xs text-[#666] mt-1">{project.music_type}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-[#888]">
                              {project.budget && <span>{project.budget}</span>}
                              {project.who && <span>{project.who}</span>}
                            </div>
                            {project.music_due && (
                              <div className="mt-2 text-xs text-[#888]">
                                Due: {new Date(project.music_due).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-[#2A2A2E]">
                          <button
                            onClick={() => setNotesPanel(project)}
                            className={`p-1 rounded hover:bg-[#333] transition-colors ${
                              project.notes ? 'text-[#C8A97E]' : 'text-[#555]'
                            }`}
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                          </button>
                          {stage.id !== 'finished' && (
                            <button
                              onClick={() => {
                                const currentIdx = STAGES.findIndex(s => s.id === stage.id)
                                if (currentIdx < STAGES.length - 1) {
                                  updateProjectStage(project.id, STAGES[currentIdx + 1].id as CRMProject['stage'])
                                }
                              }}
                              className="text-xs text-[#888] hover:text-[#C8A97E] transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Advance
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageProjects.length === 0 && (
                      <div className="text-center py-8 text-[#444] text-sm">
                        No projects
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        <div className="flex items-center justify-center gap-1.5 py-3 border-b border-[#1A1A1E]">
          {STAGES.map((stage, index) => (
            <button
              key={stage.id}
              onClick={() => setMobileStageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all touch-manipulation ${
                index === mobileStageIndex ? 'w-6' : ''
              }`}
              style={{ backgroundColor: index === mobileStageIndex ? stage.color : '#333' }}
            />
          ))}
        </div>

        <div
          className="flex-1 overflow-hidden relative"
          onTouchStart={handleMobileSwipeStart}
          onTouchMove={handleMobileSwipeMove}
          onTouchEnd={handleMobileSwipeEnd}
        >
          <div
            className="flex h-full transition-transform"
            style={{
              width: `${STAGES.length * 100}%`,
              transform: `translateX(calc(-${mobileStageIndex * (100 / STAGES.length)}% + ${swipeOffset}px))`,
              transition: swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none'
            }}
          >
            {STAGES.map(stage => {
              const stageProjects = projects.filter(p => p.stage === stage.id)

              return (
                <div
                  key={stage.id}
                  className="h-full flex flex-col"
                  style={{ width: `${100 / STAGES.length}%` }}
                >
                  <div
                    className="px-4 py-3 border-b border-[#1A1A1E] flex-shrink-0"
                    style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#E8E8E8]">{stage.label}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                      >
                        {stageProjects.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {stageProjects.map(project => (
                      <div
                        key={project.id}
                        className="bg-[#1A1A1E] rounded-lg p-4 touch-manipulation"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-[#C8A97E] font-medium">{project.client}</span>
                        </div>
                        <h4 className="text-base font-medium text-[#E8E8E8]">{project.project_name}</h4>
                        {project.music_type && (
                          <p className="text-sm text-[#666] mt-1">{project.music_type}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-[#888]">
                          {project.budget && <span>{project.budget}</span>}
                          {project.who && <span>{project.who}</span>}
                        </div>
                        {project.music_due && (
                          <div className="mt-2 text-sm text-[#888]">
                            Due: {new Date(project.music_due).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#2A2A2E]">
                          <button
                            onClick={() => setNotesPanel(project)}
                            className={`p-2 rounded-lg transition-colors touch-manipulation ${
                              project.notes ? 'text-[#C8A97E] bg-[#C8A97E]/10' : 'text-[#555] bg-[#0F0F12]'
                            }`}
                            style={{ minWidth: '44px', minHeight: '44px' }}
                          >
                            <StickyNote className="w-5 h-5" />
                          </button>
                          {stage.id !== 'finished' && (
                            <button
                              onClick={() => {
                                const currentIdx = STAGES.findIndex(s => s.id === stage.id)
                                if (currentIdx < STAGES.length - 1) {
                                  updateProjectStage(project.id, STAGES[currentIdx + 1].id as CRMProject['stage'])
                                }
                              }}
                              className="flex-1 py-2.5 px-4 rounded-lg bg-[#C8A97E]/10 text-[#C8A97E] text-sm font-medium flex items-center justify-center gap-2 touch-manipulation"
                              style={{ minHeight: '44px' }}
                            >
                              <Check className="w-4 h-4" />
                              Advance to {STAGES[STAGES.findIndex(s => s.id === stage.id) + 1]?.label || 'Next'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageProjects.length === 0 && (
                      <div className="text-center py-12 text-[#444] text-sm">
                        No projects in this stage
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {notesPanel && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#0F0F12] md:border-l border-[#1A1A1E] shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-[#1A1A1E]">
            <div>
              <h3 className="font-medium text-[#E8E8E8]">{notesPanel.project_name}</h3>
              <p className="text-xs text-[#888]">{notesPanel.client}</p>
            </div>
            <button
              onClick={() => setNotesPanel(null)}
              className="text-[#666] hover:text-[#E8E8E8] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2">
              Project Notes
            </label>
            <textarea
              value={notesPanel.notes}
              onChange={e => {
                const newNotes = e.target.value
                setNotesPanel({ ...notesPanel, notes: newNotes })
                setProjects(projects.map(p =>
                  p.id === notesPanel.id ? { ...p, notes: newNotes } : p
                ))
              }}
              placeholder="Add notes about this project..."
              className="w-full h-64 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg p-3 text-sm text-[#E8E8E8] placeholder-[#444] resize-none outline-none focus:border-[#C8A97E]/50 transition-colors"
            />

            <div className="mt-6 space-y-4">
              <h4 className="text-xs font-medium text-[#888] uppercase tracking-wider">Quick Info</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1A1A1E] rounded-lg p-3">
                  <p className="text-xs text-[#666]">Budget</p>
                  <p className="text-sm text-[#E8E8E8] font-medium">{notesPanel.budget || '-'}</p>
                </div>
                <div className="bg-[#1A1A1E] rounded-lg p-3">
                  <p className="text-xs text-[#666]">Terms</p>
                  <p className="text-sm text-[#E8E8E8] font-medium">{notesPanel.terms || '-'}</p>
                </div>
                <div className="bg-[#1A1A1E] rounded-lg p-3">
                  <p className="text-xs text-[#666]">Music Type</p>
                  <p className="text-sm text-[#E8E8E8] font-medium">{notesPanel.music_type || '-'}</p>
                </div>
                <div className="bg-[#1A1A1E] rounded-lg p-3">
                  <p className="text-xs text-[#666]">Who</p>
                  <p className="text-sm text-[#E8E8E8] font-medium">{notesPanel.who || '-'}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-[#666] mb-2">Stage</p>
                <div className="relative">
                  <select
                    value={notesPanel.stage}
                    onChange={e => {
                      const newStage = e.target.value as CRMProject['stage']
                      setNotesPanel({ ...notesPanel, stage: newStage })
                      updateProjectStage(notesPanel.id, newStage)
                    }}
                    className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] outline-none focus:border-[#C8A97E]/50 appearance-none cursor-pointer"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Table className="w-12 h-12" />}
            title="No Projects Yet"
            description="Create your first project to start tracking your sync work"
            action={
              <Btn onClick={() => { setEditingProject({}); setShowForm(true) }}>
                <Plus className="w-4 h-4" /> Create Project
              </Btn>
            }
          />
        </div>
      )}
    </div>
  )
}
