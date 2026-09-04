import { CalendarDays, CheckSquare, Repeat2, StickyNote, Link2 } from 'lucide-react';
import type { Section } from '@/lib/domain';
export const icons = { schedule: CalendarDays, todos: CheckSquare, routines: Repeat2, memos: StickyNote, bookmarks: Link2 };
export function SectionIcon({ section, size = 20 }: { section: Section; size?: number }) { const Icon = icons[section]; return <Icon size={size} aria-hidden="true" />; }
