import { useEffect } from 'react';
import { Award, Trophy } from 'lucide-react';

export default function NewBadgeToast({ badge, levelUp, onDismiss, onTap }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="badge-toast" onClick={onTap}>
      <div className="badge-toast-icon">
        {levelUp ? <Award size={20} /> : <Trophy size={20} />}
      </div>
      <div className="badge-toast-content">
        <div className="badge-toast-title">
          {levelUp ? `Level up! You're now Level ${levelUp}` : badge?.name}
        </div>
        {badge && !levelUp && (
          <div className="badge-toast-desc">{badge.description}</div>
        )}
      </div>
    </div>
  );
}
