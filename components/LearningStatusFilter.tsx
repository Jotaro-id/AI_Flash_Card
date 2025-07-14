import React from 'react';
import { LearningStatus } from '@/types';
import { Check } from 'lucide-react';

interface LearningStatusFilterProps {
  selectedStatuses: LearningStatus[];
  onStatusToggle: (status: LearningStatus) => void;
  getStatusCount: (status: LearningStatus) => number;
  disabled?: boolean;
}

const statusConfig: { status: LearningStatus; label: string; color: string }[] = [
  { status: 'not_started', label: '未学習', color: 'text-gray-600' },
  { status: 'learned', label: '覚えた', color: 'text-green-600' },
  { status: 'uncertain', label: '怪しい', color: 'text-yellow-600' },
  { status: 'forgot', label: '覚えていない', color: 'text-red-600' },
];

export const LearningStatusFilter: React.FC<LearningStatusFilterProps> = ({
  selectedStatuses,
  onStatusToggle,
  getStatusCount,
  disabled = false,
}) => {
  const isSelected = (status: LearningStatus) => selectedStatuses.includes(status);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">どの単語を学習しますか？</h3>
      <div className="space-y-2">
        {statusConfig.map(({ status, label, color }) => (
          <button
            key={status}
            onClick={() => onStatusToggle(status)}
            disabled={disabled}
            className={`
              w-full flex items-center gap-3 p-3 rounded-md
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
              ${isSelected(status) ? 'bg-white/20' : 'bg-white/5'}
            `}
          >
            <div
              className={`
                w-5 h-5 rounded border-2 border-white/50
                flex items-center justify-center
                transition-all duration-200
                ${isSelected(status) ? 'bg-white/90' : 'bg-transparent'}
              `}
            >
              {isSelected(status) && <Check size={14} className="text-gray-800" />}
            </div>
            <span className={`text-white font-medium ${color}`}>{label}</span>
            <span className="text-white/60 text-sm ml-auto">
              {getStatusCount(status)}単語
            </span>
          </button>
        ))}
      </div>
      {selectedStatuses.length === 0 && (
        <p className="text-yellow-400 text-sm mt-3">
          ⚠️ 少なくとも1つの学習状況を選択してください
        </p>
      )}
    </div>
  );
};