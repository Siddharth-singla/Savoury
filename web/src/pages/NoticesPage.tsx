import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotices, createNotice, deleteNotice } from '../api/notices';
import type { Notice } from '../api/notices';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2, Clock, X, Send, Users, ChefHat, Shield, CalendarDays, Eye } from 'lucide-react';

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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

function roleAccentColor(role: string): string {
  switch (role) {
    case 'WARDEN_ADMIN': return C.accent;
    case 'MESS_COMMITTEE': return C.success;
    default: return C.primary;
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
        position: 'relative', width: '100%', maxWidth: 560,
        background: C.surface, borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        margin: '0 16px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px', borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(135deg, ${C.surface2}, ${C.surface})`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(45,27,14,0.25)',
            }}>
              <Megaphone size={18} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: 17, fontWeight: 800, color: C.text, display: 'block' }}>Post a Notice</span>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>Share an announcement</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: C.surface2, border: 'none', cursor: 'pointer',
            color: C.textMuted, padding: 8, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.textMuted; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Title
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Menu Change Tomorrow"
              maxLength={200}
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14,
                border: `1.5px solid ${C.border}`, borderRadius: 12,
                outline: 'none', background: C.surface2, color: C.text,
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = C.borderFocus; e.target.style.boxShadow = '0 0 0 3px rgba(45,27,14,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = C.border as string; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write the details of your announcement here…"
              maxLength={5000}
              rows={5}
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14,
                border: `1.5px solid ${C.border}`, borderRadius: 12,
                outline: 'none', background: C.surface2, color: C.text,
                fontFamily: 'Inter, sans-serif',
                resize: 'vertical', minHeight: 110,
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = C.borderFocus; (e.target as HTMLTextAreaElement).style.boxShadow = '0 0 0 3px rgba(45,27,14,0.08)'; }}
              onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = C.border as string; (e.target as HTMLTextAreaElement).style.boxShadow = 'none'; }}
            />
          </div>

          {/* Target Audience */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Visible To
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TARGET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTargetRole(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
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
              padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            }}>
              Failed to post notice. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '18px 28px', borderTop: `1px solid ${C.border}`,
          background: C.surface2,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `1px solid ${C.border}`, background: C.surface, color: C.textSub,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.borderFocus}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border as string}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? C.primary : C.surface3,
              color: canSubmit ? '#fff' : C.textMuted,
              boxShadow: canSubmit ? '0 4px 14px rgba(45,27,14,0.25)' : 'none',
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
  const accentColor = roleAccentColor(notice.postedBy.role);

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        transition: 'box-shadow 0.25s, transform 0.25s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Accent side bar */}
      <div style={{
        width: 4, flexShrink: 0,
        background: isRecent
          ? `linear-gradient(to bottom, ${accentColor}, ${C.primary})`
          : C.surface3,
      }} />

      <div style={{ flex: 1, padding: '22px 26px' }}>
        {/* Top Row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${accentColor}, ${C.primary})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: `0 3px 10px ${accentColor}33`,
              flexShrink: 0,
            }}>
              {notice.postedBy.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{notice.postedBy.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{
                  ...badge,
                  display: 'inline-block', padding: '2px 10px', borderRadius: 6,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                }}>
                  {roleLabel(notice.postedBy.role)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.textMuted, fontSize: 11 }}>
                  <Clock size={11} />
                  {timeAgo(notice.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isRecent && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 20,
                background: C.accentLight, color: C.accent,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />
                NEW
              </span>
            )}
            {canDelete && (
              confirmDelete ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onDelete(notice.id)} style={{
                    padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 11,
                    fontWeight: 700, background: C.danger, color: '#fff', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{
                    padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
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
                    background: C.surface2, border: 'none', cursor: 'pointer',
                    color: C.textMuted, padding: 7, borderRadius: 8,
                    display: 'flex', alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerLight; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = C.surface2; }}
                >
                  <Trash2 size={14} />
                </button>
              )
            )}
          </div>
        </div>

        {/* Content */}
        <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 8px', lineHeight: 1.4 }}>
          {notice.title}
        </h3>
        <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
          {notice.body}
        </p>

        {/* Footer meta row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginTop: 16,
          paddingTop: 14, borderTop: `1px solid ${C.border}`,
          flexWrap: 'wrap',
        }}>
          {/* Full date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textMuted, fontSize: 12 }}>
            <CalendarDays size={13} />
            {formatDate(notice.createdAt)}
          </div>

          {/* Target Badge */}
          {notice.targetRole && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 8,
              background: C.surface2, border: `1px solid ${C.border}`,
              fontSize: 11, color: C.textMuted, fontWeight: 600,
            }}>
              <Eye size={12} />
              Visible to: {roleLabel(notice.targetRole)}
            </div>
          )}
        </div>
      </div>
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* ── Page Header ── */}
      <div style={{
        padding: '32px 44px 28px',
        background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.bg} 100%)`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(45,27,14,0.25)',
            }}>
              <Megaphone size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>
                Notices & Announcements
              </h1>
              <p style={{ fontSize: 14, color: C.textMuted, margin: '4px 0 0', fontWeight: 500 }}>
                {notices.length} announcement{notices.length !== 1 ? 's' : ''} · Auto-refreshes every 30s
              </p>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 14,
                background: C.primary, color: '#fff', border: 'none',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(45,27,14,0.28)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,27,14,0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,27,14,0.28)';
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              Post Notice
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: '32px 44px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

          {/* Loading */}
          {isLoading && (
            <div style={{
              textAlign: 'center', padding: '80px 0',
              color: C.textMuted, fontSize: 14, fontWeight: 500,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: C.surface, border: `1px solid ${C.border}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12, animation: 'pulse 1.5s infinite',
              }}>
                <Megaphone size={18} color={C.textMuted} />
              </div>
              <div>Loading notices…</div>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div style={{
              background: C.dangerLight, color: C.danger,
              padding: '16px 22px', borderRadius: 14, fontSize: 14, fontWeight: 500,
              marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10,
              border: `1px solid rgba(139,26,26,0.12)`,
            }}>
              <span style={{ fontSize: 18 }}>⚠</span>
              Failed to load notices. Please check your connection and try again.
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && notices.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '100px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 88, height: 88, borderRadius: 24,
                background: C.surface, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}>
                <Megaphone size={38} color={C.textMuted} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>No notices yet</h3>
              <p style={{ fontSize: 15, color: C.textMuted, margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
                {canCreate
                  ? 'Post your first announcement to keep students informed about mess updates and important notices.'
                  : 'Announcements from your mess administration will appear here.'}
              </p>
              {canCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 12, marginTop: 4,
                    background: C.primary, color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(45,27,14,0.25)',
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Post Your First Notice
                </button>
              )}
            </div>
          )}

          {/* Notices Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
            gap: 18,
          }}>
            {notices.map(notice => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                canDelete={canDeleteAny || notice.postedBy.id === user?.id}
                onDelete={id => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
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
