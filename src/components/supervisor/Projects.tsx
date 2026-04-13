import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Calendar, DollarSign, MoreHorizontal, X, Clock } from 'lucide-react'
import { StatCard, Card, Btn, Input, Select, Spinner } from '../shared/UI'
import { PROJECT_STATUSES } from '../../lib/constants'
import type { Profile, Project } from '../../lib/types'

interface ProjectsProps {
  profile: Profile
}

interface ProjectWithDetails extends Project {
  music_type?: string
  owner_id?: string
  stage?: string
}

const STATUS_COLORS: Record<string, string> = {
  'Briefed': '#7B9CFF',
  'Search Sent': '#FF9B4D',
  'Creative Selects': '#FF6B9D',
  'Client Approval': '#B44DFF',
  'Ship Ready': '#4DFFB4',
  'Finished': '#C8A97E'
}

export function Projects({ profile }: ProjectsProps) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [draggedProject, setDraggedProject] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null)

  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    budget: '',
    deadline: '',
    music_type: 'Song'
  })

  useEffect(() => {
    loadProjects()
  }, [profile.id])

  const loadProjects = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setProjects(data)
      setLoading(false)
      return
    }

    const vwSeed = [
      { name: 'VW ID. Buzz Social Teaser', client: 'Volkswagen', budget: 15000, deadline: '2026-04-15', stage: 'Briefed' },
      { name: 'VW Tiguan TV Spot', client: 'Volkswagen', budget: 32000, deadline: '2026-04-22', stage: 'Search Sent' },
      { name: 'VW EV Launch Film', client: 'Volkswagen', budget: 48000, deadline: '2026-05-02', stage: 'Creative Selects' }
    ]

    const { data: seededData } = await supabase
      .from('projects')
      .insert(
        vwSeed.map(project => ({
          ...project,
          owner_id: userId,
          supervisor_id: userId,
          status: project.stage === 'Finished' ? 'completed' : 'active',
          music_type: project.stage
        }))
      )
      .select('*')

    if (seededData) {
      setProjects(seededData)
    } else {
      setProjects([])
    }
    setLoading(false)
  }

  const createProject = async () => {
    if (!newProject.name.trim()) return
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? profile.id
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: newProject.name,
        client: newProject.client,
        budget: newProject.budget ? parseFloat(newProject.budget) : null,
        deadline: newProject.deadline || null,
        owner_id: userId,
        supervisor_id: userId,
        status: 'active',
        stage: 'Briefed',
        music_type: 'Briefed'
      })
      .select()
      .single()

    if (!error && data) {
      setProjects([data, ...projects])
      setNewProject({ name: '', client: '', budget: '', deadline: '', music_type: 'Song' })
      setShowNewProject(false)
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    const statusMap: Record<string, string> = {
      'Briefed': 'active',
      'Search Sent': 'active',
      'Creative Selects': 'active',
      'Client Approval': 'active',
      'Ship Ready': 'active',
      'Finished': 'completed'
    }
    await supabase.from('projects').update({ status: statusMap[newStatus], stage: newStatus, music_type: newStatus }).eq('id', projectId)
    setProjects(projects.map(p => p.id === projectId ? { ...p, status: statusMap[newStatus] as Project['status'], stage: newStatus, music_type: newStatus } : p))
  }

  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverStatus(status)
  }

  const handleDrop = async (status: string) => {
    if (draggedProject) {
      await updateProjectStatus(draggedProject, status)
    }
    setDraggedProject(null)
    setDragOverStatus(null)
  }

  const getProjectsByStatus = (status: string) => {
    return projects.filter(p => p.stage === status || p.music_type === status || (!p.stage && !p.music_type && status === 'Briefed'))
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const stats = {
    active: projects.filter(p => p.status === 'active').length,
    pipeline: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    licensed: projects.filter(p => p.status === 'completed').length
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#1A1A1E]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl text-[#E8E8E8]">My Projects</h1>
          <Btn onClick={() => setShowNewProject(true)}>
            <Plus className="w-4 h-4" /> New Project
          </Btn>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Active Projects" value={stats.active} icon={<Clock className="w-4 h-4" />} />
          <StatCard label="Pipeline Value" value={`$${stats.pipeline.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
          <StatCard label="Licensed" value={stats.licensed} />
          <StatCard label="Avg Deal" value={stats.licensed > 0 ? `$${Math.round(stats.pipeline / Math.max(stats.licensed, 1)).toLocaleString()}` : '$0'} />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max h-full">
          {PROJECT_STATUSES.map(status => {
            const statusProjects = getProjectsByStatus(status)
            const isOver = dragOverStatus === status
            const color = STATUS_COLORS[status]

            return (
              <div
                key={status}
                className={`w-[280px] flex flex-col bg-[#0D0D10] rounded-xl border transition-colors ${isOver ? 'border-[#C8A97E]' : 'border-[#1A1A1E]'}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={() => handleDrop(status)}
              >
                <div className="p-3 border-b border-[#1A1A1E]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-[#E8E8E8]">{status}</span>
                    <span className="text-xs text-[#666] ml-auto">{statusProjects.length}</span>
                  </div>
                </div>

                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {statusProjects.map(project => {
                    const days = project.deadline ? getDaysUntilDeadline(project.deadline) : null

                    return (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={() => handleDragStart(project.id)}
                        onDragEnd={() => { setDraggedProject(null); setDragOverStatus(null) }}
                        onClick={() => setSelectedProject(project)}
                        className={`p-3 bg-[#13131A] border border-[#1E1E22] rounded-lg cursor-grab active:cursor-grabbing hover:border-[#2A2A2E] transition-all ${draggedProject === project.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            {project.client && <p className="text-xs text-[#C8A97E] mb-0.5">{project.client}</p>}
                            <p className="text-sm font-medium text-[#E8E8E8]">{project.name}</p>
                          </div>
                          <button className="p-1 text-[#666] hover:text-[#E8E8E8]">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {project.budget && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[#4DFFB4]/10 text-[#4DFFB4]">
                              ${project.budget.toLocaleString()}
                            </span>
                          )}
                          {days !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                              days < 0 ? 'bg-[#FF4D4D]/10 text-[#FF4D4D]' :
                              days <= 3 ? 'bg-[#FFD700]/10 text-[#FFD700]' :
                              'bg-[#666]/10 text-[#888]'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {statusProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-xs text-[#555]">Drop projects here</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewProject(false)} />
          <Card className="relative w-full max-w-md p-6">
            <button onClick={() => setShowNewProject(false)} className="absolute top-4 right-4 text-[#666] hover:text-[#E8E8E8]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl text-[#E8E8E8] mb-6">New Project</h2>
            <div className="space-y-4">
              <Input
                label="Project Name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Q4 Campaign"
                required
              />
              <Input
                label="Client"
                value={newProject.client}
                onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                placeholder="Volkswagen"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Budget"
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  placeholder="25000"
                />
                <Input
                  label="Deadline"
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                />
              </div>
              <Select
                label="Music Type"
                value={newProject.music_type}
                onChange={(e) => setNewProject({ ...newProject, music_type: e.target.value })}
              >
                <option value="Song">Song</option>
                <option value="Score">Score</option>
                <option value="Library">Library</option>
              </Select>
              <Btn onClick={createProject} className="w-full">Create Project</Btn>
            </div>
          </Card>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
          <Card className="relative w-full max-w-lg p-6">
            <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 text-[#666] hover:text-[#E8E8E8]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl text-[#E8E8E8] mb-1">{selectedProject.name}</h2>
            {selectedProject.client && <p className="text-sm text-[#C8A97E] mb-4">{selectedProject.client}</p>}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0D0D10] rounded-lg p-3">
                <p className="text-xs text-[#666] mb-1">Budget</p>
                <p className="text-lg font-semibold text-[#E8E8E8]">{selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : '-'}</p>
              </div>
              <div className="bg-[#0D0D10] rounded-lg p-3">
                <p className="text-xs text-[#666] mb-1">Deadline</p>
                <p className="text-lg font-semibold text-[#E8E8E8]">{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : '-'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setSelectedProject(null)} className="flex-1">Close</Btn>
              <Btn variant="danger" onClick={async () => {
                await supabase.from('projects').delete().eq('id', selectedProject.id)
                setProjects(projects.filter(p => p.id !== selectedProject.id))
                setSelectedProject(null)
              }} className="flex-1">Delete</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
