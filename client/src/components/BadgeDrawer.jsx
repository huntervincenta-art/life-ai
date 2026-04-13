import { X, Receipt, ListChecks, Trophy, Scissors, PiggyBank, Wallet, MessageCircle, Flame, Target, Lock } from 'lucide-react';
import { format } from 'date-fns';

const ICON_MAP = {
  'receipt': Receipt,
  'list-checks': ListChecks,
  'trophy': Trophy,
  'scissors': Scissors,
  'piggy-bank': PiggyBank,
  'wallet': Wallet,
  'message-circle': MessageCircle,
  'flame': Flame,
  'target': Target,
};

function BadgeIcon({ icon, earned }) {
  const Icon = ICON_MAP[icon] || Trophy;
  return (
    <div className={`badge-icon-wrap ${earned ? 'earned' : 'locked'}`}>
      {earned ? <Icon size={20} /> : <Lock size={16} />}
    </div>
  );
}

export default function BadgeDrawer({ progress, onClose }) {
  if (!progress) return null;

  const earnedIds = new Set(progress.badges.map(b => b.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Badges</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="badge-grid">
          {progress.allBadges.map(def => {
            const earned = progress.badges.find(b => b.id === def.id);
            return (
              <div key={def.id} className={`badge-card ${earned ? 'badge-earned' : 'badge-locked'}`}>
                <BadgeIcon icon={def.icon} earned={!!earned} />
                <div className="badge-card-name">{def.name}</div>
                <div className="badge-card-desc">{def.description}</div>
                {earned && (
                  <div className="badge-card-date">{format(new Date(earned.earnedAt), 'MMM d')}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
