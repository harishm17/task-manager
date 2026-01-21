import { useState, useRef, useEffect } from 'react';
import { useGroups } from '../contexts/GroupContext';

export function GroupSwitcher() {
  const { groups, activeGroup, loading, error, setActiveGroupId, createHouseholdGroup } =
    useGroups();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const label = activeGroup ? activeGroup.name : 'Select group';

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = groupName.trim();
    if (!trimmedName) return;
    setCreating(true);
    setCreateError(null);
    const result = await createHouseholdGroup(trimmedName);
    if (result.error) {
      setCreateError(result.error);
    } else {
      setGroupName('');
      setShowCreate(false);
      setOpen(false);
    }
    setCreating(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm"
        aria-expanded={open}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fog text-xs font-semibold text-slate-600">
          {activeGroup?.type === 'household' ? 'H' : 'P'}
        </span>
        {loading ? 'Loading...' : label}
        <span className="text-slate-400">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
          {error ? (
            <p className="px-3 py-2 text-xs text-rose-600">{error}</p>
          ) : null}
          {groups.length === 0 && !loading ? (
            <div className="px-3 py-2 text-xs text-slate-500">No groups yet.</div>
          ) : null}
          <ul className="space-y-1">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${activeGroup?.id === group.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="text-xs uppercase tracking-wide opacity-70">{group.type}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate((prev) => !prev)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              Create household group
            </button>
            {showCreate ? (
              <form className="mt-2 space-y-2" onSubmit={handleCreate}>
                <input
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
                  required
                />
                {createError ? <p className="text-xs text-rose-600">{createError}</p> : null}
                <button
                  type="submit"
                  disabled={creating || !groupName.trim()}
                  className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {creating ? 'Creating...' : 'Create group'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
