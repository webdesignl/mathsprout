/** The Parent sections, shared by the side panel on the Parent page and the menu in the header. */
export function useParentSections() {
  const unseenTasks = useState<number>('unseen-tasks', () => 0)
  const unseenCompletions = useState<number>('unseen-completions', () => 0)
  const pendingIdeas = useState<number>('pending-ideas', () => 0)
  const backlogCount = useState<number>('backlog-count', () => 0)
  const historyUnseen = useState<number>('history-unseen', () => 0)

  const sections = computed(() => [
    { id: 'plan', label: 'Prioritise tasks', badge: unseenTasks.value + unseenCompletions.value, needsChild: true },
    { id: 'add', label: 'Usual tasks', badge: 0, needsChild: true },
    { id: 'backlog', label: 'Backlog', badge: backlogCount.value, needsChild: true },
    { id: 'history', label: 'History', badge: historyUnseen.value, needsChild: false },
    { id: 'progress', label: 'Progress', badge: 0, needsChild: false },
    { id: 'ideas', label: 'Real-life examples', badge: pendingIdeas.value, needsChild: false },
    { id: 'family', label: 'Family account', badge: 0, needsChild: false },
  ])

  return { sections }
}
