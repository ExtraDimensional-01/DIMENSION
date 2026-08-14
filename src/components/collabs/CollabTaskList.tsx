"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { CollabParticipant, CollabTask } from "@/types";
import { cn } from "@/lib/utils";

export function CollabTaskList({ projectId, participants }: { projectId: string; participants: CollabParticipant[] }) {
  const [tasks, setTasks] = useState<CollabTask[] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch(`/api/collab-projects/${projectId}/tasks`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function addTask() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/collab-projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), dueDate: dueDate || null, assigneeId: assigneeId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => [...(prev ?? []), data.task]);
        setTitle("");
        setDueDate("");
        setAssigneeId("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleDone(task: CollabTask) {
    const res = await fetch(`/api/collab-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? data.task : t)));
    }
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/collab-tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => (prev ?? []).filter((t) => t.id !== taskId));
    }
  }

  if (!tasks) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="input flex-1 py-2 text-sm"
        />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input py-2 text-sm sm:w-40" />
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input py-2 text-sm sm:w-40">
          <option value="">Unassigned</option>
          {participants.map((p) => (
            <option key={p.user.id} value={p.user.id}>
              {p.user.producerName}
            </option>
          ))}
        </select>
        <button
          onClick={addTask}
          disabled={adding || !title.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
          aria-label="Add task"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-2">No tasks yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 bg-surface px-4 py-3">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleDone(task)}
                className="h-4 w-4 shrink-0 accent-accent"
              />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm", task.done ? "text-muted-2 line-through" : "text-foreground")}>
                  {task.title}
                </p>
                <p className="text-[11px] text-muted-2">
                  {task.assignee ? task.assignee.producerName : "Unassigned"}
                  {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="shrink-0 text-muted-2 hover:text-danger"
                aria-label="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
