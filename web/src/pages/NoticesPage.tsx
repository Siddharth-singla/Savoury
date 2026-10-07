import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotices, createNotice, deleteNotice } from '../api/notices';
import type { Notice } from '../api/notices';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2, Clock, X, Send, Users, ChefHat, Shield } from 'lucide-react';

/* ── Design tokens — warm light theme ── */
const C = {
  bg:          '#f5f0eb',
  surface:     '#ffffff',
  surface2:    '#f0ebe4',
  surface3:    '#e8e1d8',
  border:      'rgba(0,0,0,0.08)',
  borderFocus: 'rgba(45,27,14,0.3)',
  text:        '#1a120b',
  textMuted:   '#7a6855',
  textSub:     '#5c4a38',
  primary:     '#2d1b0e',
  accent:      '#7c3a1e',
  accentLight: 'rgba(124,58,30,0.1)',
  success:     '#3a6b3a',
  successLight:'rgba(58,107,58,0.1)',
  danger:      '#8b1a1a',
  dangerLight: 'rgba(139,26,26,0.08)',
};

/* ── Helpers ── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function roleLabel(role: string): string {
  switch (role) {
    case 'WARDEN_ADMIN': return 'Warden';
    case 'MESS_COMMITTEE': return 'Mess Committee';
    case 'SUPER_ADMIN': return 'Admin';
    case 'STUDENT': return 'Students';
    case 'COUNTER_STAFF': return 'Counter Staff';
    default: return role.replace(/_/g, ' ');
  }
}

function roleBadgeStyle(role: string): React.CSSProperties {
  switch (role) {
    case 'WARDEN_ADMIN': return { background: C.accentLight, color: C.accent };
    case 'MESS_COMMITTEE': return { background: C.successLight, color: C.success };
    default: return { background: 'rgba(0,0,0,0.05)', color: C.textMuted };
  }
}

const TARGET_OPTIONS = [
  { value: '', label: 'Everyone (Public)', icon: <Users size={14} /> },
  { value: 'STUDENT', label: 'Students Only', icon: <Users size={14} /> },
  { value: 'MESS_COMMITTEE', label: 'Mess Committee', icon: <ChefHat size={14} /> },
  { value: 'COUNTER_STAFF', label: 'Counter Staff', icon: <Shield size={14} /> },
];

/* ── Create Notice Modal ── */

function CreateNoticeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: createNotice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      onCreated();
    },
  });

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !mutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      title: title.trim(),
      body: body.trim(),
      targetRole: targetRole || null,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(26,18,11,0.45)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 520,
        background: C.surface, borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Megaphone size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Post a Notice</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: C.textMuted, padding: 6, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Title
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Menu Change Tomorrow"
              maxLength={200}
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                border: `1px solid ${C.border}`, borderRadius: 12,
                outline: 'none', background: C.surface2, color: C.text,
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = C.borderFocus}
              onBlur={e => e.target.style.borderColor = C.border as string}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write the details of your announcement here…"
              maxLength={5000}
              rows={5}
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                border: `1px solid ${C.border}`, borderRadius: 12,
                outline: 'none', background: C.surface2, color: C.text,
                fontFamily: 'Inter, sans-serif',
                resize: 'vertical', minHeight: 100,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = C.borderFocus}
              onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = C.border as string}
            />
          </div>

          {/* Target Audience */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Visible To
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TARGET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTargetRole(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${targetRole === opt.value ? C.primary : C.border}`,
                    background: targetRole === opt.value ? C.primary : 'transparent',
                    color: targetRole === opt.value ? '#fff' : C.textSub,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {mutation.isError && (
            <div style={{
              background: C.dangerLight, color: C.danger,
              padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            }}>
              Failed to post notice. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '16px 24px', borderTop: `1px solid ${C.border}`,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub,
            cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? C.primary : C.surface3,
              color: canSubmit ? '#fff' : C.textMuted,
              transition: 'all 0.15s',
            }}
          >
            <Send size={14} />
            {mutation.isPending ? 'Posting…' : 'Post Notice'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Notice Card ── */

function NoticeCard({ notice, canDelete, onDelete }: { notice: Notice; canDelete: boolean; onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRecent = Date.now() - new Date(notice.createdAt).getTime() < 3_600_000;
  const badge = roleBadgeStyle(notice.postedBy.role);

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: '20px 22px',
        transition: 'box-shadow 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
    >
      {/* Top Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 700,
          }}>
            {notice.postedBy.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{notice.postedBy.name}</div>
            <span style={{
              ...badge,
              display: 'inline-block', padding: '1px 8px', borderRadius: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
            }}>
              {roleLabel(notice.postedBy.role)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isRecent && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: C.accent, display: 'inline-block',
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textMuted, fontSize: 12 }}>
            <Clock size={12} />
            {timeAgo(notice.createdAt)}
          </div>
          {canDelete && (
            confirmDelete ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onDelete(notice.id)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11,
                  fontWeight: 700, background: C.danger, color: '#fff', cursor: 'pointer',
                }}>
                  Delete
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{
                  padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
                  fontSize: 11, fontWeight: 600, background: 'transparent', color: C.textSub, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete notice"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: C.textMuted, padding: 4, borderRadius: 6,
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = C.danger)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
              >
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 6px', lineHeight: 1.4 }}>
        {notice.title}
      </h3>
      <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
        {notice.body}
      </p>

      {/* Target Badge */}
      {notice.targetRole && (
        <div style={{
          display: 'inline-block', marginTop: 12,
          padding: '4px 12px', borderRadius: 8,
          background: 'rgba(0,0,0,0.04)', border: `1px solid ${C.border}`,
          fontSize: 11, color: C.textMuted, fontWeight: 600,
        }}>
          Visible to: {roleLabel(notice.targetRole)}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */

export default function NoticesPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notices'],
    queryFn: () => fetchNotices(undefined, 50),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });

  const notices = data?.notices ?? [];
  const canCreate = user?.role === 'MESS_COMMITTEE' || user?.role === 'WARDEN_ADMIN';
  const canDeleteAny = user?.role === 'WARDEN_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div style={{ padding: '28px 36px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Megaphone size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Notices</h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '2px 0 0', fontWeight: 500 }}>
              {notices.length} announcement{notices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: C.primary, color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(45,27,14,0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,27,14,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(45,27,14,0.25)';
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Post Notice
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: C.textMuted, fontSize: 14, fontWeight: 500,
        }}>
          Loading notices…
        </div>
      )}

      {/* Error */}
      {isError && (
        <div style={{
          background: C.dangerLight, color: C.danger,
          padding: '14px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500,
          marginBottom: 20,
        }}>
          Failed to load notices. Please check your connection and try again.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && notices.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: C.surface, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Megaphone size={32} color={C.textMuted} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>No notices yet</h3>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 320 }}>
            {canCreate
              ? 'Post your first announcement to keep students informed about mess updates.'
              : 'Announcements from your mess administration will appear here.'}
          </p>
        </div>
      )}

      {/* Notices List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {notices.map(notice => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            canDelete={canDeleteAny || notice.postedBy.id === user?.id}
            onDelete={id => deleteMutation.mutate(id)}
          />
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateNoticeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
